import type { TripPack, UUID } from "../../modules/_shared/model";
import type {
  OfflineTripPackStore,
  StoredTripPack,
} from "../../modules/offline-trip-pack";

/**
 * The mobile adapter only needs these operations from expo-sqlite. Keeping the
 * SQL API behind this seam allows the domain module to be tested without a
 * native dependency and makes activation a single database transaction.
 */
export interface SqliteTripPackDatabase {
  readActive(tripId: UUID): Promise<StoredTripPack | null>;
  writeStaging(pack: TripPack): Promise<void>;
  activateStaging(tripId: UUID): Promise<void>;
}

export class SqliteTripPackStore implements OfflineTripPackStore {
  constructor(private readonly database: SqliteTripPackDatabase) {}

  readActive(tripId: UUID) {
    return this.database.readActive(tripId);
  }
  stage(pack: TripPack) {
    return this.database.writeStaging(pack);
  }
  activate(tripId: UUID) {
    return this.database.activateStaging(tripId);
  }
}
