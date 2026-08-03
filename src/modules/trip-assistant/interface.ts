import type { PlaceCandidate, SuggestionDraft, UUID } from '../_shared/model'
export interface SuggestPlacesInput { tripId: UUID; stopId: UUID; candidates: PlaceCandidate[]; preferences?: string }
export interface TripAssistant { suggestPlaces(input: SuggestPlacesInput): Promise<SuggestionDraft[]> }
export type TripAssistantModule = TripAssistant
