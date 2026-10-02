import * as FileSystem from "expo-file-system/legacy";
import type { TripPack, UUID } from "../../modules/_shared/model";
import type {
  OfflineTripPackStore,
  StoredTripPack,
} from "../../modules/offline-trip-pack";

const directory = () => `${FileSystem.documentDirectory ?? ""}trip-packs/`;
const activePath = (tripId: UUID) => `${directory()}${tripId}.json`;
const stagingPath = (tripId: UUID) => `${directory()}${tripId}.staging.json`;

/**
 * Keeps one pack per Voyage in the app's documents. A refresh is written to a
 * staging file first, so an interrupted download never replaces the last good pack.
 * The offline module validates the JSON it reads back.
 */
export const fileTripPackStore: OfflineTripPackStore = {
  async readActive(tripId) {
    if (!FileSystem.documentDirectory) return null;
    try {
      const pack = JSON.parse(await FileSystem.readAsStringAsync(activePath(tripId))) as TripPack;
      return { tripId, pack } satisfies StoredTripPack;
    } catch {
      return null;
    }
  },
  async stage(pack) {
    if (!FileSystem.documentDirectory) throw new Error("Stockage local indisponible");
    await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
    await FileSystem.writeAsStringAsync(stagingPath(pack.manifest.tripId), JSON.stringify(pack));
  },
  async activate(tripId) {
    const staged = await FileSystem.getInfoAsync(stagingPath(tripId));
    if (!staged.exists) throw new Error("No staged trip pack");
    await FileSystem.deleteAsync(activePath(tripId), { idempotent: true });
    await FileSystem.moveAsync({ from: stagingPath(tripId), to: activePath(tripId) });
  },
};
