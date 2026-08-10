import * as FileSystem from "expo-file-system/legacy";
import type { UUID } from "../../modules/_shared/model";
import { isUuid } from "../../modules/_shared/validation";
import {
  emptyStoredTrackingState,
  parseStoredTrackingState,
  type StoredTrackingState,
} from "./normalize";

const directory = `${FileSystem.documentDirectory ?? ""}naveyo-trip-tracking/`;
const activeTripPath = `${directory}active-trip.txt`;

export interface TrackingPointStore {
  load(tripId: UUID): Promise<StoredTrackingState>;
  save(state: StoredTrackingState): Promise<void>;
  getActiveTripId(): Promise<UUID | null>;
  setActiveTripId(tripId: UUID | null): Promise<void>;
}

export class FileTrackingPointStore implements TrackingPointStore {
  async load(tripId: UUID): Promise<StoredTrackingState> {
    try {
      const content = await FileSystem.readAsStringAsync(pathForTrip(tripId));
      return parseStoredTrackingState(content, tripId);
    } catch {
      return emptyStoredTrackingState(tripId);
    }
  }

  async save(state: StoredTrackingState): Promise<void> {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    await FileSystem.writeAsStringAsync(
      pathForTrip(state.tripId),
      JSON.stringify(state),
    );
  }

  async getActiveTripId(): Promise<UUID | null> {
    try {
      const tripId = (await FileSystem.readAsStringAsync(activeTripPath)).trim();
      return isUuid(tripId) ? tripId as UUID : null;
    } catch {
      return null;
    }
  }

  async setActiveTripId(tripId: UUID | null): Promise<void> {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    if (tripId === null) {
      try {
        await FileSystem.deleteAsync(activeTripPath, { idempotent: true });
      } catch {
        // The tracker is already inactive.
      }
      return;
    }
    await FileSystem.writeAsStringAsync(activeTripPath, tripId);
  }
}

function pathForTrip(tripId: UUID): string {
  return `${directory}${tripId}.json`;
}
