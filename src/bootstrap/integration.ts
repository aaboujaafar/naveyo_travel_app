import type { Account } from '../modules/identity'
import type { ItineraryItem, PlaceCandidate, Stop, Trip, UUID } from '../modules/_shared/model'
import type { NaveyoBootstrap } from './index'

export interface TripWorkspace {
  account: Account
  trip: Trip
  stops: Stop[]
}

export interface PlacesView {
  trip: Trip
  stop: Stop
  candidates: PlaceCandidate[]
  suggestions: Awaited<ReturnType<NaveyoBootstrap['modules']['tripAssistant']['suggestPlaces']>>
}

export interface ItineraryView {
  trip: Trip
  items: ItineraryItem[]
}

export async function loadTripWorkspace(bootstrap: NaveyoBootstrap, tripId: UUID): Promise<TripWorkspace | null> {
  const account = await bootstrap.modules.identity.currentAccount()
  if (!account) return null

  const trip = await bootstrap.modules.trips.get(tripId)
  if (!trip) return null

  const stops = await bootstrap.modules.trips.listStops(trip.id)
  return { account, trip, stops }
}

export async function loadPlacesView(
  bootstrap: NaveyoBootstrap,
  input: { tripId: UUID; stopId: UUID; query: string; preferences?: string },
): Promise<PlacesView | null> {
  const workspace = await loadTripWorkspace(bootstrap, input.tripId)
  const stop = workspace?.stops.find((candidate) => candidate.id === input.stopId)
  if (!workspace || !stop) return null

  const candidates = await bootstrap.modules.places.search({
    query: input.query,
    countryCode: stop.countryCode,
    stopId: stop.id,
  })
  const suggestions = await bootstrap.modules.tripAssistant.suggestPlaces({
    tripId: workspace.trip.id,
    stopId: stop.id,
    candidates,
    preferences: input.preferences,
  })

  return { trip: workspace.trip, stop, candidates, suggestions }
}

export async function loadItineraryView(bootstrap: NaveyoBootstrap, tripId: UUID): Promise<ItineraryView | null> {
  const workspace = await loadTripWorkspace(bootstrap, tripId)
  if (!workspace) return null

  const items = await bootstrap.modules.itinerary.list(workspace.trip.id)
  return { trip: workspace.trip, items }
}
