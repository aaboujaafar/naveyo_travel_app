import type { TripPack, UUID } from "../../modules/_shared/model";
import type {
  OfflineTripPackStore,
  StoredTripPack,
} from "../../modules/offline-trip-pack";

/** Deterministic fake for module tests; it models staging and atomic activation. */
export class InMemoryTripPackStore implements OfflineTripPackStore {
  private active: StoredTripPack | null = null;
  private staged: StoredTripPack | null = null;

  async readActive(tripId: UUID): Promise<StoredTripPack | null> {
    return this.active?.tripId === tripId ? structuredClone(this.active) : null;
  }

  async stage(pack: TripPack): Promise<void> {
    this.staged = { tripId: pack.manifest.tripId, pack: structuredClone(pack) };
  }

  async activate(tripId: UUID): Promise<void> {
    if (this.staged?.tripId !== tripId) throw new Error("No staged trip pack");
    this.active = this.staged;
    this.staged = null;
  }
}
