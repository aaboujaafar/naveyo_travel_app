import { describe, expect, it } from "vitest";
import { createSupabaseLogisticsWaiversModule, WaiversUnavailableError } from ".";
import type { SupabaseQuery, SupabaseResponse } from "../identity/client";

type Call = { table: string; op: string; values?: unknown };
function fakeClient(respond: (call: Call) => SupabaseResponse) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, op: "select" };
    calls.push(call);
    const chain: SupabaseQuery = {
      then: (resolve, reject) => Promise.resolve(respond(call)).then(resolve, reject),
      select: () => chain,
      insert: (values) => { call.op = "insert"; call.values = values; return chain; },
      update: () => chain,
      delete: () => { call.op = "delete"; return chain; },
      eq: () => chain,
      order: () => chain,
      single: () => chain,
    };
    return chain;
  };
  return { client: { from } as never, calls };
}

describe("Supabase logistics waivers adapter", () => {
  it("reads stay and journey waivers, skipping invalid rows", async () => {
    const { client } = fakeClient(() => ({ data: [
      { id: "w1", kind: "stay", stop_id: "s1", mode: "friends", address: " Rua A 1 " },
      { id: "w2", kind: "leg", leg_key: "leg:between:lisbonne>porto:2026-11-19" },
      { id: "w3", kind: "stay", stop_id: "s1", mode: "hotel" },
    ], error: null }));
    expect(await createSupabaseLogisticsWaiversModule(client).list("t")).toEqual([
      { id: "w1", waiver: { kind: "stay", stopId: "s1", mode: "friends", address: "Rua A 1" } },
      { id: "w2", waiver: { kind: "leg", legKey: "leg:between:lisbonne>porto:2026-11-19" } },
    ]);
  });

  it("stores a waiver and reports a missing migration", async () => {
    const { client, calls } = fakeClient(() => ({ data: null, error: null }));
    await createSupabaseLogisticsWaiversModule(client).add("t", { kind: "stay", stopId: "s1", mode: "camping" });
    expect(calls[0]).toMatchObject({ op: "insert", values: { trip_id: "t", kind: "stay", stop_id: "s1", mode: "camping", address: null } });
    const missing = fakeClient(() => ({ data: null, error: { message: "missing", code: "PGRST205" } }));
    await expect(createSupabaseLogisticsWaiversModule(missing.client).list("t")).rejects.toBeInstanceOf(WaiversUnavailableError);
  });
});
