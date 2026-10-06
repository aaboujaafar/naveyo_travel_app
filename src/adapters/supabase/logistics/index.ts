import type { LogisticsWaiver, LogisticsWaiversModule, StoredWaiver } from "../../../modules/logistics";
import type { SupabaseClientLike, SupabaseQuery } from "../identity/client";

type Row = Record<string, unknown>;
// Raised before the waivers migration: the table is unknown to Postgres or to PostgREST.
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

export class WaiversUnavailableError extends Error {
  constructor() {
    super("La base de données doit être mise à jour (migration « trip_logistics_waivers ») pour enregistrer « Pas besoin ».");
  }
}

const run = async <T>(request: SupabaseQuery<T>): Promise<T | null> => {
  const { data, error } = await request;
  if (!error) return data;
  if (error.code && MISSING_TABLE_CODES.has(error.code)) throw new WaiversUnavailableError();
  throw new Error(error.message);
};

const MODES = new Set(["friends", "camping", "other"]);

export const createSupabaseLogisticsWaiversModule = (client: SupabaseClientLike): LogisticsWaiversModule => ({
  async list(tripId) {
    const rows = await run(client.from("trip_logistics_waivers").select("id,kind,stop_id,leg_key,mode,address").eq("trip_id", tripId));
    return (Array.isArray(rows) ? rows : []).flatMap((value): StoredWaiver[] => {
      const row = value as Row;
      if (typeof row.id !== "string") return [];
      if (row.kind === "stay" && typeof row.stop_id === "string" && typeof row.mode === "string" && MODES.has(row.mode)) {
        return [{ id: row.id, waiver: { kind: "stay", stopId: row.stop_id, mode: row.mode as "friends" | "camping" | "other", ...(typeof row.address === "string" && row.address.trim() ? { address: row.address.trim() } : {}) } }];
      }
      if (row.kind === "leg" && typeof row.leg_key === "string") return [{ id: row.id, waiver: { kind: "leg", legKey: row.leg_key } }];
      return [];
    });
  },

  async add(tripId, waiver: LogisticsWaiver) {
    await run(client.from("trip_logistics_waivers").insert(waiver.kind === "stay"
      ? { trip_id: tripId, kind: "stay", stop_id: waiver.stopId, mode: waiver.mode, address: waiver.address?.trim() || null }
      : { trip_id: tripId, kind: "leg", leg_key: waiver.legKey }));
  },

  async remove(tripId, id) {
    const table = client.from("trip_logistics_waivers");
    if (!table.delete) throw new Error("Suppression indisponible.");
    await run(table.delete().eq("trip_id", tripId).eq("id", id));
  },
});
