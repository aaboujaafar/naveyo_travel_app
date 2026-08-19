import { describe, expect, it } from "vitest";
import type { DiscoveredPlace } from "./day-place-discovery.ts";
import { validateDaySchedule } from "./day-schedule-validation.ts";

const place = (id: string, latitude: number, longitude: number, metadata: Record<string, unknown> = {}): DiscoveredPlace => ({
  id,
  provider: "geoapify",
  providerPlaceId: id,
  name: id,
  coordinates: { latitude, longitude },
  attribution: "test",
  ...metadata,
});

const item = (candidateId: string, localTime: string, durationMinutes: number): { candidateId: string; title: string; reason: string; localTime: string; durationMinutes: number } => ({
  candidateId,
  title: candidateId,
  reason: "test",
  localTime,
  durationMinutes,
});

describe("validateDaySchedule", () => {
  it("sorts stably and verifies a structured schedule for the whole duration", () => {
    const result = validateDaySchedule({
      date: "2026-08-19",
      mobility: "walking",
      candidates: [place("museum", 0, 0, { openingHours: { periods: [{ open: { day: 3, hour: 9, minute: 0 }, close: { day: 3, hour: 18, minute: 0 } }] } })],
      items: [item("museum", "10:00", 120), item("museum", "09:00", 30)],
    });

    expect(result.rejected).toEqual([]);
    expect(result.items.map(({ localTime, openingStatus }) => ({ localTime, openingStatus }))).toEqual([
      { localTime: "09:00", openingStatus: "verified_open" },
      { localTime: "10:00", openingStatus: "verified_open" },
    ]);
  });

  it("supports overnight structured periods and rejects a duration that crosses closing", () => {
    const overnight = place("bar", 0, 0, { openingHours: { periods: [{ open: { day: 3, hour: 22, minute: 0 }, close: { day: 4, hour: 2, minute: 0 } }] } });
    const result = validateDaySchedule({
      date: "2026-08-19",
      mobility: "walking",
      candidates: [overnight],
      items: [item("bar", "23:00", 120), item("bar", "01:00", 120)],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].localTime).toBe("23:00");
    expect(result.rejected).toEqual([{ candidateId: "bar", reason: "closed" }]);
  });

  it("recognises supported OSM text, 24/7 and unknown syntax without guessing", () => {
    const result = validateDaySchedule({
      date: "2026-08-19",
      mobility: "walking",
      candidates: [
        place("cafe", 0, 0, { opening_hours: "Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off" }),
        place("always", 0, 0.01, { opening_hours: "24/7" }),
        place("unknown", 0, 0.02, { opening_hours: "by appointment" }),
      ],
      items: [item("cafe", "10:00", 60), item("always", "12:00", 480), item("unknown", "13:00", 60)],
    });

    expect(result.rejected).toEqual([]);
    expect(result.items.map(({ candidateId, openingStatus }) => ({ candidateId, openingStatus }))).toEqual([
      { candidateId: "cafe", openingStatus: "verified_open" },
      { candidateId: "always", openingStatus: "verified_open" },
      { candidateId: "unknown", openingStatus: "unknown" },
    ]);
  });

  it("recognises provider-shaped source text and a structured 24/7 period", () => {
    const result = validateDaySchedule({
      date: "2026-08-20",
      mobility: "walking",
      candidates: [
        place("geo-always", 0, 0, { openingHours: { sourceText: "24/7" } }),
        place("google-always", 0, 0.01, { openingHours: { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] } }),
      ],
      items: [item("geo-always", "01:00", 120), item("google-always", "23:00", 120)],
    });

    expect(result.rejected).toEqual([]);
    expect(result.items.map((entry) => entry.openingStatus)).toEqual(["verified_open", "verified_open"]);
  });

  it("rejects permanently closed businesses and geographic jumps from the last retained item", () => {
    const result = validateDaySchedule({
      date: "2026-08-19",
      mobility: "walking",
      candidates: [
        place("closed", 0, 0, { businessStatus: "permanently_closed" }),
        place("near", 0, 0.01),
        place("far", 0, 0.2),
      ],
      items: [item("closed", "08:00", 30), item("near", "09:00", 30), item("far", "10:00", 30)],
    });

    expect(result.items.map((entry) => entry.candidateId)).toEqual(["near"]);
    expect(result.items[0].distanceFromPreviousMeters).toBeUndefined();
    expect(result.rejected).toEqual([
      { candidateId: "closed", reason: "business_closed" },
      { candidateId: "far", reason: "geographic_jump" },
    ]);
  });

  it("uses a 20 km adjacent distance limit for motorized mobility", () => {
    const result = validateDaySchedule({
      date: "2026-08-19",
      mobility: "motorized",
      candidates: [place("one", 0, 0), place("two", 0, 0.1)],
      items: [item("one", "09:00", 30), item("two", "10:00", 30)],
    });

    expect(result.rejected).toEqual([]);
    expect(result.items[1].distanceFromPreviousMeters).toBeGreaterThan(10_000);
  });
});
