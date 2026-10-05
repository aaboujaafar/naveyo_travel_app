import type { UUID } from "../_shared/model";

export interface MemberProfile {
  accountId: UUID;
  role: "owner" | "editor";
  /** Absent when the database does not share names between members yet. */
  displayName?: string;
}

/** Who travels, so the AI composes days at the right pace and with the right access. */
export interface TravelParty {
  childrenAges: number[];
  stroller: boolean;
  reducedMobility: boolean;
}

export interface TripProfilesModule {
  listMembers(tripId: UUID): Promise<MemberProfile[]>;
  /** Null when the Voyage has no party details yet, or the database cannot store them. */
  getParty(tripId: UUID): Promise<TravelParty | null>;
  saveParty(tripId: UUID, party: TravelParty): Promise<void>;
  myProfile(): Promise<{ accountId: UUID; displayName?: string } | null>;
  updateMyDisplayName(displayName: string): Promise<void>;
}

export const EMPTY_PARTY: TravelParty = { childrenAges: [], stroller: false, reducedMobility: false };

/**
 * Labels for the members of a Voyage: "Vous" for the current account, the
 * shared name of the others, else the numbering used everywhere else.
 */
export function memberLabels(members: readonly MemberProfile[], currentAccountId: UUID | null): { id: UUID; label: string }[] {
  const labelled = members.map((member, index) => ({
    id: member.accountId,
    label: member.accountId === currentAccountId ? "Vous" : member.displayName?.trim() || `Compte ${index + 1}`,
  }));
  return [...labelled.filter((member) => member.id === currentAccountId), ...labelled.filter((member) => member.id !== currentAccountId)];
}

/** Validated party: whole ages from 0 to 17, at most eight children. */
export function normalizeParty(party: TravelParty): TravelParty {
  return {
    childrenAges: party.childrenAges.filter((age) => Number.isInteger(age) && age >= 0 && age <= 17).slice(0, 8),
    stroller: party.stroller,
    reducedMobility: party.reducedMobility,
  };
}

export function describeParty(party: TravelParty | null): string | null {
  if (!party) return null;
  const parts = [
    party.childrenAges.length > 0 ? `${party.childrenAges.length} enfant${party.childrenAges.length > 1 ? "s" : ""} (${party.childrenAges.map((age) => (age === 0 ? "moins d’1 an" : `${age} an${age > 1 ? "s" : ""}`)).join(", ")})` : null,
    party.stroller ? "poussette" : null,
    party.reducedMobility ? "mobilité réduite" : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
