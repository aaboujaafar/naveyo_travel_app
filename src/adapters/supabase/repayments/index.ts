import type { Money, UUID } from "../../../modules/_shared/model";
import type { RecordedRepayment, RepaymentsModule } from "../../../modules/repayments";
import type { SupabaseClientLike, SupabaseQuery } from "../identity/client";

type Row = Record<string, unknown>;
// Raised before the repayments migration: the table is unknown to Postgres or to PostgREST.
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);
const MIGRATION_NEEDED = "Les remboursements arrivent avec la prochaine mise à jour de la base de données (migration « trip_repayments »).";

class RepaymentsDatabaseError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

const run = async <T>(request: SupabaseQuery<T>): Promise<T | null> => {
  const { data, error } = await request;
  if (!error) return data;
  if (error.code && MISSING_TABLE_CODES.has(error.code)) throw new RepaymentsDatabaseError(MIGRATION_NEEDED, error.code);
  if (error.code === "42501") throw new RepaymentsDatabaseError("Seuls les deux Membres concernés peuvent enregistrer ou annuler ce remboursement.", error.code);
  throw new RepaymentsDatabaseError(error.message, error.code);
};

export const createSupabaseRepaymentsModule = (client: SupabaseClientLike): RepaymentsModule => ({
  async list(tripId) {
    const rows = await run(client.from("trip_repayments").select("id,trip_id,from_account_id,to_account_id,minor_units,currency,recorded_by,created_at").eq("trip_id", tripId).order("created_at", { ascending: true }));
    return (Array.isArray(rows) ? rows : []).flatMap((value): RecordedRepayment[] => {
      const row = value as Row;
      const minorUnits = Number(row.minor_units);
      if (typeof row.id !== "string" || typeof row.from_account_id !== "string" || typeof row.to_account_id !== "string" || !Number.isInteger(minorUnits) || minorUnits <= 0) return [];
      return [{
        id: row.id as UUID,
        tripId: String(row.trip_id) as UUID,
        from: row.from_account_id as UUID,
        to: row.to_account_id as UUID,
        amount: { minorUnits, currency: String(row.currency) as Money["currency"] },
        recordedBy: String(row.recorded_by) as UUID,
        createdAt: String(row.created_at),
      }];
    });
  },

  async record({ tripId, from, to, amount }) {
    if (amount.minorUnits <= 0 || from === to) throw new Error("Remboursement invalide.");
    await run(client.from("trip_repayments").insert({ trip_id: tripId, from_account_id: from, to_account_id: to, minor_units: amount.minorUnits, currency: amount.currency }));
  },

  async remove(tripId, repaymentId) {
    const table = client.from("trip_repayments");
    if (!table.delete) throw new Error("Annulation indisponible.");
    await run(table.delete().eq("trip_id", tripId).eq("id", repaymentId));
  },
});
