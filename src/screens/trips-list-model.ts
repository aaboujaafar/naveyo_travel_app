import type { Trip } from "../modules/_shared/model";

export function formatTripsListDateRange(trip: Trip): string {
  if (!trip.startsOn || !trip.endsOn) return "Dates à préciser";
  return `${formatDate(trip.startsOn)} – ${formatDate(trip.endsOn)}`;
}

export function tripMemberCount(trip: Trip): number {
  return trip.travelers.length || trip.members.length;
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}
