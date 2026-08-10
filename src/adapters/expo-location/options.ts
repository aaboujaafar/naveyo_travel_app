import type { LocationTaskOptions } from "expo-location";

const highAccuracy = 4;
const otherNavigationActivity = 4;

/**
 * Stable native configuration for a mixed walking/driving travel day.
 * Adaptation happens when points are persisted, not by restarting this task.
 */
export const adaptiveLocationTaskOptions: LocationTaskOptions = Object.freeze({
  accuracy: highAccuracy,
  distanceInterval: 20,
  deferredUpdatesDistance: 75,
  deferredUpdatesInterval: 60_000,
  activityType: otherNavigationActivity,
  pausesUpdatesAutomatically: true,
  showsBackgroundLocationIndicator: true,
});
