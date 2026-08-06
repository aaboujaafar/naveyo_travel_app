import type { PlaceCandidate, UUID } from '../_shared/model'

export interface SuggestionDraft {
  id: UUID
  tripId: UUID
  stopId: UUID
  candidateId: UUID
  reason: string
  title: string
  createdAt: string
}

export interface SuggestionModelInput {
  tripId: UUID
  stopId: UUID
  tripName?: string
  stopName?: string
  countryCode?: string
  timeZone?: string
  preferences?: string
  candidates: PlaceCandidate[]
}

export interface SuggestionModel {
  complete(input: SuggestionModelInput): Promise<unknown>
}

export interface SuggestionDraftStore {
  save(drafts: SuggestionDraft[]): Promise<void>
  list(tripId: UUID, stopId?: UUID): Promise<SuggestionDraft[]>
}
