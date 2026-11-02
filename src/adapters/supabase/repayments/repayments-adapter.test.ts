import { describe, expect, it } from "vitest";
import { createSupabaseRepaymentsModule } from ".";
import type { SupabaseQuery, SupabaseResponse } from "../identity/client";
import type { Money, UUID } from "../../../modules/_shared/model";

const tripId = "10000000-0000-4000-8000-000000000001" as UUID;
type Call = { table: string; op: string; values?: unknown; filters: [string, string][] };

function fakeClient(respond: (call: Call) => SupabaseResponse) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, op: "select", filters: [] };
    calls.push(call);
    const chain: SupabaseQuery = {
      then: (resolve, reject) => Promise.resolve(respond(call)).then(resolve, reject),
      select: () => chain,
      insert: (values) => { call.op = "insert"; call.values = values; return chain; },
      update: () => chain,
      delete: () => { call.op = "delete"; return chain; },
      eq: (column, value) => { call.filters.push([column, value]); return chain; },
      order: () => chain,
      single: () => chain,
    };
    return chain;
  };
  return { client: { auth: { getUser: async () => ({ data: { user: { id: "a1" } }, error: null }) }, from } as never, calls };
}

describe("Supabase repayments adapter", () => {
  it("lists valid repayments", async () => {
    const { client } = fakeClient(() => ({
      data: [
        { id: "r1", trip_id: tripId, from_account_id: "a2", to_account_id: "a1", minor_units: 4000, currency: "EUR", recorded_by: "a2", created_at: "2026-11-20T10:00:00Z" },
        { id: "r2", trip_id: tripId, from_account_id: "a2", to_account_id: "a1", minor_units: 0, currency: "EUR", recorded_by: "a2", created_at: "2026-11-20T10:00:00Z" },
      ],
      error: null,
    }));
    expect(await createSupabaseRepaymentsModule(client).list(tripId)).toEqual([
      { id: "r1", tripId, from: "a2", to: "a1", amount: { minorUnits: 4000, currency: "EUR" }, recordedBy: "a2", createdAt: "2026-11-20T10:00:00Z" },
    ]);
  });

  it("records a transfer and explains a missing migration", async () => {
    const { client, calls } = fakeClient(() => ({ data: null, error: null }));
    await createSupabaseRepaymentsModule(client).record({ tripId, from: "a2" as UUID, to: "a1" as UUID, amount: { minorUnits: 1000, currency: "EUR" as Money["currency"] } });
    expect(calls[0]).toMatchObject({ table: "trip_repayments", op: "insert", values: { trip_id: tripId, from_account_id: "a2", to_account_id: "a1", minor_units: 1000, currency: "EUR" } });
    const missing = fakeClient(() => ({ data: null, error: { message: "Could not find the table", code: "PGRST205" } }));
    await expect(createSupabaseRepaymentsModule(missing.client).list(tripId)).rejects.toThrow("migration « trip_repayments »");
  });
});
