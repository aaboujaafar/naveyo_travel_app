import type { ItineraryItem, Reservation, Stop, Trip } from "../modules/_shared/model";
import { tripTiming } from "./trips-list-model";

export interface TodayEntry {
  item: ItineraryItem;
  /** "HH:MM", or null when the activity has no time yet. */
  time: string | null;
  status: "done" | "next" | "later" | "unscheduled";
}

export interface TodayPlan {
  date: string;
  dayNumber: number;
  dayCount: number;
  stop: Stop | null;
  entries: TodayEntry[];
  next: TodayEntry | null;
  reservations: Reservation[];
}

/**
 * The day the travellers are living, when the Voyage is under way. `now` is the
 * local wall clock of the Étape ("YYYY-MM-DDTHH:MM"), so no device timezone leaks in.
 */
export function buildTodayPlan(input: {
  trip: Pick<Trip, "startsOn" | "endsOn">;
  stops: readonly Stop[];
  items: readonly ItineraryItem[];
  reservations?: readonly Reservation[];
  now: string;
}): TodayPlan | null {
  const date = input.now.slice(0, 10);
  const clock = input.now.slice(11, 16);
  const timing = tripTiming(input.trip, date);
  if (timing.phase !== "ongoing") return null;

  const stop = input.stops.find((candidate) => candidate.startDate <= date && date <= candidate.endDate) ?? null;
  const scheduled = input.items
    .filter((item) => item.date === date)
    .map((item) => ({ item, time: localClock(item.time?.local) }))
    .sort((left, right) => (left.time ?? "99:99").localeCompare(right.time ?? "99:99"));

  let nextAssigned = false;
  const entries: TodayEntry[] = scheduled.map(({ item, time }) => {
    if (time === null) return { item, time, status: "unscheduled" };
    if (time < clock) return { item, time, status: "done" };
    if (!nextAssigned) {
      nextAssigned = true;
      return { item, time, status: "next" };
    }
    return { item, time, status: "later" };
  });

  const start = Date.parse(`${input.trip.startsOn}T00:00:00Z`);
  const end = Date.parse(`${input.trip.endsOn}T00:00:00Z`);
  const today = Date.parse(`${date}T00:00:00Z`);
  return {
    date,
    dayNumber: Math.round((today - start) / 86_400_000) + 1,
    dayCount: Math.round((end - start) / 86_400_000) + 1,
    stop,
    entries,
    next: entries.find((entry) => entry.status === "next") ?? null,
    reservations: (input.reservations ?? []).filter((reservation) => reservationDate(reservation) === date),
  };
}

/** Local wall clock in a time zone, as "YYYY-MM-DDTHH:MM". */
export function localNow(timeZone: string, now: Date = new Date()): string {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch {
    return now.toISOString().slice(0, 16);
  }
}

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

function localClock(value?: string): string | null {
  const match = value ? /T?(\d{2}):(\d{2})/.exec(value) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

function reservationDate(reservation: Reservation): string | undefined {
  return reservation.start?.local.slice(0, 10);
}
