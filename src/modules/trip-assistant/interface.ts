import type { PlacesProvider, PlaceSearchInput } from '../places'
import type { UUID } from '../_shared/model'
import type { SuggestionDraft, SuggestionDraftStore, SuggestionModel } from './model'

export interface SuggestPlacesInput {
  tripId: UUID
  stopId: UUID
  query: string
  preferences?: string
  placeSearch?: Omit<PlaceSearchInput, 'tripId' | 'stopId' | 'query'>
  stopName?: string
  countryCode?: string
  timeZone?: string
}

export interface TripAssistant { suggestPlaces(input: SuggestPlacesInput): Promise<SuggestionDraft[]> }
export type TripAssistantModule = TripAssistant

export interface TripAssistantOptions {
  timeoutMs?: number
  maxCandidates?: number
  maxSuggestions?: number
  usageLimit?: { consume(tripId: UUID): boolean }
  now?: () => string
  id?: () => UUID
}

export interface TripAssistantDependencies {
  placesProvider: PlacesProvider
  model: SuggestionModel
  draftStore: SuggestionDraftStore
}
