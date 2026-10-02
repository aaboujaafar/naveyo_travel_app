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

export type TripTiming =
  | { phase: "undated"; label: string }
  | { phase: "upcoming"; label: string; daysUntil: number }
  | { phase: "ongoing"; label: string; progress: number }
  | { phase: "past"; label: string };

/** Where the Voyage stands relative to `today` (a local YYYY-MM-DD date). */
export function tripTiming(trip: Pick<Trip, "startsOn" | "endsOn">, today: string): TripTiming {
  const start = dayNumber(trip.startsOn);
  const end = dayNumber(trip.endsOn);
  const now = dayNumber(today);
  if (start === null || end === null || now === null) return { phase: "undated", label: "Dates à préciser" };
  if (now < start) {
    const daysUntil = start - now;
    return { phase: "upcoming", daysUntil, label: daysUntil === 1 ? "Départ demain" : `Départ dans ${daysUntil} jours` };
  }
  if (now > end) return { phase: "past", label: "Voyage terminé" };
  const day = now - start + 1;
  const total = end - start + 1;
  return { phase: "ongoing", progress: day / total, label: `En cours · jour ${day} sur ${total}` };
}

export function localToday(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayNumber(value: string | undefined): number | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
}
