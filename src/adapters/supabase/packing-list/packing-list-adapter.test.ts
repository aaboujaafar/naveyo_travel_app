import { describe, expect, it, vi } from "vitest";
import { createSupabasePackingListModule } from ".";
import type {
  SupabaseQuery,
  SupabaseResponse,
} from "../identity/client";
import type { ISODateTime, UUID } from "../../../modules/_shared/model";

const tripId = "10000000-0000-4000-8000-000000000001" as UUID;
const stopId = "20000000-0000-4000-8000-000000000002" as UUID;
const itemId = "30000000-0000-4000-8000-000000000003" as UUID;
const row = {
  id: itemId,
  trip_id: tripId,
  stop_id: stopId,
  label: "Passeports",
  category: "documents",
  quantity: 2,
  packed: false,
  assigned_to: null,
  created_at: "2026-08-17T10:00:00.000Z",
  updated_at: "2026-08-17T10:00:00.000Z",
};

const request = <T>(response: SupabaseResponse<T>): SupabaseQuery<T> => ({
  then: (resolve) => Promise.resolve(response).then(resolve),
  select: () => request(response),
  insert: () => request(response),
  update: () => request(response),
  delete: () => request(response),
  eq: () => request(response),
  order: () => request(response),
  single: () => request(response),
});

describe("PCK-101 Supabase packing-list adapter", () => {
  it("maps packing_items through the Module interface", async () => {
    const from = vi.fn((table: string) =>
      table === "packing_items"
        ? request({ data: [row], error: null })
        : request({ data: [{ id: stopId }], error: null }),
    );
    const module = createSupabasePackingListModule({ auth: {}, from } as never);

    await expect(module.list(tripId)).resolves.toEqual([
      {
        id: itemId,
        tripId,
        stopId,
        label: "Passeports",
        category: "documents",
        quantity: 2,
        packed: false,
        assignedTo: undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    ]);
  });

  it("persists add and update payloads using the table column names", async () => {
    const insert = vi.fn(() => request({ data: row, error: null }));
    const update = vi.fn(() => request({ data: { ...row, packed: true }, error: null }));
    const from = vi.fn((table: string) => {
      if (table === "packing_items")
        return {
          ...request({ data: [row], error: null }),
          insert,
          update,
        };
      return request({ data: [{ id: stopId }], error: null });
    });
    const module = createSupabasePackingListModule({ auth: {}, from } as never);

    await expect(
      module.add({ tripId, stopId, label: " Passeports ", category: "documents" }),
    ).resolves.toMatchObject({ label: "Passeports", quantity: 2 });
    await expect(module.update(tripId, itemId, { packed: true })).resolves.toMatchObject({
      packed: true,
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      trip_id: tripId,
      stop_id: stopId,
      label: "Passeports",
      quantity: 1,
      packed: false,
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ packed: true }));
  });

  it("translates RLS authorization errors", async () => {
    const from = vi.fn(() =>
      request({ data: null, error: { code: "42501", message: "permission denied" } }),
    );
    const module = createSupabasePackingListModule({ auth: {}, from } as never);

    await expect(module.list(tripId)).rejects.toThrow("not available");
  });

  it("computes progress from quantities", () => {
    const module = createSupabasePackingListModule({ auth: {}, from: vi.fn() } as never);
    expect(module.progress([
      { ...row, id: itemId, tripId, stopId, category: "documents", assignedTo: undefined, createdAt: row.created_at as ISODateTime, updatedAt: row.updated_at as ISODateTime, quantity: 2, packed: true },
      { ...row, id: "40000000-0000-4000-8000-000000000004" as UUID, tripId, stopId: undefined, category: "clothing", assignedTo: undefined, createdAt: row.created_at as ISODateTime, updatedAt: row.updated_at as ISODateTime, quantity: 1, packed: false },
    ])).toEqual({ packed: 2, total: 3, ratio: 2 / 3 });
  });
});
