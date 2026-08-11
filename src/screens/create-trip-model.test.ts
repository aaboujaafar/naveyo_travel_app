import { describe, expect, it } from "vitest";
import { calculateTripDuration, isCreateTripReady } from "./create-trip-model";

describe("create trip form", () => {
  it("calculates local calendar days without using the phone timezone", () => {
    expect(calculateTripDuration("2026-08-10", "2026-08-17")).toEqual({
      days: 8,
      nights: 7,
    });
  });

  it("rejects invalid or reversed dates", () => {
    expect(calculateTripDuration("2026-08-17", "2026-08-10")).toBeNull();
    expect(calculateTripDuration("2026-02-30", "2026-03-02")).toBeNull();
  });

  it("requires a name and a valid date range", () => {
    expect(
      isCreateTripReady({
        name: "Lisbonne, Portugal",
        startsOn: "2026-08-10",
        endsOn: "2026-08-17",
      }),
    ).toBe(true);
    expect(
      isCreateTripReady({
        name: " ",
        startsOn: "2026-08-10",
        endsOn: "2026-08-17",
      }),
    ).toBe(false);
  });
});
