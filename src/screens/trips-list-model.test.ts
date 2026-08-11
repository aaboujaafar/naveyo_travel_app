import { describe, expect, it } from "vitest";
import type { Trip } from "../modules/_shared/model";
import { formatTripsListDateRange, tripMemberCount } from "./trips-list-model";

const trip = (overrides: Partial<Trip> = {}): Trip => ({
  id: "trip" as Trip["id"], name: "Portugal", referenceCurrency: "EUR" as Trip["referenceCurrency"],
  travelers: [], members: [{ accountId: "member" as Trip["id"], role: "owner" }], stopIds: [],
  createdAt: "2026-08-11T10:00:00.000Z" as Trip["createdAt"], ...overrides,
});

describe("trips list model", () => {
  it("formats local dates without timezone drift", () => {
    expect(formatTripsListDateRange(trip({ startsOn: "2026-08-10", endsOn: "2026-08-17" }))).toBe("10 août – 17 août");
  });
  it("falls back when dates are incomplete", () => {
    expect(formatTripsListDateRange(trip())).toBe("Dates à préciser");
  });
  it("uses travelers before members when available", () => {
    expect(tripMemberCount(trip({ travelers: ["a" as Trip["id"], "b" as Trip["id"]] }))).toBe(2);
  });
});
