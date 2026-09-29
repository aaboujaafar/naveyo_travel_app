import type { Coordinates, ItineraryItem, Stop, Trip } from "../modules/_shared/model";
import type { MapModel } from "../adapters/map";

const frenchMonths = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

interface DateParts {
  day: number;
  month: number;
  year: number;
}

export function formatTripDateRange(
  startsOn?: string,
  endsOn?: string,
): string {
  const start = startsOn ? parseLocalDate(startsOn) : null;
  const end = endsOn ? parseLocalDate(endsOn) : null;

  if (!start || !end) return "Dates à préciser";
  if (start.year === end.year && start.month === end.month) {
    return `${start.day}–${end.day} ${frenchMonths[start.month - 1]}`;
  }
  if (start.year === end.year) {
    return `${start.day} ${frenchMonths[start.month - 1]}–${end.day} ${frenchMonths[end.month - 1]}`;
  }
  return `${start.day} ${frenchMonths[start.month - 1]} ${start.year}–${end.day} ${frenchMonths[end.month - 1]} ${end.year}`;
}

export function countTripDays(startsOn?: string, endsOn?: string): number | null {
  const start = startsOn ? parseLocalDate(startsOn) : null;
  const end = endsOn ? parseLocalDate(endsOn) : null;
  if (!start || !end) return null;

  const startTime = Date.UTC(start.year, start.month - 1, start.day);
  const endTime = Date.UTC(end.year, end.month - 1, end.day);
  if (endTime < startTime) return null;
  return Math.floor((endTime - startTime) / 86_400_000) + 1;
}

export function getTravelerCount(trip: Trip): number {
  return trip.travelers.length > 0 ? trip.travelers.length : trip.members.length;
}

export function sortStopsByLocalDate(stops: readonly Stop[]): Stop[] {
  return [...stops].sort((left, right) => {
    const dateComparison = left.startDate.localeCompare(right.startDate);
    return dateComparison !== 0 ? dateComparison : left.name.localeCompare(right.name);
  });
}

export function formatStopDates(stop: Stop): string {
  return formatTripDateRange(stop.startDate, stop.endDate);
}

export interface DashboardMapPresentation {
  model: MapModel;
  confirmedPlaceCount: number;
  locatedPlaceCount: number;
  unlocatedPlaceCount: number;
}

export function buildDashboardMapPresentation(
  stops: readonly Stop[],
  items: readonly ItineraryItem[],
  routePolyline: Coordinates[] = [],
): DashboardMapPresentation {
  const stopOrder = new Map(stops.map((stop, index) => [stop.id, index + 1]));
  const stopPoints = stops.flatMap((stop, index) =>
    isValidCoordinates(stop.coordinates)
      ? [{ id: `stop-${stop.id}`, label: `Étape ${index + 1} · ${stop.name}`, coordinates: stop.coordinates }]
      : [],
  );
  const placePoints = [];
  let confirmedPlaceCount = 0;
  let unlocatedPlaceCount = 0;

  for (const item of items) {
    const place = item.place;
    const stopNumber = stopOrder.get(item.stopId);
    if (place === undefined || stopNumber === undefined) continue;

    confirmedPlaceCount += 1;
    if (!isValidCoordinates(place.coordinates)) {
      unlocatedPlaceCount += 1;
      continue;
    }

    placePoints.push({
      id: item.id,
      label: `Étape ${stopNumber} · ${place.label || item.title}`,
      coordinates: place.coordinates,
    });
  }

  return {
    model: {
      points: [...stopPoints, ...placePoints],
      ...(routePolyline.length > 1 ? { polyline: routePolyline } : {}),
    },
    confirmedPlaceCount,
    locatedPlaceCount: placePoints.length,
    unlocatedPlaceCount,
  };
}

export function dashboardRouteCoordinates(
  stops: readonly Stop[],
  items: readonly ItineraryItem[],
): Coordinates[] {
  const candidates = [
    ...stops.map((stop) => stop.coordinates),
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

function isValidCoordinates(value: Coordinates | null | undefined): value is Coordinates {
  return (
    value != null &&
    typeof value === "object" &&
    "latitude" in value &&
    "longitude" in value &&
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

function parseLocalDate(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return { day, month, year };
}
