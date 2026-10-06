import type { ItineraryItem, LocalDateTime, PlaceReference, Reservation, ReservationType, Stop } from "../modules/_shared/model";

export interface CalendarEventDraft {
  /** Stable key, so an export can be compared with the previous one. */
  key: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  timeZone: string;
  location?: string;
  notes?: string;
  /** Minutes before the start, negative as the calendar expects. */
  alarmOffsetMinutes?: number;
}

const ACTIVITY_MINUTES = 90;
const TRAVEL_ALARM_MINUTES = 60;
const ACTIVITY_ALARM_MINUTES = 30;
const TRAVEL_TYPES: ReadonlySet<ReservationType> = new Set(["flight", "train", "ferry"]);
const RESERVATION_ICONS: Record<ReservationType, string> = {
  flight: "✈️",
  train: "🚆",
  ferry: "⛴️",
  accommodation: "🛏️",
  activity: "🎟️",
  other: "📌",
};

/**
 * Calendar events for the programme and the confirmed reservations. Times are
 * the local wall clock of each Étape, converted with its time zone.
 */
export function buildCalendarEvents(input: {
  items: readonly ItineraryItem[];
  reservations: readonly Reservation[];
  stops: readonly Stop[];
  /** Formalities to do before leaving (ESTA, e-visa…), shown on their deadline. */
  deadlines?: readonly { key: string; title: string; date: string; url?: string }[];
}): CalendarEventDraft[] {
  const stopZone = new Map(input.stops.map((stop) => [stop.id as string, stop.timeZone as string]));
  const fallbackZone = input.stops[0]?.timeZone ?? "UTC";

  const activities = input.items.map((item): CalendarEventDraft => {
    const timeZone = item.time?.timeZone ?? stopZone.get(item.stopId) ?? fallbackZone;
    const clock = clockOf(item.time?.local);
    const location = describePlace(item.place);
    if (!clock) {
      return { key: `item:${item.id}`, title: item.title, ...allDay(item.date, item.date), timeZone, ...(location ? { location } : {}), ...(item.notes ? { notes: item.notes } : {}) };
    }
    const startDate = zonedDate(`${item.date}T${clock}`, timeZone);
    return {
      key: `item:${item.id}`,
      title: item.title,
      startDate,
      endDate: new Date(startDate.getTime() + ACTIVITY_MINUTES * 60_000),
      allDay: false,
      timeZone,
      ...(location ? { location } : {}),
      ...(item.notes ? { notes: item.notes } : {}),
      alarmOffsetMinutes: -ACTIVITY_ALARM_MINUTES,
    };
  });

  const bookings = input.reservations.flatMap((reservation): CalendarEventDraft[] => {
    if (!reservation.start) return [];
    const title = `${RESERVATION_ICONS[reservation.type]} ${reservation.title}`;
    const timeZone = reservation.start.timeZone ?? fallbackZone;
    const location = describePlace(reservation.venue ?? reservation.origin);
    const notes = [reservation.provider, reservation.reference ? `Réf. ${reservation.reference}` : null].filter(Boolean).join(" · ");
    const extras = { ...(location ? { location } : {}), ...(notes ? { notes } : {}) };
    const startClock = clockOf(reservation.start.local);
    if (!startClock) {
      const endDay = reservation.end?.local.slice(0, 10) ?? reservation.start.local.slice(0, 10);
      return [{ key: `reservation:${reservation.id}`, title, ...allDay(reservation.start.local.slice(0, 10), endDay), timeZone, ...extras }];
    }
    const startDate = zonedDate(`${reservation.start.local.slice(0, 10)}T${startClock}`, timeZone);
    const endDate = endOf(reservation.end, startDate, fallbackZone);
    return [{
      key: `reservation:${reservation.id}`,
      title,
      startDate,
      endDate,
      allDay: false,
      timeZone,
      ...extras,
      alarmOffsetMinutes: -(TRAVEL_TYPES.has(reservation.type) ? TRAVEL_ALARM_MINUTES : ACTIVITY_ALARM_MINUTES),
    }];
  });

  const formalities = (input.deadlines ?? []).map((deadline): CalendarEventDraft => ({
    key: deadline.key,
    title: `📝 ${deadline.title}`,
    ...allDay(deadline.date, deadline.date),
    timeZone: fallbackZone,
    ...(deadline.url ? { notes: deadline.url } : {}),
  }));

  return [...formalities, ...bookings, ...activities].sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
}

/**
 * The instant at which a wall clock ("YYYY-MM-DDTHH:MM") reads in a time zone.
 * Two passes absorb daylight-saving changes.
 */
export function zonedDate(local: string, timeZone: string): Date {
  const [date, time = "00:00"] = local.split("T");
  const [year, month, day] = date!.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wallClock = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  let instant = wallClock - offsetMinutes(wallClock, timeZone) * 60_000;
  instant = wallClock - offsetMinutes(instant, timeZone) * 60_000;
  return new Date(instant);
}

function offsetMinutes(instant: number, timeZone: string): number {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(instant))
        .map((part) => [part.type, part.value]),
    );
    const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    return Math.round((asUtc - Math.floor(instant / 60_000) * 60_000) / 60_000);
  } catch {
    return 0;
  }
}

function endOf(end: LocalDateTime | undefined, startDate: Date, fallbackZone: string): Date {
  const clock = clockOf(end?.local);
  if (end && clock) {
    const endDate = zonedDate(`${end.local.slice(0, 10)}T${clock}`, end.timeZone ?? fallbackZone);
    if (endDate.getTime() > startDate.getTime()) return endDate;
  }
  return new Date(startDate.getTime() + ACTIVITY_MINUTES * 60_000);
}

function allDay(startDay: string, endDay: string): Pick<CalendarEventDraft, "startDate" | "endDate" | "allDay"> {
  // The calendar places all-day events on the iPhone's own calendar days, so these dates are device-local.
  const local = (day: string, hour: number, minute: number) => {
    const [year, month, date] = day.split("-").map(Number);
    return new Date(year!, month! - 1, date!, hour, minute);
  };
  return { startDate: local(startDay, 0, 0), endDate: local(endDay >= startDay ? endDay : startDay, 23, 59), allDay: true };
}

function clockOf(local?: string): string | null {
  const match = local ? /T(\d{2}):(\d{2})/.exec(local) ?? /^(\d{2}):(\d{2})$/.exec(local) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

function describePlace(place?: PlaceReference): string | undefined {
  if (!place) return undefined;
  return place.address ? `${place.label}, ${place.address}` : place.label || undefined;
}
