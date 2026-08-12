import type { Coordinates } from "../../modules/_shared/model";
import type { MapAdapter, MapModel, MapRegion, MapStatus } from "./interface";
import { regionForCoordinates } from "./interface";

export type ReactNativeMapsAvailability = Exclude<MapStatus, "empty">;

export interface ReactNativeMapsAdapterOptions {
  availability?: ReactNativeMapsAvailability;
}
/**
 * Pure adapter state for the iOS map primitive.
 *
 * The native view is kept in a separate file so this seam remains usable by
 * tests and degraded adapters when react-native-maps is not installed.
 */
export class ReactNativeMapsAdapter implements MapAdapter {
  readonly supportsPolyline = true;

  private readonly availability: ReactNativeMapsAvailability;

  constructor(options: ReactNativeMapsAdapterOptions = {}) {
    this.availability = options.availability ?? "ready";
  }

  status(model: MapModel): MapStatus {
    if (this.availability === "permission-denied") {
      return "permission-denied";
    }
    if (model.points.length === 0 && this.polyline(model).length === 0) {
      return "empty";
    }
    return this.availability;
  }

  region(model: MapModel): MapRegion | null {
    return regionForCoordinates([
      ...model.points.map((point) => point.coordinates),
      ...this.polyline(model),
    ]);
  }

  polyline(model: MapModel): Coordinates[] {
    return model.polyline === undefined ? [] : [...model.polyline];
  }
}
