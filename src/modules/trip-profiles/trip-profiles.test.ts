import { describe, expect, it } from "vitest";
import type { UUID } from "../_shared/model";
import { describeParty, memberLabels, normalizeParty } from ".";

const me = "00000000-0000-4000-8000-0000000000a1" as UUID;
const sam = "00000000-0000-4000-8000-0000000000a2" as UUID;
const third = "00000000-0000-4000-8000-0000000000a3" as UUID;

describe("trip profiles", () => {
  it("names members, the current account first as « Vous »", () => {
    expect(memberLabels([
      { accountId: sam, role: "owner", displayName: "Sam" },
      { accountId: me, role: "editor", displayName: "Ayoub" },
      { accountId: third, role: "editor" },
    ], me)).toEqual([
      { id: me, label: "Vous" },
      { id: sam, label: "Sam" },
      { id: third, label: "Compte 3" },
    ]);
  });

  it("keeps only plausible children ages and describes the party", () => {
    const party = normalizeParty({ adults: 2, childrenAges: [4, 0, 19, 2.5], stroller: true, reducedMobility: false });
    expect(party.childrenAges).toEqual([4, 0]);
    expect(describeParty(party)).toBe("2 adultes · 2 enfants (4 ans, moins d’1 an) · poussette");
    expect(normalizeParty({ adults: 40, childrenAges: [], stroller: false, reducedMobility: false }).adults).toBe(20);
    expect(describeParty({ childrenAges: [], stroller: false, reducedMobility: false })).toBeNull();
  });
});
