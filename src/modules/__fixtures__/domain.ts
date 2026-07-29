import { now, uuid } from '../_shared/fake'
import type { Etape, Expense, ItineraryItem, PlaceCandidate, Reservation, ReservationDraft, TrackPoint, TravelDocument, TripPack, Voyage } from '../_shared/model'

export const tripId = uuid('11111111-1111-4111-8111-111111111111')
export const ownerId = uuid('22222222-2222-4222-8222-222222222222')
export const stopId = uuid('33333333-3333-4333-8333-333333333333')

export const voyage: Voyage = { id: tripId, name: 'Lisbon and Porto', referenceCurrency: 'EUR' as Voyage['referenceCurrency'], travelers: [ownerId], members: [{ accountId: ownerId, role: 'owner' }], stopIds: [stopId], createdAt: now() }
export const stop: Etape = { id: stopId, tripId, name: 'Lisbon', countryCode: 'PT', timeZone: 'Europe/Lisbon' as Etape['timeZone'], startDate: '2026-09-04', endDate: '2026-09-08' }
export const place: PlaceCandidate = { id: uuid('44444444-4444-4444-8444-444444444444'), provider: 'geoapify', name: 'Torre de Belém', countryCode: 'PT', coordinates: { latitude: 38.6916, longitude: -9.216 } }
export const itineraryItem: ItineraryItem = { id: uuid('55555555-5555-4555-8555-555555555555'), tripId, stopId, title: 'Visit Belém', date: '2026-09-05', time: { local: '2026-09-05T10:00', timeZone: stop.timeZone }, place: { kind: 'venue', placeId: place.id, label: place.name } }
export const expense: Expense = { id: uuid('66666666-6666-4666-8666-666666666666'), tripId, label: 'Tram', original: { minorUnits: 330, currency: 'EUR' as Expense['original']['currency'] }, reference: { minorUnits: 330, currency: 'EUR' as Expense['reference']['currency'] }, exchangeRateSource: 'not-applicable', occurredOn: '2026-09-05', paidBy: ownerId }
export const reservation: Reservation = { id: uuid('77777777-7777-4777-8777-777777777777'), tripId, type: 'flight', title: 'Paris to Lisbon', origin: { kind: 'origin', label: 'Paris CDG' }, destination: { kind: 'destination', label: 'Lisbon LIS' }, confirmedAt: now() }
export const document: TravelDocument = { id: uuid('88888888-8888-4888-8888-888888888888'), tripId, kind: 'pdf', fileName: 'flight.pdf', persistentUri: 'file:///documents/flight.pdf', checksum: 'sha256:fixture', createdAt: now() }
export const reservationDraft: ReservationDraft = { sourceDocumentId: document.id, type: 'flight', title: 'Paris to Lisbon', origin: { kind: 'origin', label: 'Paris CDG' }, destination: { kind: 'destination', label: 'Lisbon LIS' }, confidence: 'high', fieldsRequiringConfirmation: ['provider', 'reference'] }
export const trackPoint: TrackPoint = { idempotencyKey: 'track-2026-09-05-001', latitude: 38.6916, longitude: -9.216, recordedAt: now(), accuracyMeters: 8 }
export const tripPack: TripPack = { manifest: { tripId, schemaVersion: 1, generatedAt: now(), serverRevision: '42', files: [{ path: document.persistentUri, checksum: document.checksum, state: 'ready' }] }, voyage, stops: [stop], places: [place], itinerary: [itineraryItem], reservations: [reservation], documents: [document], expenses: [expense] }
