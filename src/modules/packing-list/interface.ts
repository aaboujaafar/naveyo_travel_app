import type { UUID } from "../_shared/model";
import type {
  AddPackingItemInput,
  PackingItem,
  PackingProgress,
  UpdatePackingItemInput,
} from "./model";

export interface PackingListStore {
  list(tripId: UUID): Promise<PackingItem[]>;
  save(item: PackingItem): Promise<PackingItem>;
  update(item: PackingItem): Promise<PackingItem>;
  remove(tripId: UUID, itemId: UUID): Promise<void>;
  hasStop?(tripId: UUID, stopId: UUID): Promise<boolean>;
}

/** Collaborative packing list for one Voyage. */
export interface PackingListModule {
  list(tripId: UUID): Promise<PackingItem[]>;
  add(input: AddPackingItemInput): Promise<PackingItem>;
  update(
    tripId: UUID,
    itemId: UUID,
    changes: UpdatePackingItemInput,
  ): Promise<PackingItem>;
  remove(tripId: UUID, itemId: UUID): Promise<void>;
  progress(items: readonly PackingItem[]): PackingProgress;
}
