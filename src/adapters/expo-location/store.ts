import * as FileSystem from "expo-file-system/legacy";
import type { TrackPoint, UUID } from "../../modules/_shared/model";
import { appendUniquePoint, parseStoredTrackingState } from "./normalize";

const directory = `${FileSystem.documentDirectory ?? ""}naveyo-trip-tracking/`;

export interface TrackingPointStore {
  append(tripId: UUID, point: TrackPoint): Promise<void>;
  list(tripId: UUID): Promise<TrackPoint[]>;
}

export class FileTrackingPointStore implements TrackingPointStore {
  async append(tripId: UUID, point: TrackPoint): Promise<void> {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const points = await this.list(tripId);
    const next = appendUniquePoint(points, point);
    await FileSystem.writeAsStringAsync(
      pathForTrip(tripId),
      JSON.stringify({ tripId, points: next }),
    );
  }

  async list(tripId: UUID): Promise<TrackPoint[]> {
    try {
      const content = await FileSystem.readAsStringAsync(pathForTrip(tripId));
      return [...parseStoredTrackingState(content, tripId).points];
    } catch {
      return [];
    }
  }
}

function pathForTrip(tripId: UUID): string {
  return `${directory}${tripId}.json`;
}
