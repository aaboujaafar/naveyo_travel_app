import type { UUID } from "../_shared/model";
import type { PackingItem } from "./model";
import type { PackingListStore } from "./interface";

export class InMemoryPackingListStore implements PackingListStore {
  private items: PackingItem[];
  hasStop?: PackingListStore["hasStop"];

  constructor(initialItems: PackingItem[] = []) {
    this.items = structuredClone(initialItems);
  }

  async list(tripId: UUID): Promise<PackingItem[]> {
    return structuredClone(this.items.filter((item) => item.tripId === tripId));
  }

  async save(item: PackingItem): Promise<PackingItem> {
    if (this.items.some((existing) => existing.id === item.id))
      throw new Error("Packing item already exists");
    this.items = [...this.items, structuredClone(item)];
    return structuredClone(item);
  }

  async update(item: PackingItem): Promise<PackingItem> {
    const index = this.items.findIndex(
      (existing) => existing.id === item.id && existing.tripId === item.tripId,
    );
    if (index < 0) throw new Error("Packing item does not exist");
    this.items = this.items.map((existing, currentIndex) =>
      currentIndex === index ? structuredClone(item) : existing,
    );
    return structuredClone(item);
  }

  async remove(tripId: UUID, itemId: UUID): Promise<void> {
    const index = this.items.findIndex(
      (item) => item.tripId === tripId && item.id === itemId,
    );
    if (index < 0) throw new Error("Packing item does not exist");
    this.items = this.items.filter((_, currentIndex) => currentIndex !== index);
  }
}
