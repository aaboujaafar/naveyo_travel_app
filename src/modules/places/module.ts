import type { Coordinates, PlaceCandidate, UUID } from '../_shared/model'
import { assertStableId, parseCoordinates } from '../_shared/validation'
import type { ManualPlaceInput, PlaceSearchInput, PlacesModule, PlacesProvider } from './interface'

const manualId = (name: string, coordinates: Coordinates): UUID => {
  const input = `${name.trim().toLowerCase()}|${coordinates.latitude.toFixed(6)}|${coordinates.longitude.toFixed(6)}`
  let hash = 2166136261
  for (const character of input) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return assertStableId(`${hex}-0000-4000-8000-000000000000`)
}

export class Places implements PlacesModule {
  constructor(private readonly provider: PlacesProvider) {}

  search(input: PlaceSearchInput): Promise<PlaceCandidate[]> {
    const query = input.query.trim()
    if (query.length < 2 && !input.near) return Promise.resolve([])
    return this.provider.search({ ...input, query })
  }

  getById(id: UUID, tripId?: UUID): Promise<PlaceCandidate | null> {
    return this.provider.getById(id, tripId)
  }

  createManual(input: ManualPlaceInput): PlaceCandidate {
    const name = input.name.trim()
    if (name.length < 1 || name.length > 160) throw new Error('Manual place name must contain 1 to 160 characters')
    const coordinates = parseCoordinates(input.coordinates)
    return {
      id: manualId(name, coordinates),
      provider: 'manual',
      name,
      category: input.category?.trim() || undefined,
      address: input.address?.trim() || undefined,
      countryCode: input.countryCode?.trim().toUpperCase() || undefined,
      coordinates,
    }
  }
}
