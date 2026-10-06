import { describe, expect, it } from "vitest";
import { createSupabaseTripChecksModule } from ".";
import type { SupabaseQuery, SupabaseResponse } from "../identity/client";

function fakeClient(respond: () => SupabaseResponse) {
  const calls: { op: string; values?: unknown; filters: [string, string][] }[] = [];
  const from = () => {
    const call: (typeof calls)[number] = { op: "select", filters: [] };
    calls.push(call);
    const chain: SupabaseQuery = {
      then: (resolve, reject) => Promise.resolve(respond()).then(resolve, reject),
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
  return { client: { from } as never, calls };
}

describe("Supabase trip checks adapter", () => {
  it("lists, checks and unchecks shared tasks", async () => {
    const { client, calls } = fakeClient(() => ({ data: [{ key: "formality:US:FR:eta" }], error: null }));
    const checks = createSupabaseTripChecksModule(client);
    expect([...(await checks.list("t"))]).toEqual(["formality:US:FR:eta"]);
    await checks.set("t", "k", true);
    await checks.set("t", "k", false);
    expect(calls.slice(1).map((call) => [call.op, call.values ?? call.filters])).toEqual([
      ["insert", { trip_id: "t", key: "k" }],
      ["delete", [["trip_id", "t"], ["key", "k"]]],
    ]);
  });

  it("explains a missing migration", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "missing", code: "PGRST205" } }));
    await expect(createSupabaseTripChecksModule(client).list("t")).rejects.toThrow("migration « trip_checks »");
  });
});
