import type { ItineraryItem, Stop, TrackPoint } from "../modules/_shared/model";

export interface TracePoint {
  latitude: number;
  longitude: number;
  /** Epoch milliseconds, when known: it places each photo along the trace. */
  at?: number;
}

export interface StoryPhoto {
  id: string;
  uri: string;
  takenAt: number;
  location?: { latitude: number; longitude: number };
}

export type StorySlide =
  | { kind: "cover"; title: string; subtitle: string }
  | { kind: "photo"; photo: StoryPhoto; caption: string; traceProgress: number }
  | { kind: "summary"; title: string; lines: string[] };

/**
 * The line drawn on the stories: the GPS trace when it was recorded, otherwise
 * the planned places in programme order, otherwise the Étapes.
 */
export function buildTripTrace(input: {
  trackPoints: readonly TrackPoint[];
  itinerary: readonly ItineraryItem[];
  stops: readonly Stop[];
}): TracePoint[] {
  const recorded = input.trackPoints
    .filter((point) => validCoordinates(point.latitude, point.longitude))
    .map((point) => ({ latitude: point.latitude, longitude: point.longitude, at: Date.parse(point.recordedAt) }))
    .sort((left, right) => (left.at ?? 0) - (right.at ?? 0));
  if (recorded.length >= 2) return recorded;

  const planned = [...input.itinerary]
    .filter((item) => item.place?.coordinates && validCoordinates(item.place.coordinates.latitude, item.place.coordinates.longitude))
    .sort((left, right) => `${left.date}${left.time?.local ?? ""}`.localeCompare(`${right.date}${right.time?.local ?? ""}`))
    .map((item) => ({ latitude: item.place!.coordinates!.latitude, longitude: item.place!.coordinates!.longitude }));
  if (planned.length >= 2) return planned;

  return [...input.stops]
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
    .flatMap((stop) => (stop.coordinates ? [{ latitude: stop.coordinates.latitude, longitude: stop.coordinates.longitude }] : []));
}

/**
 * Fits the trace in a box, keeping its shape (longitudes are shortened by the
 * cosine of the latitude), and returns an SVG path plus the projection used.
 */
export function projectTrace(points: readonly TracePoint[], box: { width: number; height: number; padding: number }): {
  path: string;
  project: (point: { latitude: number; longitude: number }) => { x: number; y: number };
} {
  const valid = points.filter((point) => validCoordinates(point.latitude, point.longitude));
  if (valid.length === 0) return { path: "", project: () => ({ x: box.width / 2, y: box.height / 2 }) };
  const meanLatitude = valid.reduce((sum, point) => sum + point.latitude, 0) / valid.length;
  const scaleX = Math.cos((meanLatitude * Math.PI) / 180);
  const xs = valid.map((point) => point.longitude * scaleX);
  const ys = valid.map((point) => -point.latitude);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  const innerWidth = box.width - box.padding * 2;
  const innerHeight = box.height - box.padding * 2;
  // A single place (or a very short trace) is centred rather than blown up.
  const scale = Math.min(innerWidth / Math.max(spanX, 1e-4), innerHeight / Math.max(spanY, 1e-4));
  const offsetX = box.padding + (innerWidth - spanX * scale) / 2;
  const offsetY = box.padding + (innerHeight - spanY * scale) / 2;
  const project = (point: { latitude: number; longitude: number }) => ({
    x: round(offsetX + (point.longitude * scaleX - minX) * scale),
    y: round(offsetY + (-point.latitude - minY) * scale),
  });
  const path = valid
    .map((point, index) => {
      const { x, y } = project(point);
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
  return { path, project };
}

/** The part of the trace already travelled at a given moment, from 0 to 1. */
export function traceProgressAt(trace: readonly TracePoint[], at: number): number {
  const timed = trace.filter((point) => point.at !== undefined && Number.isFinite(point.at));
  if (timed.length < 2) return 1;
  const reached = timed.filter((point) => (point.at ?? 0) <= at).length;
  return Math.min(1, Math.max(0, reached / timed.length));
}

/**
 * Photos taken during the Voyage, near the trace when their position is known.
 * The preselection spreads up to `max` photos across the days.
 */
export function suggestTripPhotos(
  photos: readonly StoryPhoto[],
  options: { startsOn?: string; endsOn?: string; timeZone: string; trace: readonly TracePoint[]; max?: number; maxDistanceMeters?: number },
): { photos: StoryPhoto[]; preselectedIds: string[] } {
  const max = options.max ?? 8;
  const maxDistance = options.maxDistanceMeters ?? 30_000;
  const inTrip = photos
    .filter((photo) => {
      const date = localDate(photo.takenAt, options.timeZone);
      return (!options.startsOn || date >= options.startsOn) && (!options.endsOn || date <= options.endsOn);
    })
    .filter((photo) => !photo.location || options.trace.length === 0 || distanceToTrace(photo.location, options.trace) <= maxDistance)
    .sort((left, right) => left.takenAt - right.takenAt);

  const byDay = new Map<string, StoryPhoto[]>();
  for (const photo of inTrip) {
    const day = localDate(photo.takenAt, options.timeZone);
    byDay.set(day, [...(byDay.get(day) ?? []), photo]);
  }
  // Round robin over the days, so a single busy afternoon does not fill the story.
  const queues = [...byDay.values()].map((dayPhotos) => spreadEvenly(dayPhotos));
  const preselected: StoryPhoto[] = [];
  while (preselected.length < max && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && preselected.length < max) preselected.push(next);
    }
  }
  return {
    photos: inTrip,
    preselectedIds: preselected.sort((left, right) => left.takenAt - right.takenAt).map((photo) => photo.id),
  };
}

export function buildStorySlides(input: {
  title: string;
  dates: string;
  summaryLines: string[];
  photos: readonly StoryPhoto[];
  trace: readonly TracePoint[];
  stops: readonly Stop[];
  timeZone: string;
}): StorySlide[] {
  const photos = [...input.photos].sort((left, right) => left.takenAt - right.takenAt);
  return [
    { kind: "cover", title: input.title, subtitle: input.dates },
    ...photos.map((photo): StorySlide => {
      const date = localDate(photo.takenAt, input.timeZone);
      const stop = input.stops.find((candidate) => candidate.startDate <= date && date <= candidate.endDate);
      return {
        kind: "photo",
        photo,
        caption: [stop?.name, formatShortDate(date)].filter(Boolean).join(" · "),
        traceProgress: traceProgressAt(input.trace, photo.takenAt),
      };
    }),
    { kind: "summary", title: input.title, lines: input.summaryLines },
  ];
}

/** Local calendar date ("YYYY-MM-DD") of an instant in a time zone. */
export function localDate(at: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
  } catch {
    return new Date(at).toISOString().slice(0, 10);
  }
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function spreadEvenly<T>(values: T[]): T[] {
  // First, last, middle… so the best spread comes first in the queue.
  if (values.length <= 2) return [...values];
  const order: T[] = [];
  const used = new Set<number>();
  const visit = (start: number, end: number) => {
    if (start > end) return;
    const middle = Math.floor((start + end) / 2);
    if (!used.has(middle)) {
      used.add(middle);
      order.push(values[middle]!);
    }
    visit(start, middle - 1);
    visit(middle + 1, end);
  };
  order.push(values[0]!, values[values.length - 1]!);
  used.add(0);
  used.add(values.length - 1);
  visit(1, values.length - 2);
  return order;
}

function distanceToTrace(point: { latitude: number; longitude: number }, trace: readonly TracePoint[]): number {
  return Math.min(...trace.map((candidate) => haversineMeters(point, candidate)));
}

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function validCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
