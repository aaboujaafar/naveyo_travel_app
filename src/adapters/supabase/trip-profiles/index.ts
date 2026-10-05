import type { UUID } from "../../../modules/_shared/model";
import {
  normalizeParty,
  type MemberProfile,
  type TripProfilesModule,
} from "../../../modules/trip-profiles";
import type { SupabaseClientLike, SupabaseQuery } from "../identity/client";

type Row = Record<string, unknown>;
// Raised by Postgres when a column does not exist: the profiles migration is not applied yet.
const UNDEFINED_COLUMN = "42703";

class ProfilesDatabaseError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

const run = async <T>(request: SupabaseQuery<T>): Promise<T | null> => {
  const { data, error } = await request;
  if (error) throw new ProfilesDatabaseError(error.message, error.code);
  return data;
};

const asRow = (value: unknown): Row | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null;

export const createSupabaseTripProfilesModule = (client: SupabaseClientLike): TripProfilesModule => {
  const currentAccountId = async (): Promise<UUID | null> => {
    const { data } = await client.auth.getUser();
    return (data?.user?.id as UUID | undefined) ?? null;
  };

  return {
    async listMembers(tripId) {
      const rows = await run(client.from("trip_members").select("account_id,role,account:accounts(display_name)").eq("trip_id", tripId));
      return (Array.isArray(rows) ? rows : []).flatMap((value): MemberProfile[] => {
        const row = asRow(value);
        if (!row || typeof row.account_id !== "string" || (row.role !== "owner" && row.role !== "editor")) return [];
        // Without the co-member policy, Postgres hides other accounts and the join is null.
        const name = asRow(row.account)?.display_name;
        return [{ accountId: row.account_id as UUID, role: row.role, ...(typeof name === "string" && name.trim() ? { displayName: name.trim() } : {}) }];
      });
    },

    async getParty(tripId) {
      try {
        const row = asRow(await run(client.from("trips").select("party_children_ages,party_stroller,party_reduced_mobility").eq("id", tripId).single()));
        if (!row) return null;
        const ages = Array.isArray(row.party_children_ages) ? row.party_children_ages.filter((age): age is number => typeof age === "number") : [];
        return normalizeParty({ childrenAges: ages, stroller: row.party_stroller === true, reducedMobility: row.party_reduced_mobility === true });
      } catch (error) {
        if (error instanceof ProfilesDatabaseError && error.code === UNDEFINED_COLUMN) return null;
        throw error;
      }
    },

    async saveParty(tripId, party) {
      const normalized = normalizeParty(party);
      try {
        await run(client.from("trips").update({
          party_children_ages: normalized.childrenAges,
          party_stroller: normalized.stroller,
          party_reduced_mobility: normalized.reducedMobility,
        }).eq("id", tripId));
      } catch (error) {
        if (error instanceof ProfilesDatabaseError && error.code === UNDEFINED_COLUMN) {
          throw new Error("La base de données doit être mise à jour (migration « trip_profiles ») avant d’enregistrer les voyageurs.");
        }
        throw error;
      }
    },

    async myProfile() {
      const accountId = await currentAccountId();
      if (!accountId) return null;
      const row = asRow(await run(client.from("accounts").select("display_name").eq("id", accountId).single()).catch(() => null));
      const name = row?.display_name;
      return { accountId, ...(typeof name === "string" && name.trim() ? { displayName: name.trim() } : {}) };
    },

    async updateMyDisplayName(displayName) {
      const name = displayName.trim();
      if (name.length < 1 || name.length > 120) throw new Error("Le prénom doit faire entre 1 et 120 caractères.");
      const accountId = await currentAccountId();
      if (!accountId) throw new Error("Session expirée : reconnectez-vous.");
      await run(client.from("accounts").update({ display_name: name }).eq("id", accountId));
    },
  };
};
