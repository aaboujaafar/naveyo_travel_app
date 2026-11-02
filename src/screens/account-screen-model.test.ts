import { describe, expect, it } from "vitest";
import type { Trip, UUID } from "../modules/_shared/model";
import {
  accountDisplayName,
  accountInitials,
  currentTripForAccount,
  pastTrips,
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

  it("prefers the Voyage under way, then the next departure", () => {
    const trips = [trip("Rome", "2027-06-01"), trip("Lisbonne", "2026-09-01"), trip("Porto", "2026-11-16")];
    expect(currentTripForAccount(trips, "2026-10-02")?.name).toBe("Porto");
    expect(currentTripForAccount(trips, "2026-09-01")?.name).toBe("Lisbonne");
    expect(currentTripForAccount([trip("Sans date")], "2026-10-02")?.name).toBe("Sans date");
  });

  it("lists finished Voyages, most recent first", () => {
    const trips = [trip("Rome", "2027-06-01"), trip("Lisbonne", "2026-09-01"), trip("Berlin", "2025-04-01")];
    expect(pastTrips(trips, "2026-10-02").map((item) => item.name)).toEqual(["Lisbonne", "Berlin"]);
  });

  it("does not infer missing dates", () => {
    expect(tripDateLabel(trip("Sans date"))).toBe("Dates à préciser");
  });
});
