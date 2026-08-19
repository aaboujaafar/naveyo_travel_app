import { requireTripMember } from '../_shared/auth.ts'
import { completeChat } from '../_shared/ai.ts'
import { discoverDayPlaces, type DiscoveredPlace } from '../_shared/day-place-discovery.ts'
import { enrichDayPlaces } from '../_shared/day-place-enrichment.ts'
import { collectUsedPlaceHistory } from '../_shared/day-plan-history.ts'
import { excludePreviouslyUsedPlaces } from '../_shared/day-place-exclusions.ts'
import { validateDaySchedule, type VerifiedDayItem } from '../_shared/day-schedule-validation.ts'

type Row = Record<string, unknown>
type Candidate = DiscoveredPlace
type Mobility = 'walking' | 'motorized'
type Theme = 'romantic' | 'beach' | 'food' | 'culture' | 'nature' | 'shopping' | 'family' | 'nightlife' | 'mixed'
type Budget = 'free' | 'economy' | 'moderate' | 'premium'
type Pace = 'relaxed' | 'balanced' | 'full'
type IndoorOutdoor = 'indoor' | 'outdoor' | 'either'
type DayPreferences = {
  mobility: Mobility
  radiusMeters: number
  themes: Theme[]
  budget: Budget
  pace: Pace
  constraints?: {
    accessibility?: boolean
    children?: boolean
    indoorOutdoor?: IndoorOutdoor
    dietary?: string[]
    startTime?: string
    endTime?: string
  }
}
type RequestInput = { tripId: string; stopId: string; date: string; preferences: DayPreferences; weather?: unknown[]; existingItinerary?: unknown[]; candidates?: ClientCandidate[] }
type ClientCandidate = {
  id: string
  provider?: string
  name: string
  category?: string
  address?: string
  countryCode?: string
  coordinates: { latitude: number; longitude: number }
  providerPlaceId?: string
  attribution?: string
  distanceMeters?: number
}
type DayItem = {
  candidateId: string
  title: string
  reason: string
  localTime: string
  durationMinutes: number
}

const MAX_CANDIDATES = 100
const MAX_ITEMS = 8
const TIMEOUT_MS = 45_000

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
const isTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const isDuration = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 15 && value <= 480
const text = (value: unknown, max: number): string | undefined => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : undefined
const record = (value: unknown): Row | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : undefined
const oneOf = <T extends string>(value: unknown, values: readonly T[]): value is T => typeof value === 'string' && values.includes(value as T)
const safeString = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 && normalized.length <= max && !/[\u0000-\u001f\u007f]/.test(normalized) ? normalized : undefined
}

const MOBILITIES = ['walking', 'motorized'] as const
const THEMES = ['romantic', 'beach', 'food', 'culture', 'nature', 'shopping', 'family', 'nightlife', 'mixed'] as const
const BUDGETS = ['free', 'economy', 'moderate', 'premium'] as const
const PACES = ['relaxed', 'balanced', 'full'] as const
const INDOOR_OUTDOOR = ['indoor', 'outdoor', 'either'] as const

function invalidPreferences(): never {
  throw new Response(JSON.stringify({ error: 'invalid_preferences' }), { status: 400 })
}

function parsePreferences(value: unknown): DayPreferences {
  if (value === undefined) return { mobility: 'walking', radiusMeters: 5_000, themes: ['mixed'], budget: 'moderate', pace: 'balanced' }
  const input = record(value)
  if (!input) return invalidPreferences()

  const mobility = input.mobility === undefined ? 'walking' : input.mobility
  if (!oneOf(mobility, MOBILITIES)) return invalidPreferences()

  const radiusMeters = input.radiusMeters === undefined
    ? mobility === 'walking' ? 5_000 : 10_000
    : input.radiusMeters
  if (typeof radiusMeters !== 'number' || !Number.isInteger(radiusMeters) || radiusMeters < 1_000 || radiusMeters > 20_000) return invalidPreferences()

  const themes = input.themes === undefined ? ['mixed'] : input.themes
  if (!Array.isArray(themes) || themes.length === 0 || themes.length > 5 || themes.some((theme) => !oneOf(theme, THEMES)) || new Set(themes).size !== themes.length || themes.includes('mixed') && themes.length > 1) return invalidPreferences()

  const budget = input.budget === undefined ? 'moderate' : input.budget
  if (!oneOf(budget, BUDGETS)) return invalidPreferences()
  const pace = input.pace === undefined ? 'balanced' : input.pace
  if (!oneOf(pace, PACES)) return invalidPreferences()

  let constraints: DayPreferences['constraints']
  if (input.constraints !== undefined) {
    const rawConstraints = record(input.constraints)
    if (!rawConstraints) return invalidPreferences()
    if (rawConstraints.accessibility !== undefined && typeof rawConstraints.accessibility !== 'boolean') return invalidPreferences()
    if (rawConstraints.children !== undefined && typeof rawConstraints.children !== 'boolean') return invalidPreferences()
    if (rawConstraints.indoorOutdoor !== undefined && !oneOf(rawConstraints.indoorOutdoor, INDOOR_OUTDOOR)) return invalidPreferences()

    let dietary: string[] | undefined
    if (rawConstraints.dietary !== undefined) {
      if (!Array.isArray(rawConstraints.dietary) || rawConstraints.dietary.length > 8) return invalidPreferences()
      const parsedDietary = rawConstraints.dietary.map((item) => safeString(item, 80))
      if (parsedDietary.some((item): item is undefined => item === undefined)) return invalidPreferences()
      dietary = parsedDietary as string[]
      if (new Set(dietary).size !== dietary.length) return invalidPreferences()
    }

    const startTime = rawConstraints.startTime
    const endTime = rawConstraints.endTime
    if (startTime !== undefined && !isTime(startTime)) return invalidPreferences()
    if (endTime !== undefined && !isTime(endTime)) return invalidPreferences()
    if (startTime !== undefined && endTime !== undefined && startTime >= endTime) return invalidPreferences()

    constraints = {
      ...(rawConstraints.accessibility === undefined ? {} : { accessibility: rawConstraints.accessibility }),
      ...(rawConstraints.children === undefined ? {} : { children: rawConstraints.children }),
      ...(rawConstraints.indoorOutdoor === undefined ? {} : { indoorOutdoor: rawConstraints.indoorOutdoor }),
      ...(dietary === undefined ? {} : { dietary }),
      ...(startTime === undefined ? {} : { startTime }),
      ...(endTime === undefined ? {} : { endTime }),
    }
  }

  return {
    mobility,
    radiusMeters,
    themes: [...themes] as Theme[],
    budget,
    pace,
    ...(constraints === undefined ? {} : { constraints }),
  }
}

function parseRequest(value: unknown): RequestInput {
  const input = record(value)
  if (!isUuid(input?.tripId) || !isUuid(input?.stopId) || !isDate(input?.date)) throw new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 })
  const preferences = parsePreferences(input?.preferences)
  const weather = input?.weather === undefined ? undefined : Array.isArray(input.weather) && input.weather.length <= 14 ? input.weather : undefined
  const existingItinerary = input?.existingItinerary === undefined ? undefined : Array.isArray(input.existingItinerary) && input.existingItinerary.length <= 500 ? input.existingItinerary : undefined
  if (input?.weather !== undefined && !weather || input?.existingItinerary !== undefined && !existingItinerary) throw new Response(JSON.stringify({ error: 'invalid_context' }), { status: 400 })
  const candidates = input?.candidates === undefined ? undefined : parseCandidates(input.candidates)
  return { tripId: input.tripId, stopId: input.stopId, date: input.date, preferences, weather, existingItinerary, candidates }
}

function parseCandidates(value: unknown): Candidate[] {
  if (!Array.isArray(value) || value.length > MAX_CANDIDATES) throw new Response(JSON.stringify({ error: 'invalid_candidates' }), { status: 400 })
  return value.map((entry) => {
    const candidate = record(entry)
    const mapped = candidate ? mapClientCandidate(candidate) : null
    if (!mapped) throw new Response(JSON.stringify({ error: 'invalid_candidates' }), { status: 400 })
    return mapped
  })
}

function coordinates(value: unknown): { latitude: number; longitude: number } | undefined {
  const input = record(value)
  const latitude = input?.latitude
  const longitude = input?.longitude
  if (
    typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) return undefined
  return { latitude, longitude }
}

function mapClientCandidate(row: Row): Candidate | null {
  const id = row.id
  const name = text(row.name, 500)
  const point = coordinates(row.coordinates)
  const provider = row.provider === 'google' || row.provider === 'geoapify' ? row.provider : 'geoapify'
  const providerPlaceId = text(row.providerPlaceId, 300) ?? text(row.provider_place_id, 300) ?? (isUuid(id) ? id : undefined)
  const attribution = text(row.attribution, 500) ?? 'Existing Places search result'
  if (!isUuid(id) || !name || !point || !providerPlaceId) return null
  const distanceMeters = typeof row.distanceMeters === 'number' && Number.isFinite(row.distanceMeters) && row.distanceMeters >= 0
    ? row.distanceMeters
    : undefined
  return {
    id,
    provider,
    providerPlaceId,
    name,
    category: text(row.category, 100) ?? text(row.kind, 100),
    address: text(row.address, 500),
    countryCode: text(row.countryCode, 2) ?? text(row.country_code, 2),
    coordinates: point,
    attribution,
    ...(distanceMeters === undefined ? {} : { distanceMeters }),
  }
}

function mapCandidate(row: Row): Candidate | null {
  const id = row.id
  const name = text(row.name, 500)
  const point = coordinates({ latitude: row.latitude, longitude: row.longitude })
  if (!isUuid(id) || !name || !point) return null
  return {
    id,
    provider: row.provider === 'google' ? 'google' : 'geoapify',
    providerPlaceId: text(row.provider_place_id, 300) ?? id,
    name,
    category: text(row.kind, 100),
    address: text(row.address, 500),
    countryCode: text(row.country_code, 2),
    coordinates: point,
    attribution: text(row.attribution, 500) ?? 'Stored Places result',
  }
}

function draft(input: RequestInput, candidates: Candidate[], items: VerifiedDayItem[], createdAt: string): Record<string, unknown> {
  return {
    id: crypto.randomUUID(),
    tripId: input.tripId,
    stopId: input.stopId,
    date: input.date,
    items,
    candidates,
    createdAt,
  }
}

function discoveryError(error: unknown): 'places_provider_unavailable' | 'places_provider_failed' {
  return error instanceof Error && error.message === 'places_provider_unavailable'
    ? 'places_provider_unavailable'
    : 'places_provider_failed'
}

function extractOutputText(value: unknown): string {
  const response = record(value)
  const choices = response?.choices
  if (!Array.isArray(choices)) throw new Error('invalid_provider_response')
  const content = record(record(choices[0])?.message)?.content
  if (typeof content === 'string' && content.trim()) return content
  if (Array.isArray(content)) {
    const output = content.map((part) => {
      const item = record(part)
      return typeof item?.text === 'string' ? item.text : ''
    }).join('')
    if (output.trim()) return output
  }
  throw new Error('invalid_provider_response')
}

function parseJsonOutput(value: string): unknown {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try { return JSON.parse(cleaned) } catch { /* Try a complete JSON object embedded in provider text. */ }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { /* Fall through to stable provider error. */ }
  }
  throw new Error('invalid_structured_output')
}

function parseItems(value: unknown, candidates: Candidate[]): DayItem[] {
  const items = record(value)?.items
  if (!Array.isArray(items) || items.length > MAX_ITEMS) throw new Error('invalid_structured_output')
  const candidateIds = new Set(candidates.map((candidate) => candidate.id))
  const seenCandidates = new Set<string>()
  const seenTimes = new Set<string>()
  const parsed = items.map((value) => {
    const item = record(value)
    const candidateId = item?.candidateId
    const title = text(item?.title, 500)
    const reason = text(item?.reason, 1_000)
    const localTime = item?.localTime
    const durationMinutes = item?.durationMinutes
    if (!isUuid(candidateId) || !candidateIds.has(candidateId) || seenCandidates.has(candidateId) || !title || !reason || !isTime(localTime) || seenTimes.has(localTime) || !isDuration(durationMinutes)) throw new Error('invalid_structured_output')
    seenCandidates.add(candidateId)
    seenTimes.add(localTime)
    return { candidateId, title, reason, localTime, durationMinutes }
  })
  return parsed.sort((left, right) => left.localTime.localeCompare(right.localTime))
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const input = parseRequest(await request.json())
    const authenticated = await requireTripMember(request, input.tripId)

    const placesPromise = input.candidates === undefined
      ? authenticated.client.from('places').select('id,provider,provider_place_id,name,kind,address,country_code,latitude,longitude,attribution').eq('trip_id', input.tripId).eq('stop_id', input.stopId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null })
    const [tripResult, stopResult, placesResult, itineraryResult] = await Promise.all([
      authenticated.client.from('trips').select('name,reference_currency').eq('id', input.tripId).single(),
      authenticated.client.from('stops').select('name,country_code,timezone,local_start,local_end,latitude,longitude').eq('id', input.stopId).eq('trip_id', input.tripId).single(),
      placesPromise,
      authenticated.client.from('itinerary_items').select('title,local_date,local_time,timezone,item_type,place_id,place:places(id,provider,provider_place_id,name,latitude,longitude)').eq('trip_id', input.tripId).order('local_date', { ascending: true }).order('local_time', { ascending: true }),
    ])
    if (tripResult.error || !tripResult.data || stopResult.error || !stopResult.data) return json({ error: 'trip_context_not_found' }, 404)
    const stop = stopResult.data as Row
    const startDate = text(stop.local_start, 10)
    const endDate = text(stop.local_end, 10)
    if (!startDate || !endDate || input.date < startDate || input.date > endDate) return json({ error: 'date_outside_stop' }, 400)
    if (itineraryResult.error) return json({ error: 'day_history_lookup_failed' }, 503)
    const stopCoordinates = coordinates({ latitude: stop.latitude, longitude: stop.longitude })
    const fallbackCandidates = input.candidates?.map((candidate) => mapClientCandidate(candidate as unknown as Row)).filter((row): row is Candidate => row !== null).slice(0, MAX_CANDIDATES) ??
      (!placesResult.error && Array.isArray(placesResult.data) ? placesResult.data : []).map((row) => mapCandidate(row as Row)).filter((row): row is Candidate => row !== null).slice(0, MAX_CANDIDATES)
    let candidates: Candidate[] = []
    let discoveryFailure: 'places_provider_unavailable' | 'places_provider_failed' | undefined
    if (stopCoordinates) {
      try {
        const discovered = await discoverDayPlaces({
          center: stopCoordinates,
          countryCode: text(stop.country_code, 2),
          preferences: {
            radiusMeters: input.preferences.radiusMeters,
            themes: input.preferences.themes,
            budget: input.preferences.budget,
            constraints: input.preferences.constraints,
          },
          maxCandidates: MAX_CANDIDATES,
        })
        candidates = discovered.candidates.slice(0, MAX_CANDIDATES)
      } catch (error) {
        discoveryFailure = discoveryError(error)
      }
    } else {
      discoveryFailure = 'places_provider_unavailable'
    }
    if (candidates.length === 0) candidates = fallbackCandidates
    const databaseItinerary = Array.isArray(itineraryResult.data) ? itineraryResult.data : []
    const clientItinerary = input.existingItinerary ?? []
    const usedPlaceHistory = collectUsedPlaceHistory(databaseItinerary, clientItinerary)
    const hadCandidatesBeforeExclusion = candidates.length > 0
    candidates = excludePreviouslyUsedPlaces(candidates, usedPlaceHistory)
    const existingItinerary = databaseItinerary.filter((item) => record(item)?.local_date === input.date)
    const clientDayItinerary = clientItinerary.filter((item) => {
      const row = record(item)
      return row?.local_date === input.date || row?.date === input.date
    })
    const createdAt = new Date().toISOString()
    candidates = (await enrichDayPlaces(candidates.slice(0, 16))) as Candidate[]
    if (candidates.length === 0) {
      if (hadCandidatesBeforeExclusion) return json({ error: 'no_new_places_available' }, 409)
      return json({ error: discoveryFailure ?? 'places_provider_unavailable' }, 503)
    }

    const quota = await authenticated.client.rpc('consume_trip_assistant_quota', { target_account: authenticated.user.id })
    if (quota.error) return json({ error: 'assistant_quota_unavailable' }, 503)
    if (quota.data !== true) return json({ error: 'suggestions_quota_reached' }, 429)

    let response: Response
    try {
      response = await completeChat({
        timeoutMs: TIMEOUT_MS,
        messages: [
          { role: 'system', content: 'You compose one travel day using only the supplied enriched places. Never invent a place, opening hour, price, rating, or travel time. Use rating, price, and opening hours only when those fields are present; otherwise leave the detail unknown. Choose local times only where supplied opening hours confirm that the place is open. Optimize the geographic order of places using their coordinates and mobility, but never invent or state travel times. Use weather and confirmed itinerary items as constraints, and avoid duplicating confirmed items. Return only valid JSON with an items array of at most eight items. Each item must contain candidateId, title, reason, localTime (HH:MM), and durationMinutes (integer 15..480). Use unique candidate IDs and unique local times. Sort items by localTime. This is an unpersisted draft.' },
          { role: 'user', content: JSON.stringify({ task: 'compose a full day plan', date: input.date, stop: stopResult.data, preferences: input.preferences, weather: input.weather, existingItinerary: [...existingItinerary, ...clientDayItinerary].slice(0, 100), candidates }) },
        ],
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'ai_provider_unavailable') return json({ error: 'assistant_provider_unavailable' }, 503)
      throw error
    }
    if (response.status === 429) return json({ error: 'assistant_quota_reached' }, 429)
    if (!response.ok) return json({ error: 'assistant_provider_failed' }, 503)
    const proposedItems = parseItems(parseJsonOutput(extractOutputText(await response.json())), candidates)
    const validation = validateDaySchedule({
      date: input.date,
      items: proposedItems,
      candidates,
      mobility: input.preferences.mobility,
    })
    const items = validation.items
    if (proposedItems.length > 0 && items.length === 0) return json({ error: 'no_feasible_schedule' }, 422)
    return json({ draft: draft(input, candidates, items, createdAt), trip: tripResult.data, stop: stopResult.data })
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof DOMException && error.name === 'AbortError') return json({ error: 'assistant_timeout' }, 408)
    if (error instanceof SyntaxError || error instanceof Error && ['invalid_structured_output', 'invalid_provider_response'].includes(error.message)) return json({ error: 'assistant_invalid_output' }, 502)
    return json({ error: 'assistant_failed' }, 500)
  }
})
