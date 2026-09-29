import { describe, expect, it } from "vitest";
import type { PackingItem } from "../modules/packing-list";
import type { ISODateTime, UUID } from "../modules/_shared/model";
import {
  derivePackingProgress,
  filterPackingItems,
  formatPackingProgress,
  labelPackingCategory,
  sortPackingItems,
} from "./trip-packing-model";

const tripId = "trip-1" as UUID;

function item(id: string, label: string, packed: boolean, category: PackingItem["category"]): PackingItem {
  return {
    id: id as UUID,
    tripId,
    label,
    category,
    quantity: 1,
    packed,
    createdAt: "2026-08-17T10:00:00.000Z" as ISODateTime,
    updatedAt: "2026-08-17T10:00:00.000Z" as ISODateTime,
  };
}

describe("trip packing model", () => {
  it("derives progress from the current items", () => {
    const progress = derivePackingProgress([
      item("a", "Passeport", true, "documents"),
      item("b", "T-shirt", false, "clothing"),
      item("c", "Chargeur", true, "electronics"),
    ]);

    expect(progress).toEqual({ packed: 2, total: 3, ratio: 2 / 3 });
    expect(formatPackingProgress(progress)).toBe("2/3 prêts");
  });

  it("filters by preparation status and category", () => {
    const items = [
      item("a", "Passeport", true, "documents"),
      item("b", "T-shirt", false, "clothing"),
      item("c", "Chargeur", false, "electronics"),
    ];

    expect(filterPackingItems(items, "to-pack").map((entry) => entry.id)).toEqual(["b", "c"]);
    expect(filterPackingItems(items, "all", "documents").map((entry) => entry.id)).toEqual(["a"]);
    expect(filterPackingItems(items, "packed", "clothing")).toEqual([]);
  });

  it("sorts items with unfinished items first, then category and label", () => {
    const items = [
      item("a", "Zeste", false, "clothing"),
      item("b", "Passeport", true, "documents"),
      item("c", "Brosse", false, "toiletries"),
      item("d", "Adaptateur", false, "electronics"),
    ];

    expect(sortPackingItems(items).map((entry) => entry.id)).toEqual(["a", "c", "d", "b"]);
    expect(labelPackingCategory("toiletries")).toBe("Toilette");
  });
});
