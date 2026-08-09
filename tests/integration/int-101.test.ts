import { describe, expect, it, vi } from 'vitest'
import { createNaveyoBootstrap, loadItineraryView, loadPlacesView, loadTripWorkspace, type NaveyoModules } from '../../src/bootstrap'
import { trip, stop, place, itineraryItem, reservation, document, expense, ownerId, tripId, stopId } from '../../src/modules/__fixtures__/domain'
import { FakeOfflineTripPack, FakePlacesProvider, FakeTripTracking, FakeTrips } from '../contracts/fakes'
import type { Account } from '../../src/modules/identity'
import type { SuggestionDraft } from '../../src/modules/trip-assistant'

const account: Account = { id: ownerId, email: 'owner@naveyo.test' }

function createModules(overrides: Partial<NaveyoModules> = {}): NaveyoModules {
  const identity = { currentAccount: async () => account, signOut: async () => undefined }
  const itinerary = { list: async () => [itineraryItem], add: async (input: Omit<typeof itineraryItem, 'id'>) => ({ ...input, id: itineraryItem.id }) }
  const tripAssistant = {
    suggestPlaces: async (): Promise<SuggestionDraft[]> => [{ id: place.id, candidateId: place.id, title: place.name, reason: 'À proximité de l’Étape', createdAt: itineraryItem.time!.local as SuggestionDraft['createdAt'] }],
  }

  return {
    identity,
    trips: new FakeTrips(trip, [stop]),
    itinerary,
    places: new FakePlacesProvider([place]),
    tripAssistant,
    reservations: { list: async () => [reservation], confirm: async () => reservation },
    documents: { list: async () => [document], add: async (input) => ({ ...input, id: document.id }) },
    expenses: { getBudget: async () => null, setBudget: async (tripId, money) => ({ tripId, planned: money }), list: async () => [expense], add: async (input) => ({ ...input, id: expense.id }) },
    offlineTripPack: new FakeOfflineTripPack(),
    tripTracking: new FakeTripTracking(),
    ...overrides,
  }
}

describe('INT-101 integrated application boundary', () => {
  it('loads the authenticated Voyage and its Étapes through module interfaces', async () => {
    const result = await loadTripWorkspace(createNaveyoBootstrap(createModules(), tripId), tripId)

    expect(result).toMatchObject({ account, trip, stops: [stop] })
  })

  it('passes only real candidates from Places to the Suggestion IA module', async () => {
    const suggestPlaces = vi.fn(async (input: Parameters<NaveyoModules['tripAssistant']['suggestPlaces']>[0]) => [{
      id: place.id,
      candidateId: input.candidates[0]!.id,
      title: place.name,
      reason: 'Candidate contrôlé',
      createdAt: itineraryItem.time!.local as SuggestionDraft['createdAt'],
    }])
    const result = await loadPlacesView(createNaveyoBootstrap(createModules({ tripAssistant: { suggestPlaces } }), tripId), {
      tripId,
      stopId,
      query: 'Belém',
      preferences: 'extérieur',
    })

    expect(result?.candidates).toEqual([place])
    expect(suggestPlaces).toHaveBeenCalledWith({ tripId, stopId, candidates: [place], preferences: 'extérieur' })
    expect(result?.suggestions[0]?.candidateId).toBe(place.id)
  })

  it('does not load private Voyage data without an authenticated Compte', async () => {
    const getTrip = vi.fn(async () => trip)
    const trips = {
      get: getTrip,
      listStops: async () => [stop],
      createStop: async (input: Omit<typeof stop, 'id'>) => ({ ...input, id: stop.id }),
    }
    const result = await loadTripWorkspace(
      createNaveyoBootstrap(createModules({ identity: { currentAccount: async () => null, signOut: async () => undefined }, trips }), tripId),
      tripId,
    )

    expect(result).toBeNull()
    expect(getTrip).not.toHaveBeenCalled()
  })

  it('loads the existing itinerary only after the Voyage boundary succeeds', async () => {
    const result = await loadItineraryView(createNaveyoBootstrap(createModules(), tripId), tripId)

    expect(result?.trip.id).toBe(tripId)
    expect(result?.items).toEqual([itineraryItem])
  })
})
