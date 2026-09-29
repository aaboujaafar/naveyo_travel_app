import type {
  Coordinates,
  ItineraryItem,
  Stop,
  TrackPoint,
  TrackingStatus,
  UUID,
} from "../modules/_shared/model";
import type { MapModel } from "../adapters/map/interface";

const earthRadiusMeters = 6_371_000;
const maxPolylinePoints = 1_000;

export function formatLocalItineraryDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}

export function itineraryPointCount(items: ItineraryItem[]): number {
  return items.filter((item) => isValidCoordinates(item.place?.coordinates)).length;
}

export function buildItineraryMapModel(
  items: ItineraryItem[],
  trackPoints: TrackPoint[],
  stops: Stop[] = [],
  routePolyline: Coordinates[] = [],
): MapModel {
  const placePoints = items.flatMap((item) => {
    const coordinates = item.place?.coordinates;
    return isValidCoordinates(coordinates)
      ? [{ id: item.id, label: item.title, coordinates }]
      : [];
  });
  // Keep a confirmed Step visible even when it has no POI in the itinerary yet.
  const itemStopIds = new Set(items.map((item) => item.stopId));
  const stopPoints = stops.flatMap((stop) => {
    if (!isValidCoordinates(stop.coordinates) || itemStopIds.has(stop.id)) return [];
    return [{ id: `stop-${stop.id}`, label: stop.name, coordinates: stop.coordinates }];
  });
  const points = [...stopPoints, ...placePoints];
  const gpsPolyline = samplePolyline(
    trackPoints
      .filter((point) => isValidCoordinateValues(point.latitude, point.longitude))
      .map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
  );
  const plannedPolyline = validCoordinatePolyline(routePolyline);

  return {
    points,
    polyline:
      gpsPolyline.length > 1
        ? gpsPolyline
        : plannedPolyline.length > 1
          ? plannedPolyline
          : undefined,
  };
}

export function itineraryRouteCoordinates(
  items: ItineraryItem[],
  stop?: Stop,
): Coordinates[] {
  const candidates = [
    stop?.coordinates,
    ...items.map((item) => item.place?.coordinates),
  ].filter((coordinate): coordinate is Coordinates => isValidCoordinates(coordinate));
  const result: Coordinates[] = [];
  for (const coordinate of candidates) {
    const previous = result.at(-1);
    if (
      previous?.latitude === coordinate.latitude &&
      previous.longitude === coordinate.longitude
    ) {
      continue;
    }
    result.push(coordinate);
  }
  return result;
}

export function trackDistanceMeters(points: TrackPoint[]): number {
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (
      !previous ||
      !current ||
      !isValidCoordinateValues(
        previous.latitude,
        previous.longitude,
      ) ||
      !isValidCoordinateValues(current.latitude, current.longitude)
    ) {
      continue;
    }
    distance += haversineMeters(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude,
    );
  }
  return distance;
}

function samplePolyline(points: Coordinates[]): Coordinates[] {
  if (points.length <= maxPolylinePoints) return points;

  return Array.from({ length: maxPolylinePoints }, (_, index) => {
    const sourceIndex = Math.round(
      (index * (points.length - 1)) / (maxPolylinePoints - 1),
    );
    return points[sourceIndex];
  }).filter((point): point is Coordinates => point !== undefined);
}

function validCoordinatePolyline(points: Coordinates[]): Coordinates[] {
  return samplePolyline(points.filter((point) => isValidCoordinates(point)));
}

function isValidCoordinates(
  coordinates: Coordinates | undefined,
): coordinates is Coordinates {
  return (
    coordinates !== undefined &&
    isValidCoordinateValues(coordinates.latitude, coordinates.longitude)
  );
}

function isValidCoordinateValues(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function formatDistance(meters: number): string {
  if (meters < 1_000) return `${Math.round(meters)} m`;
  return `${(meters / 1_000).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

export function isTrackingAnotherTrip(
  status: TrackingStatus,
  tripId: UUID,
): boolean {
  return (
    status.state === "recording" &&
    status.tripId !== undefined &&
    status.tripId !== tripId
  );
}

function haversineMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const firstLatitude = toRadians(fromLatitude);
  const secondLatitude = toRadians(toLatitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
