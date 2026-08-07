import { describe, expect, it } from "vitest";
import type { LocationObject } from "expo-location";
import type { UUID } from "../../modules/_shared/model";
import {
  appendUniquePoint,
  makeTrackPoint,
  parseStoredTrackingState,
} from "./normalize";

const tripId = "00000000-0000-4000-8000-000000000001" as UUID;
const location = {
  coords: {
    latitude: 48.8566,
    longitude: 2.3522,
    altitude: 0,
    accuracy: 8,
    heading: 0,
    speed: 1,
  },
  timestamp: 1_754_000_000_000,
  mocked: false,
} as LocationObject;

describe("Expo location normalization", () => {
  it("creates a UTC WGS84 point with an idempotency key", () => {
    expect(makeTrackPoint(tripId, location)).toEqual({
      idempotencyKey:
        "00000000-0000-4000-8000-000000000001:1754000000000:48.8566000:2.3522000",
      latitude: 48.8566,
      longitude: 2.3522,
      recordedAt: "2025-07-31T22:13:20.000Z",
      accuracyMeters: 8,
    });
  });

  it("keeps a retry idempotent", () => {
    const point = makeTrackPoint(tripId, location);
    expect(appendUniquePoint([point], point)).toEqual([point]);
  });

  it("rejects another trip state and filters malformed points", () => {
    expect(() =>
      parseStoredTrackingState(
        JSON.stringify({ tripId: "other", points: [] }),
        tripId,
      ),
    ).toThrow();
    const state = parseStoredTrackingState(
      JSON.stringify({
        tripId,
        points: [
          {
            idempotencyKey: "ok",
            latitude: 1,
            longitude: 2,
            recordedAt: "2025-01-01T00:00:00.000Z",
            accuracyMeters: 4,
          },
          { bad: true },
        ],
      }),
      tripId,
    );
    expect(state.points).toHaveLength(1);
  });
});
