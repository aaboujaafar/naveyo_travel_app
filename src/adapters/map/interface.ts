import type { Coordinates } from "../../modules/_shared/model";

export type MapStatus =
  | "ready"
  | "empty"
  | "tiles-unavailable"
  | "permission-denied";

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
  if (points.length === 0) return null;
  const latitudes = points.map((point) => point.coordinates.latitude);
  const longitudes = points.map((point) => point.coordinates.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat, 0.02) * 1.4,
    longitudeDelta: Math.max(maxLng - minLng, 0.02) * 1.4,
  };
}
