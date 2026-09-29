import { AuthorizationError } from "../trips";
import type { ISODateTime, UUID } from "../_shared/model";
import { createUuid } from "../_shared/uuid";
import { isUuid } from "../_shared/validation";
import type { PackingListModule, PackingListStore } from "./interface";
import type {
  AddPackingItemInput,
  PackingCategory,
  PackingItem,
  PackingProgress,
  UpdatePackingItemInput,
} from "./model";

const categories: readonly PackingCategory[] = [
  "documents",
  "clothing",
  "toiletries",
  "electronics",
  "health",
  "other",
];

const maxLabelLength = 160;

const assertTripId = (tripId: UUID): void => {
  if (!isUuid(tripId)) throw new Error("Invalid trip id");
};

const assertUuid = (value: UUID, name: string): void => {
  if (!isUuid(value)) throw new Error(`Invalid ${name}`);
};

const assertLabel = (label: string): string => {
  const normalized = label.trim();
  if (normalized.length === 0) throw new Error("Packing item label is required");
  if (normalized.length > maxLabelLength)
    throw new Error("Packing item label is too long");
  return normalized;
};

const assertCategory = (category: PackingCategory): void => {
  if (!categories.includes(category)) throw new Error("Invalid packing category");
};

const assertQuantity = (quantity: number): void => {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
    throw new Error("Packing item quantity must be an integer from 1 to 99");
};

const now = (): ISODateTime => new Date().toISOString() as ISODateTime;

const compareItems = (left: PackingItem, right: PackingItem): number => {
  if (left.packed !== right.packed) return left.packed ? 1 : -1;
  const categoryDifference = categories.indexOf(left.category) - categories.indexOf(right.category);
  if (categoryDifference !== 0) return categoryDifference;
  return left.label.localeCompare(right.label);
};

export class PackingList implements PackingListModule {
  constructor(private readonly store: PackingListStore) {}

  async list(tripId: UUID): Promise<PackingItem[]> {
    assertTripId(tripId);
    return stableSort(await this.store.list(tripId));
  }

  async add(input: AddPackingItemInput): Promise<PackingItem> {
    assertTripId(input.tripId);
    const label = assertLabel(input.label);
    assertCategory(input.category);
    const quantity = input.quantity ?? 1;
    assertQuantity(quantity);
    await this.assertAssociations(input.tripId, input.stopId, input.assignedTo);

    const createdAt = now();
    const item: PackingItem = {
      id: createUuid(),
      tripId: input.tripId,
      stopId: input.stopId,
      label,
      category: input.category,
      quantity,
      packed: false,
      assignedTo: input.assignedTo,
      createdAt,
      updatedAt: createdAt,
    };
    return this.store.save(item);
  }

  async update(
    tripId: UUID,
    itemId: UUID,
    changes: UpdatePackingItemInput,
  ): Promise<PackingItem> {
    assertTripId(tripId);
    assertUuid(itemId, "packing item id");
    const item = (await this.store.list(tripId)).find(
      (candidate) => candidate.id === itemId,
    );
    if (!item)
      throw new AuthorizationError("Packing item is not available for this trip");

    const label = changes.label === undefined ? item.label : assertLabel(changes.label);
    const category = changes.category ?? item.category;
    assertCategory(category);
    const quantity = changes.quantity ?? item.quantity;
    assertQuantity(quantity);
    const stopId = changes.stopId === null ? undefined : changes.stopId ?? item.stopId;
    const assignedTo = changes.assignedTo === null ? undefined : changes.assignedTo ?? item.assignedTo;
    await this.assertAssociations(tripId, stopId, assignedTo);

    return this.store.update({
      ...item,
      stopId,
      label,
      category,
      quantity,
      packed: changes.packed ?? item.packed,
      assignedTo,
      updatedAt: now(),
    });
  }

  async remove(tripId: UUID, itemId: UUID): Promise<void> {
    assertTripId(tripId);
    assertUuid(itemId, "packing item id");
    const item = (await this.store.list(tripId)).find(
      (candidate) => candidate.id === itemId,
    );
    if (!item)
      throw new AuthorizationError("Packing item is not available for this trip");
    await this.store.remove(tripId, itemId);
  }

  progress(items: readonly PackingItem[]): PackingProgress {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    const packed = items.reduce(
      (sum, item) => sum + (item.packed ? item.quantity : 0),
      0,
    );
    return { packed, total, ratio: total === 0 ? 0 : packed / total };
  }

  private async assertAssociations(
    tripId: UUID,
    stopId: UUID | undefined,
    assignedTo: UUID | undefined,
  ): Promise<void> {
    if (stopId !== undefined) {
      assertUuid(stopId, "stop id");
      if (this.store.hasStop && !(await this.store.hasStop(tripId, stopId)))
        throw new Error("Packing item stop does not belong to this trip");
    }
    if (assignedTo !== undefined) assertUuid(assignedTo, "assignee");
  }
}

function stableSort(items: PackingItem[]): PackingItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => compareItems(left.item, right.item) || left.index - right.index)
    .map(({ item }) => item);
}

export { maxLabelLength };
