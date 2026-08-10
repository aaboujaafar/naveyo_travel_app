import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import type { LocationTracker } from "../../modules/trip-tracking";
import type {
  TrackPoint,
  TrackingStatus,
  UUID,
} from "../../modules/_shared/model";
import { evaluateLocationObservation } from "../../modules/trip-tracking/adaptive";
import {
  appendUniquePoint,
  makeLocationObservation,
  makeTrackPoint,
} from "./normalize";
import { adaptiveLocationTaskOptions } from "./options";
import { FileTrackingPointStore, type TrackingPointStore } from "./store";

export const trackingTaskName = "naveyo-trip-tracking";

interface ActiveTrackingState {
  tripId: UUID;
}

let activeState: ActiveTrackingState | null = null;
let stateStore: TrackingPointStore = new FileTrackingPointStore();
let processingLocations: Promise<void> = Promise.resolve();

TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(
  trackingTaskName,
  async ({ data, error }) => {
    if (error || !data?.locations) return;
    const tripId = activeState?.tripId ?? await stateStore.getActiveTripId();
    if (tripId === null) return;
    activeState = { tripId };
    processingLocations = processingLocations.catch(() => undefined).then(async () => {
      for (const location of data.locations ?? []) {
        await recordAdaptiveLocation(stateStore, tripId, location);
      }
    });
    await processingLocations;
  },
);

export class ExpoLocationTracker implements LocationTracker {
  private status: TrackingStatus = { state: "stopped" };

  constructor(store: TrackingPointStore = stateStore) {
    stateStore = store;
  }

  async start(tripId: UUID): Promise<TrackingStatus> {
    this.status = { state: "starting", tripId };
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== Location.PermissionStatus.GRANTED) {
      return this.fail(tripId, "Location permission denied");
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== Location.PermissionStatus.GRANTED) {
      return this.fail(tripId, "Background location permission denied");
    }

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(trackingTaskName);
    const activeTripId = activeState?.tripId ?? await stateStore.getActiveTripId();
    if (alreadyStarted && activeTripId && activeTripId !== tripId) {
      return this.fail(tripId, "Another trip is already being recorded on this device");
    }
    activeState = { tripId };
    await stateStore.setActiveTripId(tripId);
    try {
      if (!alreadyStarted) {
        await Location.startLocationUpdatesAsync(trackingTaskName, adaptiveLocationTaskOptions);
      }
    } catch (error) {
      activeState = null;
      await stateStore.setActiveTripId(null);
      throw error;
    }
    this.status = { state: "recording", tripId };
    return this.status;
  }

  async stop(): Promise<TrackingStatus> {
    if (await Location.hasStartedLocationUpdatesAsync(trackingTaskName)) {
      await Location.stopLocationUpdatesAsync(trackingTaskName);
    }
    const tripId = activeState?.tripId
      ?? await stateStore.getActiveTripId()
      ?? this.status.tripId;
    activeState = null;
    await stateStore.setActiveTripId(null);
    this.status = { state: "stopped", ...(tripId ? { tripId } : {}) };
    return this.status;
  }

  async getStatus(): Promise<TrackingStatus> {
    const recording =
      await Location.hasStartedLocationUpdatesAsync(trackingTaskName);
    const tripId = activeState?.tripId ?? await stateStore.getActiveTripId();
    if (recording && tripId !== null) {
      activeState = { tripId };
      return { state: "recording", tripId };
    }
    return this.status;
  }

  private fail(tripId: UUID, message: string): TrackingStatus {
    this.status = { state: "error", tripId, message };
    activeState = null;
    return this.status;
  }
}

export function createExpoLocationTrackingModule(
  store: TrackingPointStore = stateStore,
) {
  const tracker = new ExpoLocationTracker(store);
  return {
    tracker,
    append: async (tripId: UUID, point: TrackPoint) => {
      const current = await store.load(tripId);
      await store.save({ ...current, points: appendUniquePoint(current.points, point) });
    },
    list: async (tripId: UUID) => [...(await store.load(tripId)).points],
  };
}

export async function recordAdaptiveLocation(
  store: TrackingPointStore,
  tripId: UUID,
  location: Location.LocationObject,
): Promise<boolean> {
  const current = await store.load(tripId);
  const decision = evaluateLocationObservation(
    current.adaptive,
    makeLocationObservation(location),
  );
  const points = decision.accept
    ? appendUniquePoint(current.points, makeTrackPoint(tripId, location))
    : [...current.points];
  await store.save({ tripId, points, adaptive: decision.state });
  return decision.accept;
}
