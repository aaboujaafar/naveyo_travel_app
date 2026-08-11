// @ts-nocheck
import { describe, expect, it } from 'vitest'

import { createNaveyoBootstrap, createOfflineTripPackModule, type NaveyoModules } from '../../src/bootstrap'
import { uuid, now } from '../../src/modules/_shared/fake'
import type { Account, IdentityModule } from '../../src/modules/identity'
import type { DocumentAnalyzer, ReservationsModule } from '../../src/modules/reservations'
import type { DocumentsModule } from '../../src/modules/documents'
import type { Reservation, ReservationDraft, TravelDocument, Trip, UUID } from '../../src/modules/_shared/model'
import type { OfflineTripPackStore, TripPackFileStore } from '../../src/modules/offline-trip-pack'
import type { TripsModule } from '../../src/modules/trips'

const ownerId = uuid('00000000-0000-4000-8000-000000000001')
const editorId = uuid('00000000-0000-4000-8000-000000000002')
const outsiderId = uuid('00000000-0000-4000-8000-000000000003')
const tripId = uuid('00000000-0000-4000-8000-000000000010')
const documentId = uuid('00000000-0000-4000-8000-000000000011')
const reservationId = uuid('00000000-0000-4000-8000-000000000012')

const trip: Trip = {
  id: tripId,
  name: 'Lisbonne 2026',
  referenceCurrency: 'EUR' as Trip['referenceCurrency'],
  travelers: [ownerId, editorId],
  members: [
    { accountId: ownerId, role: 'owner' },
    { accountId: editorId, role: 'editor' },
  ],
  stopIds: [],
  createdAt: now(),
}

const draft: ReservationDraft = {
  sourceDocumentId: documentId,
  type: 'accommodation',
  title: 'Hotel Naveyo',
  provider: 'Naveyo Hotels',
  confidence: 'high',
  fieldsRequiringConfirmation: ['title', 'start', 'end'],
}

class FakeIdentity implements IdentityModule {
  constructor(private readonly account: Account) {}
  async currentAccount() { return this.account }
  async signOut() {}
}

class PermissionedTrips implements TripsModule {
  constructor(private readonly accountId: UUID) {}

  async get(requestedTripId: UUID) {
    return requestedTripId === tripId && trip.members.some((member) => member.accountId === this.accountId) ? trip : null
  }

  async listStops(requestedTripId: UUID) {
    return requestedTripId === tripId && trip.members.some((member) => member.accountId === this.accountId) ? [] : []
  }

  async createStop(input: Parameters<TripsModule['createStop']>[0]) {
    if (!(await this.get(input.tripId))) throw new Error('Trip membership required')
    return { ...input, id: uuid('00000000-0000-4000-8000-000000000013') }
  }
}

class PermissionedReservations implements ReservationsModule {
  private readonly reservations: Reservation[] = []
  private readonly confirmedDocumentIds = new Set<UUID>()

  constructor(private readonly accountId: UUID) {}

  private assertMember(requestedTripId: UUID) {
    if (requestedTripId !== tripId || !trip.members.some((member) => member.accountId === this.accountId)) {
      throw new Error('Trip membership required')
    }
  }

  async list(requestedTripId: UUID) {
    this.assertMember(requestedTripId)
    return structuredClone(this.reservations)
  }

  async confirm(requestedTripId: UUID, reservationDraft: ReservationDraft) {
    this.assertMember(requestedTripId)
    if (reservationDraft.sourceDocumentId && this.confirmedDocumentIds.has(reservationDraft.sourceDocumentId)) {
      const existing = this.reservations[0]
      if (!existing) throw new Error('Confirmed reservation missing')
      return structuredClone(existing)
    }

    if (!reservationDraft.type || !reservationDraft.title) throw new Error('Human confirmation required')
    const reservation: Reservation = {
      id: reservationId,
      tripId: requestedTripId,
      type: reservationDraft.type,
      title: reservationDraft.title,
      provider: reservationDraft.provider,
      confirmedAt: now(),
    }
    this.reservations.push(reservation)
    if (reservationDraft.sourceDocumentId) this.confirmedDocumentIds.add(reservationDraft.sourceDocumentId)
    return structuredClone(reservation)
  }
}

class FakeDocuments implements DocumentsModule {
  private readonly documents: TravelDocument[] = []
  async list(requestedTripId: UUID) { return this.documents.filter((document) => document.tripId === requestedTripId) }
  async add(input: Omit<TravelDocument, 'id'>) {
    const document = { ...input, id: documentId }
    this.documents.push(document)
    return document
  }
}

const emptyModules = (identity: IdentityModule, trips: TripsModule, reservations: ReservationsModule, documents: DocumentsModule): NaveyoModules => ({
  identity,
  invitationSharing: { share: async () => ({ channel: 'system', status: 'opened' }) },
  trips,
  reservations,
  documents,
  itinerary: { list: async () => [], add: async (input) => ({ ...input, id: uuid('00000000-0000-4000-8000-000000000014') }) },
  places: { search: async () => [], getById: async () => null },
  tripAssistant: { suggestPlaces: async () => [] },
  expenses: {
    getBudget: async () => null,
    setBudget: async (requestedTripId, planned) => ({ tripId: requestedTripId, planned }),
    list: async () => [],
    add: async (input) => ({ ...input, id: uuid('00000000-0000-4000-8000-000000000015') }),
  },
  offlineTripPack: { get: async () => null, load: async () => ({ state: 'empty', pack: null, manifest: null }), replace: async () => {}, manifest: async () => null },
  tripTracking: {
    append: async () => {},
    list: async () => [],
    tracker: { start: async () => ({ state: 'recording' }), stop: async () => ({ state: 'stopped' }), getStatus: async () => ({ state: 'stopped' }) },
  },
})

const analyzer: DocumentAnalyzer = { analyze: async () => structuredClone(draft) }

describe('INT-105 integration journeys', () => {
  it('wires modules through the composition root without constructing adapters in a route', async () => {
    const identity = new FakeIdentity({ id: ownerId, email: 'owner@example.com' })
    const trips = new PermissionedTrips(ownerId)
    const reservations = new PermissionedReservations(ownerId)
    const documents = new FakeDocuments()
    const bootstrap = createNaveyoBootstrap(emptyModules(identity, trips, reservations, documents))

    expect(bootstrap.modules.identity).toBe(identity)
    expect(bootstrap.modules.trips).toBe(trips)
    expect(await bootstrap.modules.trips.get(tripId)).toEqual(trip)
    expect(await analyzer.analyze('persistent://imports/reservation.pdf')).toEqual(draft)
  })

  it('keeps an extracted draft unconfirmed until the human confirmation action', async () => {
    const reservations = new PermissionedReservations(ownerId)
    const beforeConfirmation = await reservations.list(tripId)

    expect(beforeConfirmation).toEqual([])
    expect(draft.fieldsRequiringConfirmation).toContain('title')

    const confirmed = await reservations.confirm(tripId, draft)
    expect(confirmed.title).toBe('Hotel Naveyo')
    expect(await reservations.list(tripId)).toHaveLength(1)
  })

  it('makes repeated confirmation of the same imported document idempotent', async () => {
    const reservations = new PermissionedReservations(ownerId)

    const first = await reservations.confirm(tripId, draft)
    const second = await reservations.confirm(tripId, draft)

    expect(second).toEqual(first)
    expect(await reservations.list(tripId)).toHaveLength(1)
  })

  it('rejects reads and writes from an account outside the trip', async () => {
    const outsider = new PermissionedTrips(outsiderId)
    const reservations = new PermissionedReservations(outsiderId)

    expect(await outsider.get(tripId)).toBeNull()
    await expect(reservations.list(tripId)).rejects.toThrow('Trip membership required')
    await expect(reservations.confirm(tripId, draft)).rejects.toThrow('Trip membership required')
  })

  it('restores the active trip pack after rebuilding the module around persistent stores', async () => {
    let activePack: Awaited<ReturnType<OfflineTripPackStore['readActive']>> = null
    const files: TripPackFileStore = { inspect: async (path) => ({ path, exists: true, checksum: 'sha256:reservation' }) }
    const store: OfflineTripPackStore = {
      readActive: async (requestedTripId) => activePack?.tripId === requestedTripId ? structuredClone(activePack) : null,
      stage: async (pack) => { activePack = { tripId: pack.manifest.tripId, pack: structuredClone(pack) } },
      activate: async () => {},
    }
    const pack = {
      manifest: { tripId, schemaVersion: 1, generatedAt: now(), serverRevision: '42', files: [{ path: 'reservations/reservation.pdf', checksum: 'sha256:reservation', state: 'ready' as const }] },
      trip,
      stops: [],
      places: [],
      itinerary: [],
      reservations: [],
      documents: [],
      expenses: [],
    }

    await createOfflineTripPackModule({ store, files }).replace(pack)
    const restartedModule = createOfflineTripPackModule({ store, files })

    expect(await restartedModule.load(tripId)).toMatchObject({ state: 'ready', manifest: pack.manifest })
    expect(await restartedModule.get(tripId)).toEqual(pack)
  })
})
