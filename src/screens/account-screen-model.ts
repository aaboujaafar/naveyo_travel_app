import type { Account } from "../modules/identity";
import type { Trip } from "../modules/trips";
import { localToday, tripTiming } from "./trips-list-model";

export function accountInitials(account: Account | null): string {
  const localPart = account?.email.split("@")[0]?.trim() ?? "";
  const words = localPart.split(/[._+-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function accountDisplayName(account: Account | null): string {
  const localPart = account?.email.split("@")[0]?.trim() ?? "";
  if (!localPart) return "Compte Naveyo";
  return localPart
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}

/** The Voyage under way, otherwise the next departure, otherwise the first one listed. */
export function currentTripForAccount(trips: Trip[], today: string = localToday()): Trip | null {
  const ongoing = trips.find((trip) => tripTiming(trip, today).phase === "ongoing");
  if (ongoing) return ongoing;
  const upcoming = trips
    .filter((trip) => tripTiming(trip, today).phase === "upcoming")
    .sort((left, right) => (left.startsOn ?? "").localeCompare(right.startsOn ?? ""))[0];
  return upcoming ?? trips[0] ?? null;
}

/** Finished Voyages, most recent first. */
export function pastTrips(trips: Trip[], today: string = localToday()): Trip[] {
  return trips
    .filter((trip) => tripTiming(trip, today).phase === "past")
    .sort((left, right) => (right.endsOn ?? "").localeCompare(left.endsOn ?? ""));
}

export function tripDateLabel(trip: Trip): string {
  if (!trip.startsOn && !trip.endsOn) return "Dates à préciser";
  if (!trip.startsOn) return `Jusqu’au ${trip.endsOn}`;
  if (!trip.endsOn) return `À partir du ${trip.startsOn}`;
  return `${trip.startsOn} → ${trip.endsOn}`;
}
