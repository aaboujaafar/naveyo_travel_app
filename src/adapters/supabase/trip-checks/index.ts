import type { TripChecksModule } from "../../../modules/trip-checks";
import type { SupabaseClientLike, SupabaseQuery } from "../identity/client";

// Raised before the checks migration: the table is unknown to Postgres or to PostgREST.
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

const run = async <T>(request: SupabaseQuery<T>): Promise<T | null> => {
  const { data, error } = await request;
  if (!error) return data;
  if (error.code && MISSING_TABLE_CODES.has(error.code)) {
    throw new Error("La base de données doit être mise à jour (migration « trip_checks ») pour cocher les tâches.");
  }
  throw new Error(error.message);
};

export const createSupabaseTripChecksModule = (client: SupabaseClientLike): TripChecksModule => ({
  async list(tripId) {
    const rows = await run(client.from("trip_checks").select("key").eq("trip_id", tripId));
    return new Set((Array.isArray(rows) ? rows : []).flatMap((row) => (typeof (row as { key?: unknown }).key === "string" ? [(row as { key: string }).key] : [])));
  },

  async set(tripId, key, checked) {
    if (checked) {
      await run(client.from("trip_checks").insert({ trip_id: tripId, key }));
      return;
    }
    const table = client.from("trip_checks");
    if (!table.delete) throw new Error("Indisponible.");
    await run(table.delete().eq("trip_id", tripId).eq("key", key));
  },
});
