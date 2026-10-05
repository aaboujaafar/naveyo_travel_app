import { describe, expect, it } from "vitest";
import { isRainyDay, planBAssistantPath } from "./weather-plan-b";

describe("weather plan B", () => {
  it("flags days with a high chance of rain only", () => {
    expect(isRainyDay({ precipitationProbabilityMax: 75 })).toBe(true);
    expect(isRainyDay({ precipitationProbabilityMax: 30 })).toBe(false);
    expect(isRainyDay({})).toBe(false);
  });

  it("opens the day composer on that date with indoor places", () => {
    expect(planBAssistantPath("trip", "stop", "2026-11-17")).toBe("/trips/trip/assistant?stopId=stop&mode=day&date=2026-11-17&indoor=1");
  });
});
