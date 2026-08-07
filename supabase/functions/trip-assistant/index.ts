import { requireTripMember } from '../_shared/auth.ts'

type Row = Record<string, unknown>
type Candidate = { id: string; provider: 'geoapify' | 'manual'; name: string; category?: string; address?: string; countryCode?: string; coordinates: { latitude: number; longitude: number } }
type RequestInput = { tripId: string; stopId: string; query: string; preferences?: string }

const MAX_CANDIDATES = 50
const MAX_SUGGESTIONS = 5
const TIMEOUT_MS = 10_000

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const text = (value: unknown, max: number): string | undefined => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : undefined
const record = (value: unknown): Row | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : undefined

function parseRequest(value: unknown): RequestInput {
  const request = record(value)
  const tripId = request?.tripId
  const stopId = request?.stopId
  const query = text(request?.query, 160)
  if (!isUuid(tripId) || !isUuid(stopId) || !query || query.length < 2) throw new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 })
  const preferences = request?.preferences === undefined ? undefined : text(request.preferences, 1000)
  if (request?.preferences !== undefined && !preferences) throw new Response(JSON.stringify({ error: 'invalid_preferences' }), { status: 400 })
  return { tripId, stopId, query, preferences }
}

function mapCandidate(row: Row): Candidate | null {
  const id = row.id
  const provider = row.provider
  const name = row.name
  const latitude = row.latitude
  const longitude = row.longitude
  if (!isUuid(id) || (provider !== 'geoapify' && provider !== 'manual') || typeof name !== 'string' || typeof latitude !== 'number' || typeof longitude !== 'number') return null
  return { id, provider, name, category: typeof row.kind === 'string' ? row.kind : undefined, address: typeof row.address === 'string' ? row.address : undefined, countryCode: typeof row.country_code === 'string' ? row.country_code : undefined, coordinates: { latitude, longitude } }
}

function schemaOutput(value: unknown, candidates: Candidate[]): { candidateId: string; title: string; reason: string }[] {
  const root = record(value)
  const suggestions = root?.suggestions
  if (!Array.isArray(suggestions) || suggestions.length > MAX_SUGGESTIONS) throw new Error('invalid_structured_output')
  const candidateIds = new Set(candidates.map((candidate) => candidate.id))
  const seen = new Set<string>()
  return suggestions.map((item) => {
    const suggestion = record(item)
    const candidateId = suggestion?.candidateId
    const title = text(suggestion?.title, 500)
    const reason = text(suggestion?.reason, 500)
    if (!isUuid(candidateId) || !candidateIds.has(candidateId) || seen.has(candidateId) || !title || !reason) throw new Error('invalid_structured_output')
    seen.add(candidateId)
    return { candidateId, title, reason }
  })
}

function extractOutputText(value: unknown): string {
  const response = record(value)
  const output = response?.output
  if (!Array.isArray(output)) throw new Error('invalid_provider_response')
  for (const item of output) {
    const message = record(item)
    const content = message?.content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      const textValue = record(part)?.text
      if (typeof textValue === 'string') return textValue
    }
  }
  throw new Error('invalid_provider_response')
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const input = parseRequest(await request.json())
    const authenticated = await requireTripMember(request, input.tripId)
    const quota = await authenticated.client.rpc('consume_trip_assistant_quota', { target_account: authenticated.user.id })
    if (quota.error) return json({ error: 'assistant_quota_unavailable' }, 503)
    if (quota.data !== true) return json({ error: 'suggestions_quota_reached' }, 429)

    const [tripResult, stopResult, placesResult] = await Promise.all([
      authenticated.client.from('trips').select('name,reference_currency').eq('id', input.tripId).single(),
      authenticated.client.from('stops').select('name,country_code,timezone,local_start,local_end').eq('id', input.stopId).eq('trip_id', input.tripId).single(),
      authenticated.client.from('places').select('id,provider,name,kind,address,country_code,latitude,longitude').eq('trip_id', input.tripId).eq('stop_id', input.stopId).order('created_at', { ascending: false }),
    ])
    if (tripResult.error || !tripResult.data || stopResult.error || !stopResult.data) return json({ error: 'trip_context_not_found' }, 404)
    if (placesResult.error) return json({ error: 'places_lookup_failed' }, 503)
    const candidates = (Array.isArray(placesResult.data) ? placesResult.data : []).map((row) => mapCandidate(row as Row)).filter((row): row is Candidate => row !== null).slice(0, MAX_CANDIDATES)
    if (candidates.length === 0) return json({ drafts: [] })

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return json({ error: 'assistant_provider_unavailable' }, 503)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: Deno.env.get('OPENAI_SUGGESTIONS_MODEL') ?? 'gpt-5.6-terra',
          store: false,
          max_output_tokens: 900,
          reasoning: { effort: 'low' },
          input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ task: 'recommend places from the supplied candidates only', trip: tripResult.data, stop: stopResult.data, preferences: input.preferences, query: input.query, candidates }) }] }],
          text: { format: { type: 'json_schema', name: 'trip_suggestions', strict: true, schema: { type: 'object', properties: { suggestions: { type: 'array', maxItems: MAX_SUGGESTIONS, items: { type: 'object', properties: { candidateId: { type: 'string' }, title: { type: 'string' }, reason: { type: 'string' } }, required: ['candidateId', 'title', 'reason'], additionalProperties: false } } }, required: ['suggestions'], additionalProperties: false } } },
        }),
      })
    } finally { clearTimeout(timeout) }
    if (response.status === 429) return json({ error: 'assistant_quota_reached' }, 429)
    if (!response.ok) return json({ error: 'assistant_provider_failed' }, 503)
    const providerResponse = await response.json()
    const suggestions = schemaOutput(JSON.parse(extractOutputText(providerResponse)), candidates)
    const createdAt = new Date().toISOString()
    const drafts = suggestions.map((suggestion) => ({ id: crypto.randomUUID(), trip_id: input.tripId, stop_id: input.stopId, candidate_id: suggestion.candidateId, title: suggestion.title, reason: suggestion.reason, created_by: authenticated.user.id, created_at: createdAt }))
    if (drafts.length > 0) {
      const saved = await authenticated.client.from('trip_suggestion_drafts').insert(drafts)
      if (saved.error) return json({ error: 'suggestions_persistence_failed' }, 503)
    }
    return json({ drafts: suggestions.map((suggestion, index) => ({ id: drafts[index]?.id ?? crypto.randomUUID(), tripId: input.tripId, stopId: input.stopId, ...suggestion, createdAt })) })
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof DOMException && error.name === 'AbortError') return json({ error: 'assistant_timeout' }, 408)
    if (error instanceof SyntaxError || error instanceof Error && error.message === 'invalid_structured_output') return json({ error: 'assistant_invalid_output' }, 502)
    return json({ error: 'assistant_failed' }, 500)
  }
})
