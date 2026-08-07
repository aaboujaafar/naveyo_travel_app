import type { LocationObject } from "expo-location";
import type {
  ISODateTime,
  TrackPoint,
  UUID,
} from "../../modules/_shared/model";

export interface StoredTrackingState {
  readonly tripId: UUID;
  readonly points: readonly TrackPoint[];
}

export function makeTrackPoint(
  tripId: UUID,
  location: LocationObject,
): TrackPoint {
  const { latitude, longitude, accuracy } = location.coords;
  const { timestamp } = location;
  const recordedAt = new Date(timestamp).toISOString() as ISODateTime;
  const accuracyMeters = Math.max(0, accuracy ?? 0);
  const idempotencyKey = `${tripId}:${timestamp}:${latitude.toFixed(7)}:${longitude.toFixed(7)}`;

  return { idempotencyKey, latitude, longitude, recordedAt, accuracyMeters };
}

export function appendUniquePoint(
  points: readonly TrackPoint[],
  next: TrackPoint,
): TrackPoint[] {
  if (points.some((point) => point.idempotencyKey === next.idempotencyKey))
    return [...points];
  return [...points, next];
}

export function parseStoredTrackingState(
  value: string,
  tripId: UUID,
): StoredTrackingState {
  const parsed: unknown = JSON.parse(value);
  if (
    !isRecord(parsed) ||
    parsed.tripId !== tripId ||
    !Array.isArray(parsed.points)
  ) {
    throw new Error("Invalid stored tracking state");
  }

  const points = parsed.points.filter(isTrackPoint);
  return { tripId, points };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTrackPoint(value: unknown): value is TrackPoint {
  if (!isRecord(value)) return false;
  return (
    typeof value.idempotencyKey === "string" &&
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    typeof value.recordedAt === "string" &&
    typeof value.accuracyMeters === "number"
  );
}
