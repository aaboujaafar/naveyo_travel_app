import { describe, expect, it } from "vitest";
import type { Trip } from "../modules/_shared/model";
import { formatTripsListDateRange, isTripOver, orderTrips, tripMemberCount, tripTiming } from "./trips-list-model";

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
  it("counts down to the departure, then follows the days of the Voyage", () => {
    const dated = { startsOn: "2026-11-16", endsOn: "2026-11-20" };
    expect(tripTiming(dated, "2026-10-02")).toEqual({ phase: "upcoming", daysUntil: 45, label: "Départ dans 45 jours" });
    expect(tripTiming(dated, "2026-11-15").label).toBe("Départ demain");
    expect(tripTiming(dated, "2026-11-17")).toEqual({ phase: "ongoing", progress: 0.4, label: "En cours · jour 2 sur 5" });
    expect(tripTiming(dated, "2026-11-21").phase).toBe("past");
    expect(tripTiming({}, "2026-10-02").phase).toBe("undated");
  });
});

describe("home list order", () => {
  const dated = (name: string, startsOn?: string, endsOn?: string) => ({ name, ...(startsOn ? { startsOn } : {}), ...(endsOn ? { endsOn } : {}) });

  it("pins the Voyage under way, then sorts from the most recent to the oldest", () => {
    const trip = dated;
    const { pinned, others } = orderTrips([
      trip("Rome", "2025-04-10", "2025-04-14"),
      trip("Sans dates"),
      trip("Lisbonne", "2026-10-03", "2026-10-09"),
      trip("Japon", "2027-03-01", "2027-03-15"),
      trip("Porto", "2026-06-01", "2026-06-05"),
    ], "2026-10-06");
    expect(pinned.map((item) => item.name)).toEqual(["Lisbonne"]);
    expect(others.map((item) => item.name)).toEqual(["Japon", "Porto", "Rome", "Sans dates"]);
  });

  it("knows when a Voyage is over", () => {
    const trip = dated;
    expect(isTripOver(trip("Porto", "2026-06-01", "2026-06-05"), "2026-10-06")).toBe(true);
    expect(isTripOver(trip("Lisbonne", "2026-10-03", "2026-10-09"), "2026-10-06")).toBe(false);
    expect(isTripOver(trip("Sans dates"), "2026-10-06")).toBe(false);
    expect(isTripOver(null, "2026-10-06")).toBe(false);
  });
});
