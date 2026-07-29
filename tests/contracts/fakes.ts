import type { Etape, PlaceCandidate, TripPack, UUID, Voyage } from '../../src/modules/_shared/model'
import type { PlacesProvider } from '../../src/modules/places'
import type { OfflineTripPackModule } from '../../src/modules/offline-trip-pack'
import type { TripsModule } from '../../src/modules/trips'

export class FakeTrips implements TripsModule {
  constructor(private readonly trip: Voyage, private readonly stops: Etape[]) {}
  async get(tripId: UUID) { return tripId === this.trip.id ? this.trip : null }
  async listStops(tripId: UUID) { return tripId === this.trip.id ? this.stops : [] }
  async createStop(input: Omit<Etape, 'id'>) { return { ...input, id: `fake-${this.stops.length}` as UUID } }
}

export class FakePlacesProvider implements PlacesProvider {
  constructor(private readonly candidates: PlaceCandidate[]) {}
  async search() { return this.candidates }
  async getById(id: UUID) { return this.candidates.find((candidate) => candidate.id === id) ?? null }
}

export class FakeOfflineTripPack implements OfflineTripPackModule {
  private pack: TripPack | null = null
  async get(tripId: UUID) { return this.pack?.manifest.tripId === tripId ? this.pack : null }
  async replace(pack: TripPack) { this.pack = structuredClone(pack) }
  async manifest(tripId: UUID) { return this.pack?.manifest.tripId === tripId ? this.pack.manifest : null }
}
