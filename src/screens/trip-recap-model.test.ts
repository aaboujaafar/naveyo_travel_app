import { describe, expect, it } from "vitest";
import type { Expense } from "../modules/expenses";
import { itineraryItem, reservation, stop, trackPoint, trip } from "../modules/__fixtures__/domain";
import { buildTripRecap } from "./trip-recap-model";

const euros = (minorUnits: number, category: Expense["category"]) =>
  ({ reference: { minorUnits, currency: trip.referenceCurrency }, category }) as Expense;

describe("trip recap", () => {
  it("summarises the Voyage from its own data", () => {
    const recap = buildTripRecap({
      trip: { ...trip, name: "Lisbonne", startsOn: "2026-11-16", endsOn: "2026-11-20" },
      stops: [{ ...stop, name: "Lisbonne", countryCode: "PT" }],
      itinerary: [itineraryItem],
      reservations: [reservation],
      expenses: [euros(12_000, "food"), euros(4_000, "transport")],
      trackPoints: [trackPoint, { ...trackPoint, idempotencyKey: "b", latitude: trackPoint.latitude + 0.01 }],
    });

    expect(recap).toMatchObject({
      title: "Lisbonne",
      dates: "16 novembre 2026 – 20 novembre 2026",
      days: 5,
      countries: ["🇵🇹 Portugal"],
      activityCount: 1,
      reservationCount: 1,
      topCategory: "Restaurants",
    });
    expect(recap.distance).toBe("1,1 km");
    expect(recap.totalSpent).toContain("160,00");
    expect(recap.shareText).toContain("Lisbonne · 16 novembre 2026");
  });

  it("leaves out what was never recorded", () => {
    const recap = buildTripRecap({ trip, stops: [], itinerary: [], reservations: [], expenses: [], trackPoints: [] });
    expect(recap).toMatchObject({ distance: null, totalSpent: null, topCategory: null, dates: "Dates à préciser" });
  });
});
