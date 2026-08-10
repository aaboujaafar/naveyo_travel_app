import type { Account } from '../modules/identity'
import type { DocumentAnalyzer, ReservationImportSource, ReservationConfirmation } from '../modules/reservations'
import type { ItineraryItem, PlaceCandidate, Stop, TrackPoint, TravelDocument, Trip, UUID } from '../modules/_shared/model'
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

export interface AppStart {
  account: Account
  trip: Trip | null
  stops: Stop[]
  source: 'online' | 'offline' | 'empty'
}

export interface ReservationImportView {
  reservation: Awaited<ReturnType<NaveyoBootstrap['modules']['reservations']['confirm']>>
  document?: TravelDocument
}

export interface StopDocumentsView {
  trip: Trip
  stop: Stop
  documents: TravelDocument[]
}

export interface TrackingView {
  trip: Trip
  status: Awaited<ReturnType<NaveyoBootstrap['modules']['tripTracking']['tracker']['getStatus']>>
  points: TrackPoint[]
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
    query: input.query,
    preferences: input.preferences,
    stopName: stop.name,
    countryCode: stop.countryCode,
    timeZone: stop.timeZone,
  })

  return { trip: workspace.trip, stop, candidates, suggestions }
}

export async function loadItineraryView(bootstrap: NaveyoBootstrap, tripId: UUID): Promise<ItineraryView | null> {
  const workspace = await loadTripWorkspace(bootstrap, tripId)
  if (!workspace) return null

  const items = await bootstrap.modules.itinerary.list(workspace.trip.id)
  return { trip: workspace.trip, items }
}

/** INT-104: preserve a previously downloaded TripPack when the network is unavailable. */
export async function loadAppStart(bootstrap: NaveyoBootstrap, tripId: UUID): Promise<AppStart | null> {
  const account = await bootstrap.modules.identity.currentAccount()
  if (!account) return null
  const trip = await bootstrap.modules.trips.get(tripId)
  if (trip) return { account, trip, stops: await bootstrap.modules.trips.listStops(tripId), source: 'online' }

  const pack = await bootstrap.modules.offlineTripPack.load(tripId)
  if (pack.state === 'ready' && pack.pack) {
    return { account, trip: pack.pack.trip, stops: pack.pack.stops, source: 'offline' }
  }
  return { account, trip: null, stops: [], source: 'empty' }
}

/** INT-102: a file becomes private only after the reservation confirmation succeeds. */
export async function confirmReservationImport(
  bootstrap: NaveyoBootstrap,
  input: {
    tripId: UUID
    source: ReservationImportSource
    confirmedFields: string[]
    document?: Omit<Parameters<NaveyoBootstrap['modules']['documents']['add']>[0], 'tripId' | 'reservationId' | 'stopId'>
    stopId?: UUID
  },
): Promise<ReservationImportView> {
  const analyzer: DocumentAnalyzer | undefined = bootstrap.modules.reservationAnalyzer
  if (!analyzer) throw new Error('Reservation analyzer is not configured')
  const draft = await analyzer.analyze(input.source)
  const confirmation: ReservationConfirmation = {
    tripId: input.tripId,
    draft,
    confirmedFields: input.confirmedFields,
  }
  const reservation = await bootstrap.modules.reservations.confirm(confirmation)
  if (!input.document) return { reservation }
  const document = await bootstrap.modules.documents.add({
    ...input.document,
    tripId: input.tripId,
    reservationId: reservation.id,
    ...(input.stopId ? { stopId: input.stopId } : {}),
  })
  return { reservation, document }
}

/** INT-103: the screen talks to the tracking seam, never to the native task. */
export async function startTripTracking(bootstrap: NaveyoBootstrap, tripId: UUID) {
  const workspace = await loadTripWorkspace(bootstrap, tripId)
  if (!workspace) return null
  return bootstrap.modules.tripTracking.tracker.start(tripId)
}

export async function stopTripTracking(bootstrap: NaveyoBootstrap, tripId: UUID) {
  const workspace = await loadTripWorkspace(bootstrap, tripId)
  if (!workspace) return null
  return bootstrap.modules.tripTracking.tracker.stop()
}

export async function loadTrackingView(bootstrap: NaveyoBootstrap, tripId: UUID): Promise<TrackingView | null> {
  const workspace = await loadTripWorkspace(bootstrap, tripId)
  if (!workspace) return null
  return {
    trip: workspace.trip,
    status: await bootstrap.modules.tripTracking.tracker.getStatus(),
    points: await bootstrap.modules.tripTracking.list(tripId),
  }
}

/** INT-106: the stop screen and Documents module share the same trip boundary. */
export async function loadStopDocuments(
  bootstrap: NaveyoBootstrap,
  tripId: UUID,
  stopId: UUID,
): Promise<StopDocumentsView | null> {
  const workspace = await loadTripWorkspace(bootstrap, tripId)
  const stop = workspace?.stops.find((candidate) => candidate.id === stopId)
  if (!workspace || !stop) return null
  return { trip: workspace.trip, stop, documents: await bootstrap.modules.documents.list(tripId, stopId) }
}

export async function moveDocumentToStop(
  bootstrap: NaveyoBootstrap,
  tripId: UUID,
  documentId: UUID,
  stopId?: UUID,
): Promise<TravelDocument> {
  if (!bootstrap.modules.documents.assign) throw new Error('Document association is not configured')
  const workspace = await loadTripWorkspace(bootstrap, tripId)
  if (!workspace || (stopId && !workspace.stops.some((stop) => stop.id === stopId))) {
    throw new Error('Document stop does not belong to this trip')
  }
  return bootstrap.modules.documents.assign(tripId, documentId, stopId)
}
