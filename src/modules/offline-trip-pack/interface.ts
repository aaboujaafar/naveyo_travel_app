import type { TripPack, TripPackManifest, UUID } from '../_shared/model'
import type { OfflineTripPackLoad } from './model'

export interface OfflineTripPackModule {
  get(tripId: UUID): Promise<TripPack | null>
  load(tripId: UUID): Promise<OfflineTripPackLoad>
  replace(pack: TripPack): Promise<void>
  manifest(tripId: UUID): Promise<TripPackManifest | null>
}
