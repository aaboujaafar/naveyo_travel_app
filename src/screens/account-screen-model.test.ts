import { describe, expect, it } from "vitest";
import type { Trip, UUID } from "../modules/_shared/model";
import {
  accountDisplayName,
  accountInitials,
  currentTripForAccount,
  tripDateLabel,
} from "./account-screen-model";

const trip = (name: string, startsOn?: string): Trip => ({
  id: name as UUID,
  name,
  referenceCurrency: "EUR" as Trip["referenceCurrency"],
  startsOn,
  endsOn: startsOn,
  travelers: [],
  members: [],
  stopIds: [],
  createdAt: "2026-08-11T10:00:00.000Z" as Trip["createdAt"],
});

describe("account screen presentation model", () => {
  it("derives a non-sensitive display label from the connected email", () => {
    const account = { id: "account" as UUID, email: "antoine.martin@example.com" };
    expect(accountInitials(account)).toBe("AM");
    expect(accountDisplayName(account)).toBe("Antoine Martin");
  });

  it("preserves the Voyage order supplied by the Module", () => {
    expect(
      currentTripForAccount([
        trip("Rome", "2027-06-01"),
        trip("Lisbonne", "2026-09-01"),
      ])?.name,
    ).toBe("Rome");
  });

  it("does not infer missing dates", () => {
    expect(tripDateLabel(trip("Sans date"))).toBe("Dates à préciser");
  });
});
