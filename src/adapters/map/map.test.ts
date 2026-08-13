import { describe, expect, it } from "vitest";
import {
  cameraPositionForRegion,
  ExpoMapsAdapter,
  isValidCoordinate,
  mapStatusMessage,
  regionForCoordinates,
  regionForPoints,
  validCoordinates,
} from "./index";
import { UnavailableMapAdapter } from "./unavailable";

const point = (id: string, latitude: number, longitude: number) => ({
  id,
  label: `Point ${id}`,
  coordinates: { latitude, longitude },
});

describe("ExpoMapsAdapter", () => {
  it("serializes an empty map and has no region", () => {
    const adapter = new ExpoMapsAdapter();
    const model = { points: [] };

    expect(adapter.status(model)).toBe("empty");
    expect(adapter.region(model)).toBeNull();
  });

  it("centers a single point with a non-zero region", () => {
    const adapter = new ExpoMapsAdapter();
    const model = { points: [point("one", 48.8566, 2.3522)] };

    expect(adapter.status(model)).toBe("ready");
    const region = adapter.region(model);
    expect(region).toMatchObject({
      latitude: 48.8566,
      longitude: 2.3522,
    });
    expect(region?.latitudeDelta).toBeCloseTo(0.028, 8);
    expect(region?.longitudeDelta).toBeCloseTo(0.028, 8);
  });

  it("fits many points without a spread-based overflow or invalid delta", () => {
    const points = Array.from({ length: 100_000 }, (_, index) =>
      point(`point-${index}`, -90 + (index % 180), -180 + (index % 360)),
    );
    const region = regionForPoints(points);

    expect(region).toEqual({
      latitude: -0.5,
      longitude: 0.5,
      latitudeDelta: 180,
      longitudeDelta: 360,
    });
    expect(Number.isFinite(region?.latitudeDelta)).toBe(true);
    expect(Number.isFinite(region?.longitudeDelta)).toBe(true);
  });

  it("includes a route polyline when computing the visible region", () => {
    const adapter = new ExpoMapsAdapter();
    const model = {
      points: [point("one", 48.8566, 2.3522)],
      polyline: [
        { latitude: 41.3874, longitude: 2.1686 },
        { latitude: 51.5072, longitude: -0.1276 },
      ],
    };

    expect(adapter.polyline(model)).toEqual(model.polyline);
    expect(adapter.polyline(model)).not.toBe(model.polyline);
    expect(adapter.region(model)).toMatchObject({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
      latitudeDelta: expect.any(Number),
      longitudeDelta: expect.any(Number),
    });
  });

  it("keeps a valid route visible when every marker coordinate is invalid", () => {
    const adapter = new ExpoMapsAdapter();
    const model = {
      points: [point("invalid", Number.NaN, 2.3522)],
      polyline: [
        { latitude: 48.8566, longitude: 2.3522 },
        { latitude: 48.857, longitude: 2.353 },
        { latitude: 91, longitude: 2.354 },
      ],
    };

    expect(adapter.status(model)).toBe("ready");
    expect(adapter.polyline(model)).toHaveLength(2);
    expect(adapter.region(model)).not.toBeNull();
  });

  it("fits points across the international date line using the short arc", () => {
    const region = regionForCoordinates([
      { latitude: 35, longitude: 179 },
      { latitude: 35.2, longitude: -179 },
    ]);

    expect(region?.longitude).toBe(180);
    expect(region?.longitudeDelta).toBeCloseTo(2.8, 8);
  });

  it("converts the stable region contract to an expo-maps camera position", () => {
    expect(
      cameraPositionForRegion({
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.028,
        longitudeDelta: 0.028,
      }),
    ).toMatchObject({
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
      zoom: expect.any(Number),
    });
    expect(
      cameraPositionForRegion({
        latitude: 0,
        longitude: 0,
        latitudeDelta: 360,
        longitudeDelta: 360,
      }).zoom,
    ).toBe(1);
  });

  it("serializes permission-denied and tiles-unavailable states", () => {
    const model = { points: [point("one", 48.8566, 2.3522)] };

    expect(
      new ExpoMapsAdapter({ availability: "permission-denied" }).status(
        model,
      ),
    ).toBe("permission-denied");
    expect(
      new ExpoMapsAdapter({ availability: "tiles-unavailable" }).status(
        model,
      ),
    ).toBe("tiles-unavailable");
    expect(mapStatusMessage("tiles-unavailable")).toContain("indisponible");
    expect(mapStatusMessage("permission-denied")).toContain("refusé");
  });

  it("ignores invalid coordinates while computing a safe region", () => {
    expect(isValidCoordinate({ latitude: 48.8566, longitude: 2.3522 })).toBe(
      true,
    );
    expect(isValidCoordinate({ latitude: 91, longitude: 2.3522 })).toBe(false);
    expect(
      validCoordinates([
        { latitude: Number.NaN, longitude: 0 },
        { latitude: 48.8566, longitude: 2.3522 },
      ]),
    ).toEqual([{ latitude: 48.8566, longitude: 2.3522 }]);
    expect(
      regionForCoordinates([
        { latitude: Number.NaN, longitude: 0 },
        { latitude: 91, longitude: 0 },
        { latitude: 48.8566, longitude: 2.3522 },
      ]),
    ).toMatchObject({ latitude: 48.8566, longitude: 2.3522 });
    expect(
      regionForCoordinates([{ latitude: Number.NaN, longitude: Number.NaN }]),
    ).toBeNull();
  });

  it("reports a tile fallback for a route without valid markers", () => {
    const model = {
      points: [point("invalid", 91, 2.3522)],
      polyline: [
        { latitude: 48.8566, longitude: 2.3522 },
        { latitude: 48.857, longitude: 2.353 },
      ],
    };

    expect(new UnavailableMapAdapter().status(model)).toBe("tiles-unavailable");
    expect(mapStatusMessage("native-unavailable")).toContain("disponible");
  });
});
