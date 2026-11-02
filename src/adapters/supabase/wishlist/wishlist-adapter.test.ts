import { describe, expect, it } from "vitest";
import { createSupabaseWishlistModule } from ".";
import type { SupabaseQuery, SupabaseResponse } from "../identity/client";
import type { UUID } from "../../../modules/_shared/model";
import { place } from "../../../modules/__fixtures__/domain";

const tripId = "10000000-0000-4000-8000-000000000001" as UUID;
const wishId = "20000000-0000-4000-8000-000000000002" as UUID;
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
  const auth = { getUser: async () => ({ data: { user: { id: "a1" } }, error: null }) };
  return { client: { auth, from } as never, calls };
}

describe("Supabase wish list adapter", () => {
  it("lists wishes with their votes and skips broken snapshots", async () => {
    const { client } = fakeClient(() => ({
      data: [
        { id: wishId, trip_id: tripId, stop_id: null, place, added_by: "a1", created_at: "2026-10-05T10:00:00Z", votes: [{ account_id: "a2", vote: 1 }] },
        { id: "broken", trip_id: tripId, place: { name: 3 }, added_by: "a1", created_at: "2026-10-05T10:00:00Z", votes: [] },
      ],
      error: null,
    }));
    const wishes = await createSupabaseWishlistModule(client).list(tripId);
    expect(wishes).toHaveLength(1);
    expect(wishes[0]).toMatchObject({ id: wishId, place: { id: place.id }, votes: [{ accountId: "a2", vote: 1 }] });
  });

  it("replaces the member's previous vote, and withdraws it on 0", async () => {
    const { client, calls } = fakeClient(() => ({ data: null, error: null }));
    const wishlist = createSupabaseWishlistModule(client);
    await wishlist.vote(wishId, -1);
    await wishlist.vote(wishId, 0);
    expect(calls.map((call) => [call.table, call.op, call.values ?? null])).toEqual([
      ["trip_wish_votes", "delete", null],
      ["trip_wish_votes", "insert", { wish_id: wishId, account_id: "a1", vote: -1 }],
      ["trip_wish_votes", "delete", null],
    ]);
  });

  it("explains that the database needs the migration", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "Could not find the table 'public.trip_wishes'", code: "PGRST205" } }));
    await expect(createSupabaseWishlistModule(client).list(tripId)).rejects.toThrow("migration « trip_wishes »");
  });
});
