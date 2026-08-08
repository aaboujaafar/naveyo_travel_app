import { requireTripMember } from '../_shared/auth.ts'

type RecordValue = Record<string, unknown>

const MAX_TEXT_LENGTH = 20_000
const TIMEOUT_MS = 15_000
const ENDPOINT = 'https://opencode.ai/zen/go/v1/chat/completions'
const RESERVATION_TYPES = ['accommodation', 'flight', 'train', 'ferry', 'activity', 'other'] as const
const CONFIRMATION_FIELDS = ['type', 'title', 'provider', 'reference', 'start', 'end', 'venue', 'origin', 'destination']

const json = (body: RecordValue, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const record = (value: unknown): RecordValue | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : undefined
const stringValue = (value: unknown, max: number): string => typeof value === 'string' && value.trim().length <= max ? value.trim() : ''

function parseRequest(value: unknown): { tripId: string; extractedText: string } {
  const input = record(value)
  const tripId = stringValue(input?.tripId, 80)
  const extractedText = stringValue(input?.extractedText, MAX_TEXT_LENGTH)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tripId) || extractedText.length === 0) {
    throw new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 })
  }
  return { tripId, extractedText }
}

function schemaOutput(value: unknown): RecordValue {
  const root = record(value)
  const type = stringValue(root?.type, 32).toLowerCase()
  const title = stringValue(root?.title, 200)
  const provider = stringValue(root?.provider, 200)
  const reference = stringValue(root?.reference, 120)
  const startLocal = stringValue(root?.startLocal, 40)
  const startTimeZone = stringValue(root?.startTimeZone, 80)
  const endLocal = stringValue(root?.endLocal, 40)
  const endTimeZone = stringValue(root?.endTimeZone, 80)
  const venue = stringValue(root?.venue, 500)
  const origin = stringValue(root?.origin, 300)
  const destination = stringValue(root?.destination, 300)
  if (!RESERVATION_TYPES.includes(type as typeof RESERVATION_TYPES[number])) throw new Error('invalid_structured_output')

  const draft: RecordValue = { type, confidence: 'high', fieldsRequiringConfirmation: CONFIRMATION_FIELDS }
  if (title) draft.title = title
  if (provider) draft.provider = provider
  if (reference) draft.reference = reference
  if (startLocal && startTimeZone) draft.start = { local: startLocal, timeZone: startTimeZone }
  if (endLocal && endTimeZone) draft.end = { local: endLocal, timeZone: endTimeZone }
  if (venue) draft.venue = { kind: 'venue', label: venue }
  if (origin) draft.origin = { kind: 'origin', label: origin }
  if (destination) draft.destination = { kind: 'destination', label: destination }
  return draft
}

function outputText(value: unknown): string {
  const response = record(value)
  const choices = response?.choices
  if (!Array.isArray(choices)) throw new Error('invalid_provider_response')
  const message = record(choices[0])?.message
  const content = record(message)?.content
  if (typeof content === 'string') return content
  throw new Error('invalid_provider_response')
}

function parseJsonOutput(value: string): unknown {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(cleaned) } catch { throw new Error('invalid_structured_output') }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const input = parseRequest(await request.json())
    await requireTripMember(request, input.tripId)
    const apiKey = Deno.env.get('OPENCODE_GO_API_KEY')
    if (!apiKey) return json({ error: 'document_provider_unavailable' }, 503)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: Deno.env.get('OPENCODE_DOCUMENT_MODEL') ?? 'deepseek-v4-pro',
          messages: [
            { role: 'system', content: 'Extract travel reservation data. Never invent values. Return empty strings for missing fields. The result is only a draft requiring human confirmation. Return only one valid JSON object with exactly these keys: type, title, provider, reference, startLocal, startTimeZone, endLocal, endTimeZone, venue, origin, destination. The type must be accommodation, flight, train, ferry, activity, or other.' },
            { role: 'user', content: input.extractedText },
          ],
        }),
      })
    } finally { clearTimeout(timeout) }
    if (response.status === 429) return json({ error: 'document_provider_quota_reached' }, 429)
    if (!response.ok) return json({ error: 'document_provider_failed' }, 503)
    const draft = schemaOutput(parseJsonOutput(outputText(await response.json())))
    return json({ draft })
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof DOMException && error.name === 'AbortError') return json({ error: 'document_provider_timeout' }, 408)
    if (error instanceof SyntaxError || error instanceof Error && ['invalid_structured_output', 'invalid_provider_response'].includes(error.message)) return json({ error: 'document_invalid_output' }, 502)
    return json({ error: 'document_analysis_failed' }, 500)
  }
})
