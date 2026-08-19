import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAY_PLAN_PREFERENCES,
  toggleDayPlanTheme,
  updateDayPlanPreferences,
} from "./day-plan-preferences-model";

describe("day-plan-preferences-model", () => {
  it("provides a walking-friendly default", () => {
    expect(DEFAULT_DAY_PLAN_PREFERENCES.mobility).toBe("walking");
    expect(DEFAULT_DAY_PLAN_PREFERENCES.radiusMeters).toBe(5_000);
    expect(DEFAULT_DAY_PLAN_PREFERENCES.themes).toEqual(["mixed"]);
  });

  it("updates nested constraints without mutating the current value", () => {
    const next = updateDayPlanPreferences(DEFAULT_DAY_PLAN_PREFERENCES, {
      mobility: "motorized",
      radiusMeters: 10_000,
      constraints: { children: true, startTime: "10:00" },
    });

    expect(next).toMatchObject({
      mobility: "motorized",
      radiusMeters: 10_000,
      constraints: { children: true, startTime: "10:00" },
    });
    expect(DEFAULT_DAY_PLAN_PREFERENCES.constraints).toBeUndefined();
  });

  it("keeps mixed exclusive and supports multiple themes", () => {
    expect(toggleDayPlanTheme(["mixed"], "romantic")).toEqual(["romantic"]);
    expect(toggleDayPlanTheme(["romantic"], "beach")).toEqual(["romantic", "beach"]);
    expect(toggleDayPlanTheme(["romantic", "beach"], "romantic")).toEqual(["beach"]);
    expect(toggleDayPlanTheme(["romantic"], "mixed")).toEqual(["mixed"]);
    expect(toggleDayPlanTheme(["romantic"], "romantic")).toEqual(["mixed"]);
  });
});
