import type { Coordinates } from "../../modules/_shared/model";

export type MapStatus =
  | "ready"
  | "empty"
  | "tiles-unavailable"
  | "permission-denied"
  | "native-unavailable";

export function mapStatusMessage(status: MapStatus): string {
  switch (status) {
    case "empty":
      return "Aucun lieu à afficher";
    case "tiles-unavailable":
      return "Le fond de carte est momentanément indisponible";
    case "permission-denied":
      return "L’accès à la localisation est refusé";
    case "native-unavailable":
      return "Le module cartographique n’est pas disponible sur cet appareil";
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

export function isValidCoordinate(coordinate: Coordinates): boolean {
  return (
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
}

export function validCoordinates(coordinates: Coordinates[]): Coordinates[] {
  return coordinates.filter(isValidCoordinate);
}

export function validMapPoints(points: MapPoint[]): MapPoint[] {
  return points.filter((point) => isValidCoordinate(point.coordinates));
}

export function regionForPoints(points: MapPoint[]): MapRegion | null {
  return regionForCoordinates(points.map((point) => point.coordinates));
}

export function regionForCoordinates(
  coordinates: Coordinates[],
): MapRegion | null {
  const valid = validCoordinates(coordinates);
  if (valid.length === 0) return null;

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const coordinate of valid) {
    minLat = Math.min(minLat, coordinate.latitude);
    maxLat = Math.max(maxLat, coordinate.latitude);
  }

  const longitude = longitudeBounds(valid.map((coordinate) => coordinate.longitude));

  const latitudeDelta = Math.min(
    Math.max(maxLat - minLat, 0.02) * 1.4,
    180,
  );
  const longitudeDelta = Math.min(
    Math.max(longitude.span, 0.02) * 1.4,
    360,
  );

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: longitude.center,
    latitudeDelta,
    longitudeDelta,
  };
}

interface LongitudeBounds {
  center: number;
  span: number;
}

function longitudeBounds(longitudes: number[]): LongitudeBounds {
  const sorted = [...longitudes].sort((left, right) => left - right);
  let largestGap = Number.NEGATIVE_INFINITY;
  let largestGapIndex = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index]!;
    const next =
      sorted[(index + 1) % sorted.length]! +
      (index === sorted.length - 1 ? 360 : 0);
    const gap = next - current;

    if (gap > largestGap) {
      largestGap = gap;
      largestGapIndex = index;
    }
  }

  const span = Math.max(0, 360 - largestGap);
  const start = sorted[(largestGapIndex + 1) % sorted.length]!;
  return {
    center: normalizeLongitude(start + span / 2),
    span,
  };
}

function normalizeLongitude(longitude: number): number {
  let normalized = longitude;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized;
}
