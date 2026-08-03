import { uuid } from '../../src/modules/_shared/fake'
import type { PlaceCandidate, Stop, TrackPoint, Trip, TripPack, UUID } from '../../src/modules/_shared/model'
import type { PlaceSearchInput, PlacesProvider } from '../../src/modules/places'
import type { OfflineTripPackLoad, OfflineTripPackModule } from '../../src/modules/offline-trip-pack'
import type { TripsModule } from '../../src/modules/trips'
import type { TripTrackingModule } from '../../src/modules/trip-tracking'

export class FakeTrips implements TripsModule {
  private stops: Stop[]

  constructor(private readonly trip: Trip, stops: Stop[]) {
    this.stops = [...stops]
  }

  async get(tripId: UUID) { return tripId === this.trip.id ? this.trip : null }
  async listStops(tripId: UUID) { return tripId === this.trip.id ? this.stops : [] }
  async createStop(input: Omit<Stop, 'id'>) {
    const id = uuid(`00000000-0000-4000-8000-${String(this.stops.length + 1).padStart(12, '0')}`)
    const stop = { ...input, id }
    this.stops = [...this.stops, stop]
    return stop
  }
}

export class FakePlacesProvider implements PlacesProvider {
  constructor(private readonly candidates: PlaceCandidate[]) {}
  async search(input: PlaceSearchInput) {
    const query = typeof input.query === 'string' ? input.query.trim().toLowerCase() : ''
    return this.candidates.filter((candidate) => {
      const matchesQuery =
        query.length === 0 ||
        candidate.name.toLowerCase().includes(query) ||
        candidate.address?.toLowerCase().includes(query) === true
      const matchesCountry = typeof input.countryCode !== 'string' || candidate.countryCode === input.countryCode
      return matchesQuery && matchesCountry
    })
  }
  async getById(id: UUID) { return this.candidates.find((candidate) => candidate.id === id) ?? null }
}

export class FakeOfflineTripPack implements OfflineTripPackModule {
  private pack: TripPack | null = null
  async get(tripId: UUID) { return this.pack?.manifest.tripId === tripId ? this.pack : null }
  async load(tripId: UUID): Promise<OfflineTripPackLoad> {
    const pack = await this.get(tripId)
    return pack === null
      ? { state: 'empty', pack: null, manifest: null }
      : { state: 'ready', pack, manifest: pack.manifest }
  }
  async replace(pack: TripPack) { this.pack = structuredClone(pack) }
  async manifest(tripId: UUID) { return this.pack?.manifest.tripId === tripId ? this.pack.manifest : null }
}

export class FakeTripTracking implements TripTrackingModule {
  private points: TrackPoint[] = []

  async append(point: TrackPoint) {
    if (this.points.some((existing) => existing.idempotencyKey === point.idempotencyKey)) return
    this.points = [...this.points, structuredClone(point)]
  }

  async list(_tripId: UUID) { return structuredClone(this.points) }

  tracker = {
    start: async (tripId: UUID) => ({ state: 'recording' as const, tripId }),
    stop: async () => ({ state: 'stopped' as const }),
    getStatus: async () => ({ state: 'stopped' as const }),
  }
}
