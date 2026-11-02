import type { OpeningHours } from "../_shared/model";

/** Minutes from midnight of `day` (0 = Sunday); `end` goes past 1440 for overnight hours. */
export interface OpeningInterval {
  day: number;
  start: number;
  end: number;
}

export type OpeningStatus = "open" | "closed-day" | "closed-time" | "unknown";

const DAYS: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
const DAY = "(?:Mo|Tu|We|Th|Fr|Sa|Su)";
const DAY_ITEM = `(?:${DAY}(?:-${DAY})?|PH|SH)`;
const SELECTOR = new RegExp(`^(${DAY_ITEM}(?:\\s*,\\s*${DAY_ITEM})*)(?:\\s+(.*))?$`);
const FRENCH_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * Weekly opening intervals from structured periods or from an OpenStreetMap
 * `opening_hours` text. Anything the parser does not fully understand (months,
 * sunrise, comments…) gives `null`: the app then says nothing rather than warn wrongly.
 */
export function openingIntervals(hours: OpeningHours | undefined): OpeningInterval[] | null {
  if (!hours) return null;
  if (hours.periods && hours.periods.length > 0) {
    // A single period without a closing time means "always open".
    if (hours.periods.length === 1 && !hours.periods[0]!.close) return allWeek(0, 1_440);
    const intervals: OpeningInterval[] = [];
    for (const period of hours.periods) {
      if (!period.close) return null;
      const start = period.open.hour * 60 + period.open.minute;
      const dayShift = (period.close.day - period.open.day + 7) % 7;
      let end = dayShift * 1_440 + period.close.hour * 60 + period.close.minute;
      if (end <= start) end += 7 * 1_440;
      intervals.push({ day: period.open.day, start, end });
    }
    return intervals;
  }
  return hours.sourceText ? parseOsmOpeningHours(hours.sourceText) : null;
}

export function parseOsmOpeningHours(value: string): OpeningInterval[] | null {
  const text = value.trim();
  if (!text) return null;
  if (text === "24/7") return allWeek(0, 1_440);
  const byDay = new Map<number, OpeningInterval[]>();
  let sawRule = false;

  for (const rawRule of text.split(/;|\|\|/)) {
    const rule = rawRule.trim();
    if (!rule) continue;
    let days: number[];
    let times: string;
    const selector = SELECTOR.exec(rule);
    if (selector) {
      const items = selector[1]!.split(",").map((item) => item.trim());
      // Holidays cannot be known offline: rules for them are ignored.
      const weekdays = items.filter((item) => item !== "PH" && item !== "SH");
      if (weekdays.length === 0) continue;
      days = weekdays.flatMap(expandDays);
      times = (selector[2] ?? "").trim();
      if (!times) return null;
    } else if (/^\d{1,2}:\d{2}/.test(rule)) {
      days = [0, 1, 2, 3, 4, 5, 6];
      times = rule;
    } else {
      return null;
    }

    sawRule = true;
    if (/^(off|closed)$/i.test(times)) {
      for (const day of days) byDay.set(day, []);
      continue;
    }
    const intervals: { start: number; end: number }[] = [];
    for (const slot of times.split(",").map((part) => part.trim())) {
      const match = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(slot);
      if (!match) return null;
      const start = Number(match[1]) * 60 + Number(match[2]);
      let end = Number(match[3]) * 60 + Number(match[4]);
      if (start > 1_440 || end > 1_440 || Number(match[2]) > 59 || Number(match[4]) > 59) return null;
      if (end <= start) end += 1_440;
      intervals.push({ start, end });
    }
    // In OpenStreetMap a later rule replaces what an earlier one said for the same day.
    for (const day of days) byDay.set(day, intervals.map((interval) => ({ day, ...interval })));
  }

  if (!sawRule) return null;
  return [...byDay.values()].flat();
}

/** Whether a place is open on a local date, and at a local time when one is given. */
export function openingStatusOn(hours: OpeningHours | undefined, date: string, time?: string): OpeningStatus {
  const intervals = openingIntervals(hours);
  const day = weekday(date);
  if (!intervals || day === null) return "unknown";
  const minute = time ? clockMinutes(time) : null;
  const relevant = intervals.flatMap((interval) => {
    const offset = (day - interval.day + 7) % 7;
    const start = interval.start - offset * 1_440;
    const end = interval.end - offset * 1_440;
    return end > 0 && start < 1_440 ? [{ start, end }] : [];
  });
  if (relevant.length === 0) return "closed-day";
  if (minute === null) return "open";
  return relevant.some((interval) => interval.start <= minute && minute < interval.end) ? "open" : "closed-time";
}

/** "10:00–18:00", "12:00–15:00, 19:00–23:00", "Fermé" or "24 h/24" for one weekday. */
export function describeOpeningDay(intervals: readonly OpeningInterval[], day: number): string {
  const own = intervals.filter((interval) => interval.day === day).sort((left, right) => left.start - right.start);
  if (own.length === 0) return "Fermé";
  if (own.some((interval) => interval.start === 0 && interval.end >= 1_440)) return "24 h/24";
  return own.map((interval) => `${clock(interval.start)}–${clock(interval.end % 1_440)}`).join(", ");
}

/** The week from Monday, ready to display, or null when the hours are unknown. */
export function weeklyOpeningHours(hours: OpeningHours | undefined): { label: string; hours: string }[] | null {
  const intervals = openingIntervals(hours);
  if (!intervals) return null;
  return [1, 2, 3, 4, 5, 6, 0].map((day) => ({ label: FRENCH_DAYS[day]!, hours: describeOpeningDay(intervals, day) }));
}

export function weekday(date: string): number | null {
  const parsed = new Date(`${date}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parsed.getTime()) ? parsed.getUTCDay() : null;
}

function expandDays(item: string): number[] {
  const [from, to] = item.split("-").map((part) => DAYS[part.trim()]!);
  if (to === undefined) return [from!];
  const days: number[] = [];
  for (let day = from!; ; day = (day + 1) % 7) {
    days.push(day);
    if (day === to || days.length === 7) break;
  }
  return days;
}

function allWeek(start: number, end: number): OpeningInterval[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start, end }));
}

function clockMinutes(value: string): number | null {
  const match = /(\d{2}):(\d{2})/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
