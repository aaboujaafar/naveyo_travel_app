import type { Etape, UUID, Voyage } from '../_shared/model'
export interface TripsModule {
  get(tripId: UUID): Promise<Voyage | null>
  listStops(tripId: UUID): Promise<Etape[]>
  createStop(input: Omit<Etape, 'id'>): Promise<Etape>
}
