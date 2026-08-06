import { describe, expect, it } from 'vitest'
import { FakePlacesProvider, type PlacesProvider } from '../places'
import { uuid } from '../_shared/fake'
import type { PlaceCandidate } from '../_shared/model'
import { InMemorySuggestionDraftStore, SuggestionInvalidOutputError, SuggestionTimeoutError, SuggestionUsageLimitError, TripAssistantService } from './index'

const tripId = uuid('10000000-0000-4000-8000-000000000001')
const stopId = uuid('20000000-0000-4000-8000-000000000001')
const candidate: PlaceCandidate = { id: uuid('30000000-0000-4000-8000-000000000001'), provider: 'geoapify', name: 'Museu do Oriente', coordinates: { latitude: 38.7, longitude: -9.16 }, countryCode: 'PT' }
const input = { tripId, stopId, query: 'Museu', stopName: 'Lisbon' }

const service = (output: unknown, provider: PlacesProvider = new FakePlacesProvider([candidate]), options: Record<string, unknown> = {}) => {
  const store = new InMemorySuggestionDraftStore()
  return { store, assistant: new TripAssistantService({ placesProvider: provider, model: { complete: async () => output }, draftStore: store }, { now: () => '2026-08-06T12:00:00.000Z', id: () => uuid('40000000-0000-4000-8000-000000000001'), ...options }) }
}

describe('TripAssistantService', () => {
  it('gets controlled candidates, validates the model output and stores drafts without itinerary access', async () => {
    const { assistant, store } = service({ suggestions: [{ candidateId: candidate.id, title: 'Musée recommandé', reason: 'Proche de votre Étape.' }] })
    const drafts = await assistant.suggestPlaces(input)
    expect(drafts[0]).toMatchObject({ tripId, stopId, candidateId: candidate.id, title: 'Musée recommandé' })
    expect(await store.list(tripId, stopId)).toHaveLength(1)
  })

  it('rejects an unknown candidate identifier', async () => {
    const { assistant } = service({ suggestions: [{ candidateId: uuid('30000000-0000-4000-8000-000000000099'), title: 'Inventé', reason: 'Inventé' }] })
    await expect(assistant.suggestPlaces(input)).rejects.toBeInstanceOf(SuggestionInvalidOutputError)
  })

  it('rejects malformed structured output', async () => {
    const { assistant } = service({ suggestions: [{ candidateId: candidate.id, title: '', reason: 'ok' }] })
    await expect(assistant.suggestPlaces(input)).rejects.toBeInstanceOf(SuggestionInvalidOutputError)
  })

  it('maps provider timeouts to a controlled error', async () => {
    const provider = { search: () => new Promise<PlaceCandidate[]>(() => undefined), getById: async () => null }
    const { assistant } = service({ suggestions: [] }, provider, { timeoutMs: 5 })
    await expect(assistant.suggestPlaces(input)).rejects.toBeInstanceOf(SuggestionTimeoutError)
  })

  it('refuses calls after the usage limit is exhausted', async () => {
    const { assistant } = service({ suggestions: [] }, undefined, { usageLimit: { consume: () => false } })
    await expect(assistant.suggestPlaces(input)).rejects.toBeInstanceOf(SuggestionUsageLimitError)
  })
})
