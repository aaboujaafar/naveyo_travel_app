import type {
  PersistedFileStatus,
  TripPackFileStore,
} from "../../modules/offline-trip-pack";

export class InMemoryTripPackFileStore implements TripPackFileStore {
  private readonly entries = new Map<string, string>();

  put(path: string, checksum: string): void {
    this.entries.set(path, checksum);
  }
  remove(path: string): void {
    this.entries.delete(path);
  }

  async inspect(path: string): Promise<PersistedFileStatus> {
    const checksum = this.entries.get(path);
    return { path, exists: checksum !== undefined, checksum: checksum ?? "" };
  }
}
