import type { Account } from "../modules/identity";
import type { Trip } from "../modules/trips";

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

export function currentTripForAccount(trips: Trip[]): Trip | null {
  return trips[0] ?? null;
}

export function tripDateLabel(trip: Trip): string {
  if (!trip.startsOn && !trip.endsOn) return "Dates à préciser";
  if (!trip.startsOn) return `Jusqu’au ${trip.endsOn}`;
  if (!trip.endsOn) return `À partir du ${trip.startsOn}`;
  return `${trip.startsOn} → ${trip.endsOn}`;
}
