import { describe, expect, it } from "vitest";
import {
  formatDayPlanDate,
  formatDayPlanDuration,
  formatPriceLevel,
  formatRating,
  formatStraightLineDistance,
  sortedDayPlanItems,
  stopDates,
} from "./day-plan-model";
import type { DayPlanItemDraft } from "../modules/day-planner";
import type { UUID } from "../modules/_shared/model";

describe("day-plan-model", () => {
  it("enumerates an inclusive range without depending on the local timezone", () => {
    expect(stopDates("2026-08-29", "2026-09-01")).toEqual([
      "2026-08-29",
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
    ]);
  });

  it("formats dates as French UTC calendar dates", () => {
    expect(formatDayPlanDate("2026-08-17")).toBe("lun. 17 août");
  });

  it("formats practical durations", () => {
    expect(formatDayPlanDuration(45)).toBe("45 min");
    expect(formatDayPlanDuration(120)).toBe("2 h");
    expect(formatDayPlanDuration(150)).toBe("2 h 30 min");
  });

  it("formats provider facts without inventing missing values", () => {
    expect(formatPriceLevel(0)).toBe("Gratuit");
    expect(formatPriceLevel(3)).toBe("€€€");
    expect(formatPriceLevel(undefined)).toBeNull();
    expect(formatRating(4.6)).toBe("4,6/5");
    expect(formatRating(undefined)).toBeNull();
    expect(formatStraightLineDistance(850)).toBe("850 m à vol d’oiseau");
    expect(formatStraightLineDistance(1_250)).toBe("1,3 km à vol d’oiseau");
    expect(formatStraightLineDistance(undefined)).toBeNull();
  });

  it("sorts timed items first and preserves the order of ties", () => {
    const items: DayPlanItemDraft[] = [
      { candidateId: "00000000-0000-4000-8000-000000000001" as UUID, title: "Sans horaire", reason: "x", localTime: "", durationMinutes: 20 },
      { candidateId: "00000000-0000-4000-8000-000000000002" as UUID, title: "Après", reason: "x", localTime: "14:00", durationMinutes: 20 },
      { candidateId: "00000000-0000-4000-8000-000000000003" as UUID, title: "Matin", reason: "x", localTime: "09:00", durationMinutes: 20 },
      { candidateId: "00000000-0000-4000-8000-000000000004" as UUID, title: "Même heure", reason: "x", localTime: "09:00", durationMinutes: 20 },
    ];
    expect(sortedDayPlanItems(items).map((item) => item.title)).toEqual([
      "Matin",
      "Même heure",
      "Après",
      "Sans horaire",
    ]);
  });

  it("rejects invalid ranges and durations", () => {
    expect(() => stopDates("2026-02-30", "2026-03-01")).toThrow(RangeError);
    expect(() => stopDates("2026-03-02", "2026-03-01")).toThrow(RangeError);
    expect(() => formatDayPlanDuration(0)).toThrow(RangeError);
  });
});
