import { describe, expect, it } from "vitest";
import { uuid } from "../_shared/fake";
import type { PackingItem } from "./model";
import { InMemoryPackingListStore } from "./in-memory";
import { PackingList } from "./module";

const tripId = uuid("00000000-0000-4000-8000-000000000001");
const otherTripId = uuid("00000000-0000-4000-8000-000000000002");
const stopId = uuid("00000000-0000-4000-8000-000000000101");
const assigneeId = uuid("00000000-0000-4000-8000-000000000201");

const item = (overrides: Partial<PackingItem> = {}): PackingItem => ({
  id: uuid("00000000-0000-4000-8000-000000000301"),
  tripId,
  label: "Passport",
  category: "documents",
  quantity: 1,
  packed: false,
  createdAt: "2026-08-17T09:00:00Z" as PackingItem["createdAt"],
  updatedAt: "2026-08-17T09:00:00Z" as PackingItem["updatedAt"],
  ...overrides,
});

describe("packing list module", () => {
  it("adds validated items with generated and preserved metadata", async () => {
    const module = new PackingList(new InMemoryPackingListStore());
    const added = await module.add({
      tripId,
      label: "  Passport  ",
      category: "documents",
      quantity: 2,
      stopId,
      assignedTo: assigneeId,
    });

    expect(added).toMatchObject({
      tripId,
      label: "Passport",
      quantity: 2,
      packed: false,
      stopId,
      assignedTo: assigneeId,
    });
    expect(added.id).toMatch(/[0-9a-f-]{36}/i);
    expect(added.createdAt).toBe(added.updatedAt);
  });

  it("validates fields and an optional stop association", async () => {
    const store = new InMemoryPackingListStore();
    store.hasStop = async (candidateTripId, candidateStopId) =>
      candidateTripId === tripId && candidateStopId === stopId;
    const module = new PackingList(store);

    await expect(module.add({ tripId, label: " ", category: "other" })).rejects.toThrow("label");
    await expect(module.add({ tripId, label: "Bag", category: "other", quantity: 100 })).rejects.toThrow("quantity");
    await expect(module.add({ tripId, label: "Bag", category: "other", stopId: uuid("00000000-0000-4000-8000-000000000102") })).rejects.toThrow("does not belong");
  });

  it("sorts stably by packed state, category, then label", async () => {
    const store = new InMemoryPackingListStore([
      item({ id: uuid("00000000-0000-4000-8000-000000000304"), label: "Adapter", category: "electronics" }),
      item({ id: uuid("00000000-0000-4000-8000-000000000305"), label: "Belt", category: "clothing" }),
      item({ id: uuid("00000000-0000-4000-8000-000000000306"), label: "Adapter", category: "electronics" }),
      item({ id: uuid("00000000-0000-4000-8000-000000000307"), label: "Boarding pass", category: "documents", packed: true }),
    ]);
    const result = await new PackingList(store).list(tripId);
    expect(result.map(({ label, packed }) => `${label}:${packed}`)).toEqual([
      "Belt:false",
      "Adapter:false",
      "Adapter:false",
      "Boarding pass:true",
    ]);
  });

  it("preserves identity and createdAt while updating, and computes progress", async () => {
    const original = item();
    const module = new PackingList(new InMemoryPackingListStore([original]));
    const updated = await module.update(tripId, original.id, {
      label: "Updated passport",
      packed: true,
      stopId: null,
    });

    expect(updated.id).toBe(original.id);
    expect(updated.tripId).toBe(original.tripId);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt).not.toBe(original.updatedAt);
    expect(module.progress([updated, item({ packed: false, quantity: 3 })])).toEqual({ packed: 1, total: 4, ratio: 0.25 });
  });

  it("rejects missing items and items belonging to another trip", async () => {
    const foreign = item({ tripId: otherTripId });
    const module = new PackingList(new InMemoryPackingListStore([foreign]));

    await expect(module.update(tripId, foreign.id, { packed: true })).rejects.toThrow("not available");
    await expect(module.remove(tripId, foreign.id)).rejects.toThrow("not available");
  });
});
