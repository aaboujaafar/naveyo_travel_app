import type { Coordinates } from "../../modules/_shared/model";
import type { MapAdapter, MapModel, MapRegion, MapStatus } from "./interface";
import {
  regionForCoordinates,
  validCoordinates,
  validMapPoints,
} from "./interface";

export class UnavailableMapAdapter implements MapAdapter {
  readonly supportsPolyline = false;

  status(model: MapModel): MapStatus {
    return validMapPoints(model.points).length === 0 &&
      validCoordinates(model.polyline ?? []).length === 0
      ? "empty"
      : "tiles-unavailable";
  }

  region(model: MapModel): MapRegion | null {
    return regionForCoordinates([
      ...validMapPoints(model.points).map((point) => point.coordinates),
      ...validCoordinates(model.polyline ?? []),
    ]);
  }

  polyline(_model: MapModel): Coordinates[] {
    return [];
  }
}

export class PermissionDeniedMapAdapter extends UnavailableMapAdapter {
  override status(_model: MapModel): MapStatus {
    return "permission-denied";
  }
}
