import type { UUID } from "../../../modules/_shared/model";
import {
  normalizeParty,
  type CityRef,
  type MemberProfile,
  type TripProfilesModule,
} from "../../../modules/trip-profiles";
import type { SupabaseClientLike, SupabaseQuery } from "../identity/client";

type Row = Record<string, unknown>;
// Raised before the profiles migration: a missing column (Postgres when reading, PostgREST
// when writing), or no privilege on accounts.
const MISSING_COLUMN_CODES = new Set(["42703", "PGRST204"]);
const PERMISSION_DENIED = "42501";
const MIGRATION_NEEDED = "La base de données doit être mise à jour (migration « trip_profiles »).";

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

/** Tries the newest query first, then older ones while the database lacks the newer columns. */
async function firstWorking<T>(attempts: readonly (() => Promise<T>)[]): Promise<T> {
  for (const [index, attempt] of attempts.entries()) {
    try {
      return await attempt();
    } catch (error) {
      const missing = error instanceof ProfilesDatabaseError && MISSING_COLUMN_CODES.has(error.code ?? "");
      if (!missing || index === attempts.length - 1) throw error;
    }
  }
  throw new Error("Aucune requête à essayer.");
}

async function migrationAware<T>(request: Promise<T>, detail: string, migration = "trip_departure"): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ProfilesDatabaseError && (MISSING_COLUMN_CODES.has(error.code ?? "") || error.code === PERMISSION_DENIED)) {
      throw new Error(`La base de données doit être mise à jour (migration « ${migration} »). ${detail}`);
    }
    throw error;
  }
}

function cityFrom(row: Row, prefix: "home" | "departure"): CityRef | null {
  const name = row[`${prefix}_city`];
  const country = row[`${prefix}_country`];
  if (typeof name !== "string" || !name.trim() || typeof country !== "string") return null;
  const latitude = row[`${prefix}_latitude`];
  const longitude = row[`${prefix}_longitude`];
  return {
    name: name.trim(),
    countryCode: country.trim().toUpperCase(),
    ...(typeof latitude === "number" && typeof longitude === "number" ? { coordinates: { latitude, longitude } } : {}),
  };
}

function cityColumns(prefix: "home" | "departure", city: CityRef | null): Row {
  return {
    [`${prefix}_city`]: city?.name.trim() ?? null,
    [`${prefix}_country`]: city?.countryCode.toUpperCase() ?? null,
    [`${prefix}_latitude`]: city?.coordinates?.latitude ?? null,
    [`${prefix}_longitude`]: city?.coordinates?.longitude ?? null,
  };
}

export const createSupabaseTripProfilesModule = (client: SupabaseClientLike): TripProfilesModule => {
  const currentAccountId = async (): Promise<UUID | null> => {
    const { data } = await client.auth.getUser();
    return (data?.user?.id as UUID | undefined) ?? null;
  };

  return {
    async listMembers(tripId) {
      // Without the migration, reading names is refused: the members are still listed, unnamed.
      const rows = await run(client.from("trip_members").select("account_id,role,account:accounts(display_name)").eq("trip_id", tripId))
        .catch((error: unknown) => {
          if (error instanceof ProfilesDatabaseError && error.code === PERMISSION_DENIED) {
            return run(client.from("trip_members").select("account_id,role").eq("trip_id", tripId));
          }
          throw error;
        });
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
        const columns = "party_children_ages,party_stroller,party_reduced_mobility";
        // Adults and nationalities arrive with later migrations: without them, the rest of the party still loads.
        const row = asRow(await firstWorking([
          () => run(client.from("trips").select(`${columns},party_adults,party_nationalities`).eq("id", tripId).single()),
          () => run(client.from("trips").select(`${columns},party_adults`).eq("id", tripId).single()),
          () => run(client.from("trips").select(columns).eq("id", tripId).single()),
        ]));
        if (!row) return null;
        const ages = Array.isArray(row.party_children_ages) ? row.party_children_ages.filter((age): age is number => typeof age === "number") : [];
        return normalizeParty({
          ...(typeof row.party_adults === "number" ? { adults: row.party_adults } : {}),
          ...(Array.isArray(row.party_nationalities) ? { nationalities: row.party_nationalities.filter((code): code is string => typeof code === "string") } : {}),
          childrenAges: ages,
          stroller: row.party_stroller === true,
          reducedMobility: row.party_reduced_mobility === true,
        });
      } catch (error) {
        if (error instanceof ProfilesDatabaseError && MISSING_COLUMN_CODES.has(error.code ?? "")) return null;
        throw error;
      }
    },

    async saveParty(tripId, party) {
      const normalized = normalizeParty(party);
      try {
        const values = {
          party_children_ages: normalized.childrenAges,
          party_stroller: normalized.stroller,
          party_reduced_mobility: normalized.reducedMobility,
        };
        await firstWorking([
          () => run(client.from("trips").update({ ...values, party_adults: normalized.adults ?? null, party_nationalities: normalized.nationalities ?? [] }).eq("id", tripId)),
          () => run(client.from("trips").update({ ...values, party_adults: normalized.adults ?? null }).eq("id", tripId)),
          () => run(client.from("trips").update(values).eq("id", tripId)),
        ]);
      } catch (error) {
        if (error instanceof ProfilesDatabaseError && MISSING_COLUMN_CODES.has(error.code ?? "")) {
          throw new Error(`${MIGRATION_NEEDED} Les voyageurs ne peuvent pas encore être enregistrés.`);
        }
        throw error;
      }
    },

    async myProfile() {
      const accountId = await currentAccountId();
      if (!accountId) return null;
      const home = "display_name,home_city,home_country,home_latitude,home_longitude";
      const row = asRow(await firstWorking([
        () => run(client.from("accounts").select(`${home},nationality`).eq("id", accountId).single()),
        () => run(client.from("accounts").select(home).eq("id", accountId).single()),
        () => run(client.from("accounts").select("display_name").eq("id", accountId).single()),
      ]).catch(() => null));
      const name = row?.display_name;
      const homeCity = row ? cityFrom(row, "home") : null;
      const nationality = typeof row?.nationality === "string" ? row.nationality.trim().toUpperCase() : undefined;
      return {
        accountId,
        ...(typeof name === "string" && name.trim() ? { displayName: name.trim() } : {}),
        ...(homeCity ? { homeCity } : {}),
        ...(nationality ? { nationality } : {}),
      };
    },

    async updateMyNationality(countryCode) {
      const accountId = await currentAccountId();
      if (!accountId) throw new Error("Session expirée : reconnectez-vous.");
      const code = countryCode?.trim().toUpperCase() ?? null;
      if (code !== null && !/^[A-Z]{2}$/.test(code)) throw new Error("Nationalité invalide.");
      await migrationAware(run(client.from("accounts").update({ nationality: code }).eq("id", accountId)), "La nationalité ne peut pas encore être enregistrée.", "nationalities");
    },

    async updateMyHomeCity(city) {
      const accountId = await currentAccountId();
      if (!accountId) throw new Error("Session expirée : reconnectez-vous.");
      await migrationAware(run(client.from("accounts").update(cityColumns("home", city)).eq("id", accountId)), "La ville de départ ne peut pas encore être enregistrée.");
    },

    async getDeparture(tripId) {
      const row = asRow(await run(client.from("trips").select("departure_city,departure_country,departure_latitude,departure_longitude").eq("id", tripId).single()).catch(() => null));
      return row ? cityFrom(row, "departure") : null;
    },

    async saveDeparture(tripId, city) {
      await migrationAware(run(client.from("trips").update(cityColumns("departure", city)).eq("id", tripId)), "La ville de départ du Voyage ne peut pas encore être enregistrée.");
    },

    async updateMyDisplayName(displayName) {
      const name = displayName.trim();
      if (name.length < 1 || name.length > 120) throw new Error("Le prénom doit faire entre 1 et 120 caractères.");
      const accountId = await currentAccountId();
      if (!accountId) throw new Error("Session expirée : reconnectez-vous.");
      try {
        await run(client.from("accounts").update({ display_name: name }).eq("id", accountId));
      } catch (error) {
        if (error instanceof ProfilesDatabaseError && error.code === PERMISSION_DENIED) {
          throw new Error(`${MIGRATION_NEEDED} Le prénom ne peut pas encore être modifié.`);
        }
        throw error;
      }
    },
  };
};
