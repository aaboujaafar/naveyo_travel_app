// @ts-nocheck
import { describe, expect, it, vi } from 'vitest'
import {
  confirmReservationImport,
  createNaveyoBootstrap,
  loadAppStart,
  loadStopDocuments,
  loadTrackingView,
  moveDocumentToStop,
  startTripTracking,
  stopTripTracking,
  type NaveyoModules,
} from '../../src/bootstrap'
import { now, uuid } from '../../src/modules/_shared/fake'
import type { Account } from '../../src/modules/identity'
import type { TravelDocument, Trip } from '../../src/modules/_shared/model'

const ownerId = uuid('00000000-0000-4000-8000-000000000101')
const editorId = uuid('00000000-0000-4000-8000-000000000102')
const tripId = uuid('00000000-0000-4000-8000-000000000110')
const otherTripId = uuid('00000000-0000-4000-8000-000000000111')
const stopId = uuid('00000000-0000-4000-8000-000000000120')
const otherStopId = uuid('00000000-0000-4000-8000-000000000121')
const documentId = uuid('00000000-0000-4000-8000-000000000130')

const account: Account = { id: ownerId, email: 'owner@naveyo.test' }
const trip: Trip = {
  id: tripId,
  name: 'Lisbonne 2026',
  referenceCurrency: 'EUR',
  travelers: [ownerId, editorId],
  members: [{ accountId: ownerId, role: 'owner' }, { accountId: editorId, role: 'editor' }],
  stopIds: [stopId, otherStopId],
  createdAt: now(),
}
const stops = [
  { id: stopId, tripId, name: 'Lisbonne', countryCode: 'PT', timeZone: 'Europe/Lisbon', startDate: '2026-09-04', endDate: '2026-09-06' },
  { id: otherStopId, tripId, name: 'Porto', countryCode: 'PT', timeZone: 'Europe/Lisbon', startDate: '2026-09-07', endDate: '2026-09-09' },
]
const document: TravelDocument = {
  id: documentId,
  tripId,
  kind: 'pdf',
  fileName: 'hotel.pdf',
  mimeType: 'application/pdf',
  byteSize: 42,
  storagePath: `${tripId}/${documentId}/hotel.pdf`,
  persistentUri: 'file:///documents/hotel.pdf',
  checksum: 'sha256:hotel',
  createdAt: now(),
}

function makeModules(overrides: Partial<NaveyoModules> = {}): NaveyoModules {
  const documents = {
    list: vi.fn(async (_requestedTripId, requestedStopId) => requestedStopId ? [document.stopId === requestedStopId ? document : { ...document, stopId: requestedStopId }] : [document]),
    add: vi.fn(async (input) => ({ ...input, id: documentId, persistentUri: 'file:///documents/hotel.pdf', storagePath: document.storagePath, createdAt: now() })),
    assign: vi.fn(async (_requestedTripId, _documentId, requestedStopId) => ({ ...document, stopId: requestedStopId })),
    download: vi.fn(async () => ({ persistentUri: document.persistentUri })),
  }
  const trips = {
    get: vi.fn(async (requestedTripId) => requestedTripId === tripId ? trip : null),
    listStops: vi.fn(async (requestedTripId) => requestedTripId === tripId ? stops : []),
  }
  const tracking = {
    append: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
    tracker: {
      start: vi.fn(async (requestedTripId) => ({ state: 'recording', tripId: requestedTripId })),
      stop: vi.fn(async () => ({ state: 'stopped', tripId })),
      getStatus: vi.fn(async () => ({ state: 'stopped', tripId })),
    },
  }
  const modules = {
    identity: { currentAccount: async () => account, signIn: vi.fn(), signUp: vi.fn(), signOut: async () => undefined },
    invitationSharing: { share: vi.fn(async () => ({ channel: 'system', status: 'opened' })) },
    trips,
    itinerary: { list: async () => [], add: vi.fn(), addConfirmedPlace: vi.fn() },
    places: { search: async () => [], getById: async () => null, createManual: vi.fn() },
    tripAssistant: { suggestPlaces: async () => [] },
    reservations: {
      list: async () => [],
      findDuplicate: async () => null,
      confirm: vi.fn(async () => ({ id: uuid('00000000-0000-4000-8000-000000000140'), tripId, type: 'accommodation', title: 'Hotel Naveyo', confirmedAt: now() })),
    },
    documents,
    expenses: { getBudget: async () => null, setBudget: vi.fn(), list: async () => [], add: vi.fn(), summarize: async () => null },
    offlineTripPack: { get: async () => null, load: async () => ({ state: 'empty', pack: null, manifest: null }), replace: vi.fn(), manifest: async () => null },
    tripTracking: tracking,
    ...overrides,
  }
  return modules as NaveyoModules
}

describe('INT-102 à INT-106 parcours intégrés', () => {
  it('INT-102 confirms the reservation before making its Document private', async () => {
    const events: string[] = []
    const modules = makeModules({
      reservationAnalyzer: { analyze: vi.fn(async () => { events.push('analyze'); return { type: 'accommodation', title: 'Hotel Naveyo', confidence: 'high', fieldsRequiringConfirmation: ['title'] } }) },
      reservations: { list: async () => [], findDuplicate: async () => null, confirm: vi.fn(async () => { events.push('confirm'); return { id: uuid('00000000-0000-4000-8000-000000000140'), tripId, type: 'accommodation', title: 'Hotel Naveyo', confirmedAt: now() } }) },
      documents: { ...makeModules().documents, add: vi.fn(async (input) => { events.push('document'); return { ...input, id: documentId } }) },
    })
    const result = await confirmReservationImport(createNaveyoBootstrap(modules), {
      tripId,
      source: { uri: 'file:///imports/hotel.pdf', kind: 'pdf' },
      confirmedFields: ['title'],
      stopId,
      document: { kind: 'pdf', fileName: 'hotel.pdf', mimeType: 'application/pdf', byteSize: 42, checksum: 'sha256:hotel', body: 'pdf' },
    })
    expect(result.document?.reservationId).toBe(result.reservation.id)
    expect(events).toEqual(['analyze', 'confirm', 'document'])
  })

  it('INT-103 exposes start, stop and persisted points through the tracking seam', async () => {
    const modules = makeModules()
    const bootstrap = createNaveyoBootstrap(modules)
    expect(await startTripTracking(bootstrap, tripId)).toMatchObject({ state: 'recording', tripId })
    expect(await stopTripTracking(bootstrap, tripId)).toMatchObject({ state: 'stopped', tripId })
    expect((await loadTrackingView(bootstrap, tripId))?.trip.id).toBe(tripId)
    expect(modules.tripTracking.tracker.start).toHaveBeenCalledWith(tripId)
  })

  it('INT-104 restores the TripPack when the remote Voyage is unavailable', async () => {
    const pack = { trip, stops, places: [], itinerary: [], reservations: [], documents: [document], expenses: [], manifest: { tripId, schemaVersion: 1, generatedAt: now(), serverRevision: '42', files: [] } }
    const modules = makeModules({ trips: { get: async () => null, listStops: async () => [] }, offlineTripPack: { get: async () => pack, load: async () => ({ state: 'ready', pack, manifest: pack.manifest }), replace: vi.fn(), manifest: async () => pack.manifest } })
    const result = await loadAppStart(createNaveyoBootstrap(modules), tripId)
    expect(result).toMatchObject({ source: 'offline', trip, stops })
  })

  it('INT-105 refuses a Voyage outside the authenticated boundary', async () => {
    const modules = makeModules({ trips: { get: async () => null, listStops: async () => [] } })
    expect(await loadStopDocuments(createNaveyoBootstrap(modules), otherTripId, stopId)).toBeNull()
    expect(await loadTrackingView(createNaveyoBootstrap(modules), otherTripId)).toBeNull()
  })

  it('INT-106 lists and moves a Document between valid Étapes for the second member', async () => {
    const modules = makeModules()
    const bootstrap = createNaveyoBootstrap(modules)
    const view = await loadStopDocuments(bootstrap, tripId, stopId)
    expect(view?.documents).toHaveLength(1)
    const moved = await moveDocumentToStop(bootstrap, tripId, documentId, otherStopId)
    expect(moved.stopId).toBe(otherStopId)
    await expect(moveDocumentToStop(bootstrap, tripId, documentId, uuid('00000000-0000-4000-8000-000000000199'))).rejects.toThrow('does not belong')
  })
})
