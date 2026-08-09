import { requireTripMember } from '../_shared/auth.ts'

type Row = Record<string, unknown>
type Candidate = { id: string; provider: 'geoapify' | 'manual'; name: string; category?: string; address?: string; countryCode?: string; coordinates: { latitude: number; longitude: number } }
type RequestInput = { tripId: string; stopId: string; query: string; preferences?: string }

const MAX_CANDIDATES = 50
const MAX_SUGGESTIONS = 5
const TIMEOUT_MS = 10_000
const OPENCODE_ENDPOINT = 'https://opencode.ai/zen/go/v1/chat/completions'

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
  const choices = response?.choices
  if (!Array.isArray(choices)) throw new Error('invalid_provider_response')
  const content = record(record(choices[0])?.message)?.content
  if (typeof content === 'string' && content.trim()) return content
  if (Array.isArray(content)) {
    const text = content.map((part) => {
      const item = record(part)
      return typeof item?.text === 'string' ? item.text : ''
    }).join('')
    if (text.trim()) return text
  }
  throw new Error('invalid_provider_response')
}

function parseJsonOutput(value: string): unknown {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try { return JSON.parse(cleaned) } catch { /* Try the first complete JSON object below. */ }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { /* Fall through to the stable provider error. */ }
  }
  throw new Error('invalid_structured_output')
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
    if (candidates.length === 0) return json({ drafts: [], trip: tripResult.data, stop: stopResult.data })

    const apiKey = Deno.env.get('OPENCODE_GO_API_KEY')
    if (!apiKey) return json({ error: 'assistant_provider_unavailable' }, 503)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(OPENCODE_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: Deno.env.get('OPENCODE_ACTIVITY_MODEL') ?? 'deepseek-v4-pro',
          temperature: 0,
          messages: [
            { role: 'system', content: 'You recommend travel places. Use only the supplied candidates. Never invent places, coordinates, prices, opening hours, or travel times. Return only valid JSON with a suggestions array. Each item must contain candidateId, title, and reason. Return at most five suggestions. Suggestions are drafts and never confirmed itinerary items.' },
            { role: 'user', content: JSON.stringify({ task: 'recommend places from the supplied candidates only', trip: tripResult.data, stop: stopResult.data, preferences: input.preferences, query: input.query, candidates }) },
          ],
        }),
      })
    } finally { clearTimeout(timeout) }
    if (response.status === 429) return json({ error: 'assistant_quota_reached' }, 429)
    if (!response.ok) return json({ error: 'assistant_provider_failed' }, 503)
    const providerResponse = await response.json()
    const suggestions = schemaOutput(parseJsonOutput(extractOutputText(providerResponse)), candidates)
    const createdAt = new Date().toISOString()
    const drafts = suggestions.map((suggestion) => ({ id: crypto.randomUUID(), trip_id: input.tripId, stop_id: input.stopId, candidate_id: suggestion.candidateId, title: suggestion.title, reason: suggestion.reason, created_by: authenticated.user.id, created_at: createdAt }))
    if (drafts.length > 0) {
      const saved = await authenticated.client.from('trip_suggestion_drafts').insert(drafts)
      if (saved.error) return json({ error: 'suggestions_persistence_failed' }, 503)
    }
    return json({ drafts: suggestions.map((suggestion, index) => ({ id: drafts[index]?.id ?? crypto.randomUUID(), tripId: input.tripId, stopId: input.stopId, ...suggestion, createdAt })), trip: tripResult.data, stop: stopResult.data })
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof DOMException && error.name === 'AbortError') return json({ error: 'assistant_timeout' }, 408)
    if (error instanceof SyntaxError || error instanceof Error && ['invalid_structured_output', 'invalid_provider_response'].includes(error.message)) return json({ error: 'assistant_invalid_output' }, 502)
    return json({ error: 'assistant_failed' }, 500)
  }
})
