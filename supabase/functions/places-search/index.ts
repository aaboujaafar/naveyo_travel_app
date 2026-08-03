import { requireTripMember } from '../_shared/auth.ts'

type SearchRequest = {
  operation?: unknown
  query?: unknown
  countryCode?: unknown
  stopId?: unknown
  tripId?: unknown
  stopName?: unknown
  type?: unknown
  near?: unknown
  id?: unknown
}

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const text = (value: unknown): string | undefined => typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

function parseRequest(value: unknown): SearchRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 })
  const request = value as SearchRequest
  const operation = request.operation
  if (operation !== 'search' && operation !== 'getById') throw new Response(JSON.stringify({ error: 'invalid_operation' }), { status: 400 })
  if (operation === 'search') {
    if (typeof request.query !== 'string' || request.query.trim().length > 160) throw new Response(JSON.stringify({ error: 'invalid_query' }), { status: 400 })
    if (request.countryCode !== undefined && !/^[A-Za-z]{2}$/.test(String(request.countryCode))) throw new Response(JSON.stringify({ error: 'invalid_country' }), { status: 400 })
    if (request.type !== undefined && !['venue', 'airport', 'port', 'station', 'accommodation', 'restaurant'].includes(String(request.type))) throw new Response(JSON.stringify({ error: 'invalid_type' }), { status: 400 })
  } else if (!uuid(request.id)) {
    throw new Response(JSON.stringify({ error: 'invalid_place_id' }), { status: 400 })
  }
  if (request.tripId !== undefined && !uuid(request.tripId)) throw new Response(JSON.stringify({ error: 'invalid_trip_id' }), { status: 400 })
  if (request.stopId !== undefined && !uuid(request.stopId)) throw new Response(JSON.stringify({ error: 'invalid_stop_id' }), { status: 400 })
  return request
}

function typeCategory(type: string | undefined): string | undefined {
  if (type === 'airport') return 'airport'
  if (type === 'port') return 'commercial.port'
  if (type === 'station') return 'public_transport.train'
  if (type === 'accommodation') return 'accommodation.hotel'
  if (type === 'restaurant') return 'catering.restaurant'
  return undefined
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const input = parseRequest(await request.json())
    const tripId = text(input.tripId)
    if (!tripId) return json({ error: 'trip_required' }, 400)
    const { client } = await requireTripMember(request, tripId)
    const apiKey = Deno.env.get('GEOAPIFY_API_KEY')
    if (!apiKey) return json({ error: 'places_provider_unavailable' }, 503)

    let providerPlaceId: string | undefined
    if (input.operation === 'getById') {
      const { data, error } = await client.from('places').select('provider_place_id').eq('id', input.id).eq('trip_id', tripId).maybeSingle()
      if (error) return json({ error: 'places_lookup_failed' }, 503)
      providerPlaceId = text(data?.provider_place_id)
      if (!providerPlaceId) return json({ error: 'place_not_found' }, 404)
    }

    const url = new URL(input.operation === 'getById' ? 'https://api.geoapify.com/v2/place-details' : 'https://api.geoapify.com/v1/geocode/search')
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('limit', '10')
    if (providerPlaceId) url.searchParams.set('id', providerPlaceId)
    if (input.operation === 'search') {
      const query = String(input.query).trim()
      const stopName = text(input.stopName)
      url.searchParams.set('text', stopName && query.length < 3 ? `${query} ${stopName}` : query)
      const countryCode = text(input.countryCode)?.toLowerCase()
      if (countryCode) url.searchParams.set('filter', `countrycode:${countryCode}`)
      const categories = typeCategory(text(input.type))
      if (categories) url.searchParams.set('categories', categories)
      const near = input.near
      if (near && typeof near === 'object' && !Array.isArray(near)) {
        const item = near as Record<string, unknown>
        if (typeof item.latitude === 'number' && typeof item.longitude === 'number') {
          url.searchParams.set('bias', `proximity:${item.longitude},${item.latitude}`)
        }
      }
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 7_000)
    let response: Response
    try {
      response = await fetch(url, { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }
    if (response.status === 429) return json({ error: 'places_quota_reached' }, 429)
    if (!response.ok) return json({ error: 'places_provider_failed' }, response.status >= 500 ? 503 : 502)
    return new Response(await response.text(), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Places-Attribution': 'Geoapify' } })
  } catch (error) {
    if (error instanceof Response) return error
    if (error instanceof DOMException && error.name === 'AbortError') return json({ error: 'places_timeout' }, 408)
    return json({ error: 'places_search_failed' }, 500)
  }
})
