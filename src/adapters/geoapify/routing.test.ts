import { describe, expect, it } from "vitest";
import { normalizeGeoapifyRoute } from "./routing";

describe("Geoapify routing adapter", () => {
  it("flattens a GeoJSON MultiLineString into map coordinates", () => {
    expect(
      normalizeGeoapifyRoute({
        features: [{
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [[2.35, 48.85], [2.36, 48.86]],
              [[2.36, 48.86], [2.37, 48.87]],
            ],
          },
          properties: { distance: 2_500, time: 420 },
        }],
      }),
    ).toEqual({
      geometry: [
        { latitude: 48.85, longitude: 2.35 },
        { latitude: 48.86, longitude: 2.36 },
        { latitude: 48.87, longitude: 2.37 },
      ],
      distanceMeters: 2_500,
      durationSeconds: 420,
    });
  });

  it("returns no route when the provider has no feature", () => {
    expect(normalizeGeoapifyRoute({ features: [] })).toBeNull();
  });
});
