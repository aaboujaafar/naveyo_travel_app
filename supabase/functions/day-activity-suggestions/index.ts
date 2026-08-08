import { requireTripMember } from '../_shared/auth.ts'

type Row = Record<string, unknown>
type Candidate = { id: string; name: string; category?: string; address?: string; countryCode?: string; coordinates: { latitude: number; longitude: number } }
type Period = 'morning' | 'afternoon' | 'evening' | 'full-day'
type RequestInput = {
  tripId: string
  stopId: string
  localDate: string
  period: Period
  timeWindow?: { start: string; end: string }
  preferences?: string
  constraints?: { indoorOnly?: boolean; maxDurationMinutes?: number; maxBudgetMinor?: number; maxWalkingMinutes?: number; mobility?: string; avoid?: string }
  location?: { latitude: number; longitude: number }
}

const MAX_CANDIDATES = 50
const MAX_SUGGESTIONS = 5
const TIMEOUT_MS = 45_000
const PERIODS = new Set<Period>(['morning', 'afternoon', 'evening', 'full-day'])
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const text = (value: unknown, max: number): string | undefined => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : undefined
const record = (value: unknown): Row | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : undefined
const time = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const number = (value: unknown, min: number, max: number): number | undefined => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : undefined
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function parseRequest(value: unknown): RequestInput {
  const input = record(value)
  if (!uuid(input?.tripId) || !uuid(input?.stopId) || !date(input?.localDate) || !PERIODS.has(input?.period as Period)) throw new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 })
  const rawWindow = input?.timeWindow === undefined ? undefined : record(input.timeWindow)
  const timeWindow = rawWindow === undefined ? undefined : rawWindow && time(rawWindow.start) && time(rawWindow.end) ? { start: rawWindow.start, end: rawWindow.end } : undefined
  if (input?.timeWindow !== undefined && !timeWindow) throw new Response(JSON.stringify({ error: 'invalid_time_window' }), { status: 400 })
  if (timeWindow && timeWindow.start >= timeWindow.end) throw new Response(JSON.stringify({ error: 'invalid_time_window' }), { status: 400 })
  const rawConstraints = input?.constraints === undefined ? undefined : record(input.constraints)
  const constraints = rawConstraints ? {
    indoorOnly: rawConstraints.indoorOnly === true,
    maxDurationMinutes: rawConstraints.maxDurationMinutes === undefined ? undefined : number(rawConstraints.maxDurationMinutes, 15, 1_440),
    maxBudgetMinor: rawConstraints.maxBudgetMinor === undefined ? undefined : number(rawConstraints.maxBudgetMinor, 0, 10_000_000),
    maxWalkingMinutes: rawConstraints.maxWalkingMinutes === undefined ? undefined : number(rawConstraints.maxWalkingMinutes, 0, 240),
    mobility: text(rawConstraints.mobility, 300),
    avoid: text(rawConstraints.avoid, 1_000),
  } : undefined
  if (rawConstraints && (rawConstraints.maxDurationMinutes !== undefined && constraints?.maxDurationMinutes === undefined || rawConstraints.maxBudgetMinor !== undefined && constraints?.maxBudgetMinor === undefined || rawConstraints.maxWalkingMinutes !== undefined && constraints?.maxWalkingMinutes === undefined)) throw new Response(JSON.stringify({ error: 'invalid_constraints' }), { status: 400 })
  const rawLocation = input?.location === undefined ? undefined : record(input.location)
  const location = rawLocation ? { latitude: number(rawLocation.latitude, -90, 90), longitude: number(rawLocation.longitude, -180, 180) } : undefined
  if (rawLocation && (location?.latitude === undefined || location.longitude === undefined)) throw new Response(JSON.stringify({ error: 'invalid_location' }), { status: 400 })
  return { tripId: input.tripId, stopId: input.stopId, localDate: input.localDate, period: input.period as Period, timeWindow, preferences: input.preferences === undefined ? undefined : text(input.preferences, 1_000), constraints, location: location as RequestInput['location'] }
}

function mapCandidate(row: Row): Candidate | null {
  const id = row.id
  const name = text(row.name, 200)
  const latitude = number(row.latitude, -90, 90)
  const longitude = number(row.longitude, -180, 180)
  if (!uuid(id) || !name || latitude === undefined || longitude === undefined) return null
  return { id, name, category: text(row.kind, 100), address: text(row.address, 500), countryCode: text(row.country_code, 2), coordinates: { latitude, longitude } }
}

function weatherSnapshot(value: unknown): Row | null {
  const root = record(value)
  const hourly = record(root?.hourly)
  if (!hourly || !Array.isArray(hourly.time)) return null
  const temperatures = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m.filter((item): item is number => typeof item === 'number') : []
  const rain = Array.isArray(hourly.precipitation_probability) ? hourly.precipitation_probability.filter((item): item is number => typeof item === 'number') : []
  const weatherCodes = Array.isArray(hourly.weather_code) ? hourly.weather_code.filter((item): item is number => typeof item === 'number') : []
  const wind = Array.isArray(hourly.wind_speed_10m) ? hourly.wind_speed_10m.filter((item): item is number => typeof item === 'number') : []
  if (temperatures.length === 0) return null
  return { timezone: text(root?.timezone, 80) ?? '', temperatureMin: Math.min(...temperatures), temperatureMax: Math.max(...temperatures), precipitationProbabilityMax: rain.length ? Math.max(...rain) : null, weatherCodes: [...new Set(weatherCodes)], windSpeedMax: wind.length ? Math.max(...wind) : null }
}

async function fetchWeather(input: RequestInput, timezone: string, location: RequestInput['location']): Promise<Row | null> {
  if (!location) return null
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(location.latitude))
  url.searchParams.set('longitude', String(location.longitude))
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m')
  url.searchParams.set('timezone', timezone)
  url.searchParams.set('start_date', input.localDate)
  url.searchParams.set('end_date', input.localDate)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null
    return weatherSnapshot(await response.json())
  } catch { return null } finally { clearTimeout(timeout) }
}

function parseJsonOutput(value: string): unknown {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(cleaned) } catch { throw new Error('invalid_structured_output') }
}

function extractOutputText(value: unknown): string {
  const root = record(value)
  const choices = root?.choices
  if (!Array.isArray(choices)) throw new Error('invalid_provider_response')
  const content = record(record(choices[0])?.message)?.content
  if (typeof content !== 'string') throw new Error('invalid_provider_response')
  return content
}

function parseSuggestions(value: unknown, candidates: Candidate[]): Row[] {
  const suggestions = record(value)?.suggestions
  if (!Array.isArray(suggestions) || suggestions.length > MAX_SUGGESTIONS) throw new Error('invalid_structured_output')
  const candidateIds = new Set(candidates.map((candidate) => candidate.id))
  const seen = new Set<string>()
  return suggestions.map((item) => {
    const suggestion = record(item)
    const candidateId = suggestion?.candidateId
    const title = text(suggestion?.title, 500)
    const reason = text(suggestion?.reason, 1_000)
    const idealStartLocal = suggestion?.idealStartLocal === '' ? '' : time(suggestion?.idealStartLocal) ? suggestion.idealStartLocal : undefined
    const durationMinutes = suggestion?.durationMinutes === '' ? '' : number(suggestion?.durationMinutes, 15, 1_440)
    const indoor = suggestion?.indoor === true || suggestion?.indoor === false ? suggestion.indoor : undefined
    if (!uuid(candidateId) || !candidateIds.has(candidateId) || seen.has(candidateId) || !title || !reason || idealStartLocal === undefined || durationMinutes === undefined || indoor === undefined) throw new Error('invalid_structured_output')
    seen.add(candidateId)
    return { candidateId, title, reason, idealStartLocal, durationMinutes, indoor }
  })
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const input = parseRequest(await request.json())
    const authenticated = await requireTripMember(request, input.tripId)
    const quota = await authenticated.client.rpc('consume_trip_assistant_quota', { target_account: authenticated.user.id })
    if (quota.error) return json({ error: 'assistant_quota_unavailable' }, 503)
    if (quota.data !== true) return json({ error: 'suggestions_quota_reached' }, 429)
    const [stopResult, placesResult, itineraryResult] = await Promise.all([
      authenticated.client.from('stops').select('name,country_code,timezone,local_start,local_end').eq('id', input.stopId).eq('trip_id', input.tripId).single(),
      authenticated.client.from('places').select('id,name,kind,address,country_code,latitude,longitude').eq('trip_id', input.tripId).eq('stop_id', input.stopId).order('created_at', { ascending: false }),
      authenticated.client.from('itinerary_items').select('title,local_time,timezone').eq('trip_id', input.tripId).eq('stop_id', input.stopId).eq('local_date', input.localDate).order('local_time', { ascending: true }),
    ])
    if (stopResult.error || !stopResult.data) return json({ error: 'stop_not_found' }, 404)
    const stop = stopResult.data as Row
    const startDate = text(stop.local_start, 10)
    const endDate = text(stop.local_end, 10)
    if (!startDate || !endDate || input.localDate < startDate || input.localDate > endDate) return json({ error: 'date_outside_stop' }, 400)
    if (placesResult.error) return json({ error: 'places_lookup_failed' }, 503)
    const candidates = (Array.isArray(placesResult.data) ? placesResult.data : []).map((row) => mapCandidate(row as Row)).filter((row): row is Candidate => row !== null).slice(0, MAX_CANDIDATES)
    if (candidates.length === 0) return json({ drafts: [], weather: null, message: 'No confirmed places are available for this stop' })
    const timezone = text(stop.timezone, 80) ?? 'UTC'
    const location = input.location ?? candidates[0]?.coordinates
    const weather = await fetchWeather(input, timezone, location)
    const apiKey = Deno.env.get('OPENCODE_GO_API_KEY')
    if (!apiKey) return json({ error: 'assistant_provider_unavailable' }, 503)
    const payload = { task: 'propose activities for one travel day using only supplied confirmed place candidates', date: input.localDate, period: input.period, timeWindow: input.timeWindow, stop: { name: stop.name, countryCode: stop.country_code, timezone }, weather, preferences: input.preferences, constraints: input.constraints, existingItinerary: itineraryResult.error ? [] : itineraryResult.data, candidates }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch('https://opencode.ai/zen/go/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: Deno.env.get('OPENCODE_ACTIVITY_MODEL') ?? 'deepseek-v4-pro',
          temperature: 0,
          messages: [
            { role: 'system', content: 'You plan travel activities. Use only supplied candidates. Never invent places, coordinates, opening hours, prices, travel times, or weather. Respect date, timezone, period, weather, existing itinerary, and constraints. Return only valid JSON with a suggestions array. Each item must contain candidateId, title, reason, idealStartLocal (HH:mm or empty string), durationMinutes (number or empty string), and indoor (boolean). Return at most 5 suggestions. Suggestions are drafts and never confirmed itinerary items.' },
            { role: 'user', content: JSON.stringify(payload) },
          ],
        }),
      })
    } finally { clearTimeout(timeout) }
    if (response.status === 429) return json({ error: 'assistant_quota_reached' }, 429)
    if (!response.ok) return json({ error: 'assistant_provider_failed' }, 503)
    const suggestions = parseSuggestions(parseJsonOutput(extractOutputText(await response.json())), candidates)
    const createdAt = new Date().toISOString()
    const drafts = suggestions.map((suggestion) => ({ id: crypto.randomUUID(), trip_id: input.tripId, stop_id: input.stopId, candidate_id: suggestion.candidateId, title: String(suggestion.title), reason: String(suggestion.reason), created_by: authenticated.user.id, created_at: createdAt }))
    if (drafts.length > 0) {
      const saved = await authenticated.client.from('trip_suggestion_drafts').insert(drafts)
      if (saved.error) return json({ error: 'suggestions_persistence_failed' }, 503)
    }
    return json({ drafts: suggestions.map((suggestion, index) => ({ id: drafts[index]?.id ?? crypto.randomUUID(), tripId: input.tripId, stopId: input.stopId, ...suggestion, createdAt })), weather, location })
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof DOMException && error.name === 'AbortError') return json({ error: 'assistant_timeout' }, 408)
    if (error instanceof SyntaxError || error instanceof Error && ['invalid_structured_output', 'invalid_provider_response'].includes(error.message)) return json({ error: 'assistant_invalid_output' }, 502)
    return json({ error: 'assistant_failed' }, 500)
  }
})
