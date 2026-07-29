import type { Stop, Trip, UUID } from '../_shared/model'
export interface TripsModule {
  get(tripId: UUID): Promise<Trip | null>
  listStops(tripId: UUID): Promise<Stop[]>
  createStop(input: Omit<Stop, 'id'>): Promise<Stop>
}
