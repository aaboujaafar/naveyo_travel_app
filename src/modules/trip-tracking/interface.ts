import type { TrackPoint, TrackingStatus, UUID } from '../_shared/model'
export interface LocationTracker { start(tripId: UUID): Promise<TrackingStatus>; stop(): Promise<TrackingStatus>; getStatus(): Promise<TrackingStatus> }
export interface TripTrackingModule { append(point: TrackPoint): Promise<void>; list(tripId: UUID): Promise<TrackPoint[]>; tracker: LocationTracker }
