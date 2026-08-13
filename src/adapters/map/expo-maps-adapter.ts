import type { Coordinates } from "../../modules/_shared/model";
import type {
  MapAdapter,
  MapModel,
  MapRegion,
  MapStatus,
} from "./interface";
import {
  regionForCoordinates,
  validCoordinates,
  validMapPoints,
} from "./interface";

export type ExpoMapsAvailability = Exclude<
  MapStatus,
  "empty" | "native-unavailable"
>;

export interface ExpoMapsAdapterOptions {
  availability?: ExpoMapsAvailability;
}
export interface ExpoMapsCameraPosition {
  coordinates: Coordinates;
  zoom: number;
}

/**
 * Pure adapter state for the iOS AppleMaps.View primitive.
 *
 * expo-maps accepts a camera zoom rather than a latitude/longitude span, so
 * the stable MapAdapter region remains the source contract and is converted
 * only at the native view boundary.
 */
export class ExpoMapsAdapter implements MapAdapter {
  readonly supportsPolyline = true;

  private readonly availability: ExpoMapsAvailability;

  constructor(options: ExpoMapsAdapterOptions = {}) {
    this.availability = options.availability ?? "ready";
  }

  status(model: MapModel): MapStatus {
    if (this.availability === "permission-denied") {
      return "permission-denied";
    }
    if (
      validMapPoints(model.points).length === 0 &&
      validCoordinates(model.polyline ?? []).length === 0
    ) {
      return "empty";
    }
    return this.availability;
  }

  region(model: MapModel): MapRegion | null {
    return regionForCoordinates([
      ...validMapPoints(model.points).map((point) => point.coordinates),
      ...this.polyline(model),
    ]);
  }

  polyline(model: MapModel): Coordinates[] {
    return validCoordinates(model.polyline ?? []);
  }
}

export function cameraPositionForRegion(
  region: MapRegion,
): ExpoMapsCameraPosition {
  const span = Math.max(region.latitudeDelta, region.longitudeDelta);
  const zoom = Math.min(20, Math.max(1, Math.log2(360 / span)));
  return {
    coordinates: {
      latitude: region.latitude,
      longitude: region.longitude,
    },
    zoom,
  };
}
