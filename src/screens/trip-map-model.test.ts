import { describe, expect, it } from "vitest";
import type {
  ItineraryItem,
  Stop,
  TrackPoint,
  TrackingStatus,
  UUID,
} from "../modules/_shared/model";
import {
  buildItineraryMapModel,
  formatDistance,
  formatLocalItineraryDate,
  isTrackingAnotherTrip,
  itineraryPointCount,
  itineraryRouteCoordinates,
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

  it("builds markers from confirmed places and a trace from GPS points", () => {
    const item = {
      id: "item" as UUID,
      tripId: "trip" as UUID,
      stopId: "stop" as UUID,
      title: "Musée",
      date: "2026-09-01",
      place: {
        kind: "venue" as const,
        label: "Musée",
        coordinates: { latitude: 48.8566, longitude: 2.3522 },
      },
    } satisfies ItineraryItem;
    const model = buildItineraryMapModel(
      [
        item,
        {
          ...item,
          id: "without-coordinates" as UUID,
          place: { kind: "venue", label: "Adresse à confirmer" },
        },
      ],
      [
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
      ],
    );

    expect(model.points).toEqual([
      { id: "item", label: "Musée", coordinates: { latitude: 48.8566, longitude: 2.3522 } },
    ]);
    expect(model.polyline).toEqual([
      { latitude: 48.8566, longitude: 2.3522 },
      { latitude: 48.8575, longitude: 2.3522 },
    ]);
  });

  it("keeps a geocoded Step visible when it has no POI yet", () => {
    const stop: Stop = {
      id: "stop" as UUID,
      tripId: "trip" as UUID,
      name: "Lisbonne",
      countryCode: "PT",
      timeZone: "Europe/Lisbon" as Stop["timeZone"],
      startDate: "2026-09-01",
      endDate: "2026-09-02",
      coordinates: { latitude: 38.7223, longitude: -9.1393 },
    };
    expect(buildItineraryMapModel([], [], [stop]).points).toEqual([
      { id: "stop-stop", label: "Lisbonne", coordinates: stop.coordinates },
    ]);
  });

  it("uses the planned route when no live GPS trace is available", () => {
    const stop = {
      id: "stop" as UUID,
      tripId: "trip" as UUID,
      name: "Paris",
      countryCode: "FR",
      timeZone: "Europe/Paris" as Stop["timeZone"],
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
    } satisfies Stop;
    const item = {
      id: "item" as UUID,
      tripId: "trip" as UUID,
      stopId: stop.id,
      title: "Musée",
      date: "2026-09-01",
      place: {
        kind: "venue" as const,
        label: "Musée",
        coordinates: { latitude: 48.8584, longitude: 2.2945 },
      },
    } satisfies ItineraryItem;
    const route = [
      { latitude: 48.8566, longitude: 2.3522 },
      { latitude: 48.857, longitude: 2.33 },
      { latitude: 48.8584, longitude: 2.2945 },
    ];

    expect(itineraryRouteCoordinates([item], stop)).toEqual([
      stop.coordinates,
      item.place.coordinates,
    ]);
    expect(buildItineraryMapModel([item], [], [stop], route).polyline).toEqual(route);
  });

  it("ignores invalid coordinates and bounds a large trace for native rendering", () => {
    const basePoint: TrackPoint = {
      idempotencyKey: "point",
      latitude: 48,
      longitude: 2,
      accuracyMeters: 5,
      recordedAt: "2026-08-11T10:00:00.000Z" as TrackPoint["recordedAt"],
    };
    const model = buildItineraryMapModel([], [
      { ...basePoint, latitude: Number.NaN },
      ...Array.from({ length: 2_000 }, (_, index) => ({
        ...basePoint,
        idempotencyKey: `point-${index}`,
        latitude: 48 + index / 100_000,
      })),
    ]);

    expect(model.points).toHaveLength(0);
    expect(model.polyline).toHaveLength(1_000);
    expect(model.polyline?.[0]).toEqual({ latitude: 48, longitude: 2 });
    expect(model.polyline?.at(-1)).toEqual({ latitude: 48.01999, longitude: 2 });
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
