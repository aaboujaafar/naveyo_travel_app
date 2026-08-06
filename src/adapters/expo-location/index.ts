import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import type { LocationTracker } from '../../modules/trip-tracking'
import type { TrackPoint, TrackingStatus, UUID } from '../../modules/_shared/model'
import { makeTrackPoint } from './normalize'
import { FileTrackingPointStore, type TrackingPointStore } from './store'

export const trackingTaskName = 'naveyo-trip-tracking'

interface ActiveTrackingState {
  tripId: UUID
}

let activeState: ActiveTrackingState | null = null
let stateStore: TrackingPointStore = new FileTrackingPointStore()

TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(trackingTaskName, async ({ data, error }) => {
  if (error || !data?.locations || activeState === null) return
  for (const location of data.locations) {
    await stateStore.append(activeState.tripId, makeTrackPoint(activeState.tripId, location))
  }
})

export class ExpoLocationTracker implements LocationTracker {
  private status: TrackingStatus = { state: 'stopped' }

  constructor(store: TrackingPointStore = stateStore) {
    stateStore = store
  }

  async start(tripId: UUID): Promise<TrackingStatus> {
    this.status = { state: 'starting', tripId }
    const foreground = await Location.requestForegroundPermissionsAsync()
    if (foreground.status !== Location.PermissionStatus.GRANTED) {
      return this.fail(tripId, 'Location permission denied')
    }

    const background = await Location.requestBackgroundPermissionsAsync()
    if (background.status !== Location.PermissionStatus.GRANTED) {
      return this.fail(tripId, 'Background location permission denied')
    }

    activeState = { tripId }
    await Location.startLocationUpdatesAsync(trackingTaskName, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 25,
      deferredUpdatesDistance: 25,
      deferredUpdatesInterval: 30_000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    })
    this.status = { state: 'recording', tripId }
    return this.status
  }

  async stop(): Promise<TrackingStatus> {
    if (await Location.hasStartedLocationUpdatesAsync(trackingTaskName)) {
      await Location.stopLocationUpdatesAsync(trackingTaskName)
    }
    const tripId = activeState?.tripId ?? this.status.tripId
    activeState = null
    this.status = { state: 'stopped', ...(tripId ? { tripId } : {}) }
    return this.status
  }

  async getStatus(): Promise<TrackingStatus> {
    const recording = await Location.hasStartedLocationUpdatesAsync(trackingTaskName)
    if (recording && activeState !== null) return { state: 'recording', tripId: activeState.tripId }
    return this.status
  }

  private fail(tripId: UUID, message: string): TrackingStatus {
    this.status = { state: 'error', tripId, message }
    activeState = null
    return this.status
  }
}

export function createExpoLocationTrackingModule(store: TrackingPointStore = stateStore) {
  const tracker = new ExpoLocationTracker(store)
  return {
    tracker,
    append: (tripId: UUID, point: TrackPoint) => store.append(tripId, point),
    list: (tripId: UUID) => store.list(tripId),
  }
}
