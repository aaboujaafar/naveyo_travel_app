import type {
  ItineraryItem,
  TrackPoint,
  TrackingStatus,
  UUID,
} from "../modules/_shared/model";

const earthRadiusMeters = 6_371_000;

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
  return items.filter((item) => item.place?.coordinates !== undefined).length;
}

export function trackDistanceMeters(points: TrackPoint[]): number {
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    distance += haversineMeters(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude,
    );
  }
  return distance;
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
