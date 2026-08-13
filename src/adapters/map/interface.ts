import type { Coordinates } from "../../modules/_shared/model";

export type MapStatus =
  | "ready"
  | "empty"
  | "tiles-unavailable"
  | "permission-denied";

export function mapStatusMessage(status: MapStatus): string {
  switch (status) {
    case "empty":
      return "Aucun lieu à afficher";
    case "tiles-unavailable":
      return "Le fond de carte est momentanément indisponible";
    case "permission-denied":
      return "L’accès à la localisation est refusé";
    case "ready":
      return "";
  }
}

export interface MapPoint {
  id: string;
  label: string;
  coordinates: Coordinates;
}

export interface MapModel {
  points: MapPoint[];
  polyline?: Coordinates[];
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapAdapter {
  status(model: MapModel): MapStatus;
  region(model: MapModel): MapRegion | null;
  supportsPolyline: boolean;
  polyline(model: MapModel): Coordinates[];
}

export function regionForPoints(points: MapPoint[]): MapRegion | null {
  return regionForCoordinates(points.map((point) => point.coordinates));
}

export function regionForCoordinates(
  coordinates: Coordinates[],
): MapRegion | null {
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const coordinate of coordinates) {
    if (
      !Number.isFinite(coordinate.latitude) ||
      !Number.isFinite(coordinate.longitude) ||
      coordinate.latitude < -90 ||
      coordinate.latitude > 90 ||
      coordinate.longitude < -180 ||
      coordinate.longitude > 180
    ) {
      continue;
    }

    minLat = Math.min(minLat, coordinate.latitude);
    maxLat = Math.max(maxLat, coordinate.latitude);
    minLng = Math.min(minLng, coordinate.longitude);
    maxLng = Math.max(maxLng, coordinate.longitude);
  }

  if (!Number.isFinite(minLat)) return null;

  const latitudeDelta = Math.min(
    Math.max(maxLat - minLat, 0.02) * 1.4,
    180,
  );
  const longitudeDelta = Math.min(
    Math.max(maxLng - minLng, 0.02) * 1.4,
    360,
  );

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}
