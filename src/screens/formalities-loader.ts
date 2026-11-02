import { loadEntryMatrix, refreshEntryMatrix } from "../adapters/entry-requirements/matrix-store";
import type { Stop, UUID } from "../modules/_shared/model";
import { evaluateFormalities, type Formality } from "../modules/entry-requirements/formalities";
import type { NaveyoModules } from "../bootstrap";

export interface TripFormalities {
  formalities: Formality[];
  checked: Set<string>;
  matrixDate: string;
  /** True when no nationality at all is known for the group. */
  nationalityMissing: boolean;
  /** Whether ticks can be saved (the checks migration is applied). */
  canCheck: boolean;
}

/**
 * Nationalities of the group (the account, the other members, the party's
 * extra ones) against the entry matrix, plus the tasks already ticked.
 */
export async function loadTripFormalities(modules: NaveyoModules, tripId: UUID, stops: readonly Stop[]): Promise<TripFormalities> {
  const profiles = modules.tripProfiles;
  const [matrix, profile, members, party, checked] = await Promise.all([
    loadEntryMatrix(),
    profiles?.myProfile().catch(() => null) ?? Promise.resolve(null),
    profiles?.listMembers(tripId).catch(() => []) ?? Promise.resolve([]),
    profiles?.getParty(tripId).catch(() => null) ?? Promise.resolve(null),
    modules.tripChecks?.list(tripId).then((keys) => ({ keys, ok: true }), () => ({ keys: new Set<string>(), ok: false })) ?? Promise.resolve({ keys: new Set<string>(), ok: false }),
  ]);
  // A fresher matrix is fetched in the background for next time.
  void refreshEntryMatrix();
  const nationalities = [
    ...(profile?.nationality ? [profile.nationality] : []),
    ...members.flatMap((member) => (member.nationality ? [member.nationality] : [])),
    ...(party?.nationalities ?? []),
  ];
  return {
    formalities: nationalities.length > 0 ? evaluateFormalities({ nationalities, stops, matrix }) : [],
    checked: checked.keys,
    matrixDate: matrix.updatedOn,
    nationalityMissing: nationalities.length === 0,
    canCheck: checked.ok,
  };
}
