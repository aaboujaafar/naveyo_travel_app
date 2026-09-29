import type { Coordinates, UUID } from "../_shared/model";

export type RouteMode = "drive" | "walk" | "bicycle";

export interface CalculateRouteInput {
  tripId: UUID;
  coordinates: Coordinates[];
  mode?: RouteMode;
}

export interface RouteResult {
  geometry: Coordinates[];
  distanceMeters?: number;
  durationSeconds?: number;
}

export interface RoutingProvider {
  calculate(input: CalculateRouteInput): Promise<RouteResult | null>;
}

export type RoutingModule = RoutingProvider;
