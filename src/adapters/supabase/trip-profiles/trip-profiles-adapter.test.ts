import { describe, expect, it } from "vitest";
import { createSupabaseTripProfilesModule } from ".";
import type { SupabaseQuery, SupabaseResponse } from "../identity/client";
import type { UUID } from "../../../modules/_shared/model";

const tripId = "10000000-0000-4000-8000-000000000001" as UUID;
type Call = { table: string; op: string; columns?: string; values?: unknown; filters: [string, string][] };

function fakeClient(respond: (call: Call) => SupabaseResponse, userId = "a1") {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, op: "select", filters: [] };
    calls.push(call);
    const chain: SupabaseQuery = {
      then: (resolve, reject) => Promise.resolve(respond(call)).then(resolve, reject),
      select: (columns) => { call.columns = columns; return chain; },
      insert: () => chain,
      update: (values) => { call.op = "update"; call.values = values; return chain; },
      eq: (column, value) => { call.filters.push([column, value]); return chain; },
      order: () => chain,
      single: () => chain,
    };
    return chain;
  };
  const auth = { getUser: async () => ({ data: { user: { id: userId } }, error: null }) };
  return { client: { auth, from } as never, calls };
}

describe("Supabase trip profiles adapter", () => {
  it("reads the members with the names the database shares", async () => {
    const { client } = fakeClient(() => ({
      data: [
        { account_id: "a1", role: "owner", account: { display_name: " Ayoub " } },
        { account_id: "a2", role: "editor", account: null },
      ],
      error: null,
    }));
    expect(await createSupabaseTripProfilesModule(client).listMembers(tripId)).toEqual([
      { accountId: "a1", role: "owner", displayName: "Ayoub" },
      { accountId: "a2", role: "editor" },
    ]);
  });

  it("treats a database without the party columns as « no details »", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "column trips.party_stroller does not exist", code: "42703" } }));
    const profiles = createSupabaseTripProfilesModule(client);
    expect(await profiles.getParty(tripId)).toBeNull();
    await expect(profiles.saveParty(tripId, { childrenAges: [3], stroller: true, reducedMobility: false })).rejects.toThrow("migration « trip_profiles »");
  });

  it("saves a normalized party and renames only the current account", async () => {
    const { client, calls } = fakeClient(() => ({ data: null, error: null }));
    const profiles = createSupabaseTripProfilesModule(client);
    await profiles.saveParty(tripId, { childrenAges: [5, 30], stroller: false, reducedMobility: true });
    await profiles.updateMyDisplayName("  Ayoub ");
    expect(calls).toEqual([
      { table: "trips", op: "update", values: { party_children_ages: [5], party_stroller: false, party_reduced_mobility: true }, filters: [["id", tripId]] },
      { table: "accounts", op: "update", values: { display_name: "Ayoub" }, filters: [["id", "a1"]] },
    ]);
  });
});
