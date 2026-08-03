import type { PlaceCandidate, UUID } from '../../modules/_shared/model'
import { assertStableId, parseCoordinates } from '../../modules/_shared/validation'

export type GeoapifyFeature = {
  properties?: Record<string, unknown>
  geometry?: { coordinates?: unknown }
}

export type GeoapifyResponse = { features?: unknown }
export type NormalizedPlaceCandidate = PlaceCandidate & { attribution?: string; providerPlaceId?: string }

const text = (value: unknown): string | undefined => typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const stableId = (providerId: string): UUID => {
  let first = 2166136261
  let second = 2246822519
  for (const char of providerId) {
    first = Math.imul(first ^ char.charCodeAt(0), 16777619)
    second = Math.imul(second ^ char.charCodeAt(0), 3266489917)
  }
  return assertStableId(`${Math.abs(first).toString(16).padStart(8, '0')}-${Math.abs(second).toString(16).padStart(8, '0').slice(0, 4)}-5000-8000-000000000000`)
}

export function normalizeGeoapifyResponse(value: unknown): NormalizedPlaceCandidate[] {
  const features = value && typeof value === 'object' ? (value as GeoapifyResponse).features : undefined
  if (!Array.isArray(features)) throw new Error('Invalid Geoapify response')
  const result: NormalizedPlaceCandidate[] = []
  for (const feature of features as unknown[]) {
    if (!feature || typeof feature !== 'object') throw new Error('Invalid Geoapify feature')
    const item = feature as GeoapifyFeature
    const properties = item.properties
    const coordinates = item.geometry?.coordinates
    if (!properties || typeof properties !== 'object' || !Array.isArray(coordinates) || coordinates.length < 2) throw new Error('Invalid Geoapify place')
    const providerId = text(properties.place_id)
    const name = text(properties.name) ?? text(properties.formatted)
    const longitude = coordinates[0]
    const latitude = coordinates[1]
    if (!providerId || !name || typeof longitude !== 'number' || typeof latitude !== 'number') throw new Error('Incomplete Geoapify place')
    const category = Array.isArray(properties.categories) ? text(properties.categories[0]) : text(properties.category)
    result.push({
      id: stableId(providerId),
      provider: 'geoapify',
      name,
      category,
      address: text(properties.formatted),
      countryCode: text(properties.country_code)?.toUpperCase(),
      coordinates: parseCoordinates({ latitude, longitude }),
      attribution: text(properties.attribution) ?? text((properties.datasource as Record<string, unknown> | undefined)?.attribution),
      providerPlaceId: providerId,
    })
  }
  return result
}

export function geoapifyProviderId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > 512) throw new Error('Invalid provider place id')
  return value.trim()
}
