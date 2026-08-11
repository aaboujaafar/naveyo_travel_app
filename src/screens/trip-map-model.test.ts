import { describe, expect, it } from "vitest";
import type {
  ItineraryItem,
  TrackPoint,
  TrackingStatus,
  UUID,
} from "../modules/_shared/model";
import {
  formatDistance,
  formatLocalItineraryDate,
  isTrackingAnotherTrip,
  itineraryPointCount,
  trackDistanceMeters,
} from "./trip-map-model";

describe("trip map presentation model", () => {
  it("formats a local itinerary date without the device time zone", () => {
    expect(formatLocalItineraryDate("2026-09-01")).toContain("1 sept.");
  });

  it("counts only itinerary items with real coordinates", () => {
    const base = {
      id: "item" as UUID,
      tripId: "trip" as UUID,
      stopId: "stop" as UUID,
      title: "Lieu",
      date: "2026-09-01",
    } satisfies ItineraryItem;
    expect(
      itineraryPointCount([
        base,
        {
          ...base,
          id: "located" as UUID,
          place: {
            kind: "venue",
            label: "Lieu confirmé",
            coordinates: { latitude: 48.8566, longitude: 2.3522 },
          },
        },
      ]),
    ).toBe(1);
  });

  it("derives distance only from recorded WGS84 trace points", () => {
    const points: TrackPoint[] = [
      {
        idempotencyKey: "one",
        latitude: 48.8566,
        longitude: 2.3522,
        accuracyMeters: 5,
        recordedAt: "2026-08-11T10:00:00.000Z" as TrackPoint["recordedAt"],
      },
      {
        idempotencyKey: "two",
        latitude: 48.8575,
        longitude: 2.3522,
        accuracyMeters: 5,
        recordedAt: "2026-08-11T10:01:00.000Z" as TrackPoint["recordedAt"],
      },
    ];
    const distance = trackDistanceMeters(points);
    expect(distance).toBeGreaterThan(95);
    expect(distance).toBeLessThan(105);
    expect(formatDistance(distance)).toBe("100 m");
  });

  it("detects the single-device guard when another Voyage is recording", () => {
    const status: TrackingStatus = {
      state: "recording",
      tripId: "other-trip" as UUID,
    };
    expect(isTrackingAnotherTrip(status, "trip" as UUID)).toBe(true);
  });
});
