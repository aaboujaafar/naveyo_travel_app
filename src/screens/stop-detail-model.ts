import type {
  ItineraryItem,
  Reservation,
  Stop,
  TravelDocument,
} from "../modules/_shared/model";

export function filterItineraryForStop(
  items: ItineraryItem[],
  stop: Stop,
): ItineraryItem[] {
  return items
    .filter((item) => item.stopId === stop.id)
    .sort((left, right) => itinerarySortKey(left).localeCompare(itinerarySortKey(right)));
}

export function filterReservationsForStop(
  reservations: Reservation[],
  documents: TravelDocument[],
): Reservation[] {
  const linkedReservationIds = new Set(
    documents.flatMap((document) => document.reservationId ? [document.reservationId] : []),
  );
  return reservations
    .filter((reservation) => linkedReservationIds.has(reservation.id))
    .sort((left, right) => (left.start?.local ?? "9999").localeCompare(right.start?.local ?? "9999"));
}

export function formatStopDateRange(stop: Stop): string {
  if (stop.startDate === stop.endDate) return formatLocalDate(stop.startDate);
  return `${formatLocalDate(stop.startDate)} – ${formatLocalDate(stop.endDate)}`;
}

export function stopDayCount(stop: Stop): number {
  const start = parseLocalDate(stop.startDate);
  const end = parseLocalDate(stop.endDate);
  if (!start || !end || end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function formatItineraryLocalTime(item: ItineraryItem): string {
  const local = item.time?.local;
  if (!local) return "Sans heure";
  return /(?:T|\s)(\d{2}:\d{2})/.exec(local)?.[1] ?? local;
}

export function formatItineraryLocalDate(date: string): string {
  return formatLocalDate(date);
}

function itinerarySortKey(item: ItineraryItem): string {
  return `${item.date}|${item.time?.local ?? "99:99"}|${item.title}`;
}

function formatLocalDate(value: string): string {
  const parsed = parseLocalDate(value);
  if (!parsed) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
