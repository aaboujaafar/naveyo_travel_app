import type { TripPack, TripPackManifest, UUID } from "../_shared/model";
export type { TripPack, TripPackManifest } from "../_shared/model";

export const CURRENT_TRIP_PACK_SCHEMA_VERSION = 1;

export interface PersistedFileStatus {
  path: string;
  exists: boolean;
  checksum: string;
}

export interface TripPackFileStore {
  inspect(path: string): Promise<PersistedFileStatus>;
}

export interface StoredTripPack {
  tripId: UUID;
  pack: TripPack;
}

export interface OfflineTripPackStore {
  readActive(tripId: UUID): Promise<StoredTripPack | null>;
  stage(pack: TripPack): Promise<void>;
  activate(tripId: UUID): Promise<void>;
}

export interface OfflineTripPackLoad {
  state: "empty" | "ready" | "incomplete" | "incompatible";
  pack: TripPack | null;
  manifest: TripPackManifest | null;
  reason?: string;
}
