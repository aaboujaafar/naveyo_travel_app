import { describe, expect, it } from "vitest";
import type { Stop, Trip } from "../modules/_shared/model";
import {
  countTripDays,
  formatTripDateRange,
  getTravelerCount,
  sortStopsByLocalDate,
} from "./trip-dashboard-model";

describe("trip dashboard model", () => {
  it("formats date-only values without using the device timezone", () => {
    expect(formatTripDateRange("2026-08-10", "2026-08-17")).toBe(
      "10–17 août",
    );
    expect(countTripDays("2026-08-10", "2026-08-17")).toBe(8);
  });

  it("rejects incomplete and reversed date ranges", () => {
    expect(formatTripDateRange("2026-08-10", undefined)).toBe(
      "Dates à préciser",
    );
    expect(countTripDays("2026-08-17", "2026-08-10")).toBeNull();
  });

  it("uses actual travelers and sorts Étapes by their local dates", () => {
    const trip = {
      travelers: ["traveler-a", "traveler-b"],
      members: [{ accountId: "account-a", role: "owner" }],
    } as Trip;
    const later = { id: "b", name: "Porto", startDate: "2026-08-14" } as Stop;
    const earlier = {
      id: "a",
      name: "Lisbonne",
      startDate: "2026-08-10",
    } as Stop;

    expect(getTravelerCount(trip)).toBe(2);
    expect(sortStopsByLocalDate([later, earlier]).map((stop) => stop.id)).toEqual([
      "a",
      "b",
    ]);
  });
});
