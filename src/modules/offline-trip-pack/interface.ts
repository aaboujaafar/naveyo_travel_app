import type { TripPack, TripPackManifest, UUID } from '../_shared/model'
export interface OfflineTripPackModule { get(tripId: UUID): Promise<TripPack | null>; replace(pack: TripPack): Promise<void>; manifest(tripId: UUID): Promise<TripPackManifest | null> }
