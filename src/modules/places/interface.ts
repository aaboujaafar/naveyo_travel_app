import type { PlaceCandidate, UUID } from '../_shared/model'
export interface PlaceSearchInput { query: string; countryCode?: string; stopId?: UUID }
export interface PlacesModule { search(input: PlaceSearchInput): Promise<PlaceCandidate[]>; getById(id: UUID): Promise<PlaceCandidate | null> }
export interface PlacesProvider { search(input: PlaceSearchInput): Promise<PlaceCandidate[]>; getById(id: UUID): Promise<PlaceCandidate | null> }
