import type { PlaceCandidate, UUID } from '../_shared/model'
export type PlaceType = 'venue' | 'airport' | 'port' | 'station' | 'accommodation' | 'restaurant'

export interface PlaceSearchInput {
  query: string
  countryCode?: string
  stopId?: UUID
  tripId?: UUID
  stopName?: string
  near?: { latitude: number; longitude: number; radiusMeters?: number }
  type?: PlaceType
}

export interface PlacesModule {
  search(input: PlaceSearchInput): Promise<PlaceCandidate[]>
  getById(id: UUID, tripId?: UUID): Promise<PlaceCandidate | null>
  createManual(input: ManualPlaceInput): PlaceCandidate
}

export interface PlacesProvider {
  search(input: PlaceSearchInput): Promise<PlaceCandidate[]>
  getById(id: UUID, tripId?: UUID): Promise<PlaceCandidate | null>
}

export interface ManualPlaceInput {
  name: string
  coordinates: { latitude: number; longitude: number }
  address?: string
  countryCode?: string
  category?: string
}
