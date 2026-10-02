import { describe, expect, it } from "vitest";
import { sameDatesLastYear, summarizeClimate } from "./climate";

describe("climate hint", () => {
  it("looks at the same dates one year earlier", () => {
    expect(sameDatesLastYear("2026-11-16", "2026-11-20")).toEqual({ year: 2025, startDate: "2025-11-16", endDate: "2025-11-20" });
    expect(sameDatesLastYear("2028-02-29", "2028-03-02")).toEqual({ year: 2027, startDate: "2027-02-28", endDate: "2027-03-02" });
    expect(sameDatesLastYear("bad", "2026-11-20")).toBeNull();
  });

  it("averages temperatures and counts rainy days", () => {
    expect(summarizeClimate(2025, [
      { temperatureMaxC: 18.2, temperatureMinC: 11, precipitationSumMm: 0 },
      { temperatureMaxC: 16, temperatureMinC: 10.4, precipitationSumMm: 4.5 },
      { temperatureMaxC: null, temperatureMinC: null, precipitationSumMm: null },
    ])).toEqual({ year: 2025, days: 3, temperatureMaxC: 17, temperatureMinC: 11, rainyDays: 1 });
    expect(summarizeClimate(2025, [])).toBeNull();
  });
});
