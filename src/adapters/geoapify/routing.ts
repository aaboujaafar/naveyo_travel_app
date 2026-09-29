import type { Coordinates, UUID } from "../../modules/_shared/model";
import type {
  CalculateRouteInput,
  RouteMode,
  RouteResult,
  RoutingProvider,
} from "../../modules/routing";

export type RoutingTransport = (request: {
  tripId: UUID;
  coordinates: Coordinates[];
  mode: RouteMode;
}) => Promise<unknown>;

type GeoJsonGeometry = {
  type?: unknown;
  coordinates?: unknown;
};

type GeoJsonFeature = {
  geometry?: GeoJsonGeometry;
  properties?: Record<string, unknown>;
};

type GeoJsonResponse = {
  features?: unknown;
};

export class GeoapifyRoutingProvider implements RoutingProvider {
  constructor(private readonly transport: RoutingTransport) {}

  async calculate(input: CalculateRouteInput): Promise<RouteResult | null> {
    const response = await this.transport({
      tripId: input.tripId,
      coordinates: input.coordinates,
      mode: input.mode ?? "drive",
    });
    return normalizeGeoapifyRoute(response);
  }
}

export function createGeoapifyRoutingProvider(
  endpoint: string,
  getAccessToken: () => Promise<string | null>,
): GeoapifyRoutingProvider {
  return new GeoapifyRoutingProvider(async ({ tripId, coordinates, mode }) => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication is required to calculate a route");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tripId, coordinates, mode }),
        signal: controller.signal,
      });
      if (response.status === 429) throw new Error("Route quota reached");
      if (response.status === 408 || response.status >= 500)
        throw new Error("Route service is temporarily unavailable");
      if (!response.ok) throw new Error(`Route calculation failed (${response.status})`);
      return response.json() as Promise<unknown>;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        throw new Error("Route calculation timed out");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  });
}

export function normalizeGeoapifyRoute(value: unknown): RouteResult | null {
  if (!value || typeof value !== "object") throw new Error("Invalid route response");
  const features = (value as GeoJsonResponse).features;
  if (!Array.isArray(features)) throw new Error("Invalid route response");
  const feature = features[0];
  if (!feature || typeof feature !== "object") return null;

  const geometry = (feature as GeoJsonFeature).geometry;
  if (!geometry || geometry.type !== "MultiLineString" || !Array.isArray(geometry.coordinates)) {
    throw new Error("Invalid route geometry");
  }

  const lines = geometry.coordinates.flatMap((line) => {
    if (!Array.isArray(line)) return [];
    return line.flatMap((point) => {
      if (!Array.isArray(point) || point.length < 2) return [];
      const longitude = point[0];
      const latitude = point[1];
      return typeof longitude === "number" && Number.isFinite(longitude) &&
          typeof latitude === "number" && Number.isFinite(latitude)
        ? [{ latitude, longitude }]
        : [];
    });
  });
  const route = deduplicateAdjacentCoordinates(lines);
  if (route.length < 2) return null;

  const properties = (feature as GeoJsonFeature).properties;
  return {
    geometry: route,
    distanceMeters: finiteNumber(properties?.distance),
    durationSeconds: finiteNumber(properties?.time),
  };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function deduplicateAdjacentCoordinates(coordinates: Coordinates[]): Coordinates[] {
  return coordinates.filter((coordinate, index) => {
    const previous = coordinates[index - 1];
    return previous === undefined ||
      previous.latitude !== coordinate.latitude ||
      previous.longitude !== coordinate.longitude;
  });
}
