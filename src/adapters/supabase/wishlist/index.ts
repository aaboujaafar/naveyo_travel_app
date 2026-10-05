import type { UUID } from "../../../modules/_shared/model";
import { parsePlaceCandidate } from "../../../modules/_shared/validation";
import type { Wish, WishlistModule } from "../../../modules/wishlist";
import type { SupabaseClientLike, SupabaseQuery } from "../identity/client";

type Row = Record<string, unknown>;
// Raised before the wish list migration: the tables are unknown to Postgres or to PostgREST.
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);
const MIGRATION_NEEDED = "La liste d’envies arrive avec la prochaine mise à jour de la base de données (migration « trip_wishes »).";

class WishlistDatabaseError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

const run = async <T>(request: SupabaseQuery<T>): Promise<T | null> => {
  const { data, error } = await request;
  if (!error) return data;
  if (error.code && MISSING_TABLE_CODES.has(error.code)) throw new WishlistDatabaseError(MIGRATION_NEEDED, error.code);
  throw new WishlistDatabaseError(error.message, error.code);
};

const asRows = (value: unknown): Row[] =>
  Array.isArray(value) ? value.filter((row): row is Row => Boolean(row) && typeof row === "object") : [];

export const createSupabaseWishlistModule = (client: SupabaseClientLike): WishlistModule => ({
  async list(tripId) {
    const rows = asRows(await run(
      client
        .from("trip_wishes")
        .select("id,trip_id,stop_id,place,added_by,created_at,votes:trip_wish_votes(account_id,vote)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true }),
    ));
    return rows.flatMap((row): Wish[] => {
      try {
        const votes = asRows(row.votes).flatMap((vote) =>
          typeof vote.account_id === "string" && (vote.vote === 1 || vote.vote === -1)
            ? [{ accountId: vote.account_id as UUID, vote: vote.vote as 1 | -1 }]
            : [],
        );
        return [{
          id: String(row.id) as UUID,
          tripId: String(row.trip_id) as UUID,
          ...(typeof row.stop_id === "string" ? { stopId: row.stop_id as UUID } : {}),
          place: parsePlaceCandidate(row.place),
          addedBy: String(row.added_by) as UUID,
          createdAt: String(row.created_at),
          votes,
        }];
      } catch {
        // A wish whose snapshot no longer validates is skipped rather than breaking the list.
        return [];
      }
    });
  },

  async add({ tripId, stopId, place }) {
    await run(client.from("trip_wishes").insert({ trip_id: tripId, stop_id: stopId ?? null, place: parsePlaceCandidate(place) }));
  },

  async remove(tripId, wishId) {
    const table = client.from("trip_wishes");
    if (!table.delete) throw new Error("Suppression indisponible.");
    await run(table.delete().eq("trip_id", tripId).eq("id", wishId));
  },

  async vote(wishId, vote) {
    const { data } = await client.auth.getUser();
    const accountId = data?.user?.id;
    if (!accountId) throw new Error("Session expirée : reconnectez-vous.");
    // One vote per member: the previous one is withdrawn before the new one is cast.
    const votes = client.from("trip_wish_votes");
    if (!votes.delete) throw new Error("Vote indisponible.");
    await run(votes.delete().eq("wish_id", wishId).eq("account_id", accountId));
    if (vote !== 0) await run(client.from("trip_wish_votes").insert({ wish_id: wishId, account_id: accountId, vote }));
  },
});
