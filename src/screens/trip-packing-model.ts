import type { PackingCategory, PackingItem, PackingProgress } from "../modules/packing-list";

export type PackingStatusFilter = "all" | "to-pack" | "packed";
export type PackingCategoryFilter = PackingCategory | "all";

export const packingCategories: readonly PackingCategory[] = [
  "documents",
  "clothing",
  "toiletries",
  "electronics",
  "health",
  "other",
];

export const packingCategoryLabels: Record<PackingCategory, string> = {
  documents: "Documents",
  clothing: "Vêtements",
  toiletries: "Toilette",
  electronics: "Électronique",
  health: "Santé",
  other: "Autre",
};

export const packingStatusLabels: Record<PackingStatusFilter, string> = {
  all: "Tous",
  "to-pack": "À préparer",
  packed: "Prêts",
};

export function labelPackingCategory(category: PackingCategory): string {
  return packingCategoryLabels[category];
}

export function filterPackingItems(
  items: readonly PackingItem[],
  status: PackingStatusFilter = "all",
  category: PackingCategoryFilter = "all",
): PackingItem[] {
  return items.filter((item) => {
    const matchesStatus =
      status === "all" || (status === "packed" ? item.packed : !item.packed);
    const matchesCategory = category === "all" || item.category === category;
    return matchesStatus && matchesCategory;
  });
}

export function sortPackingItems(items: readonly PackingItem[]): PackingItem[] {
  return [...items].sort((left, right) => {
    if (left.packed !== right.packed) return left.packed ? 1 : -1;
    const categoryOrder = packingCategories.indexOf(left.category) - packingCategories.indexOf(right.category);
    if (categoryOrder !== 0) return categoryOrder;
    return left.label.localeCompare(right.label, "fr", { sensitivity: "base" });
  });
}

export function derivePackingProgress(items: readonly PackingItem[]): PackingProgress {
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  const packed = items.reduce(
    (sum, item) => sum + (item.packed ? item.quantity : 0),
    0,
  );
  return { packed, total, ratio: total === 0 ? 0 : packed / total };
}

export function formatPackingProgress(progress: PackingProgress): string {
  return progress.total === 0
    ? "Aucun élément"
    : `${progress.packed}/${progress.total} prêt${progress.packed > 1 ? "s" : ""}`;
}
