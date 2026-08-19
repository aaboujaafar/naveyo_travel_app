import { haversineDistanceMeters, type DiscoveredPlace } from "./day-place-discovery.ts";

export type SchedulableDayItem = {
  candidateId: string;
  title: string;
  reason: string;
  localTime: string;
  durationMinutes: number;
};

export type VerifiedDayItem = SchedulableDayItem & {
  openingStatus: "verified_open" | "unknown";
  distanceFromPreviousMeters?: number;
};

type ValidationInput = {
  date: string;
  items: SchedulableDayItem[];
  candidates: DiscoveredPlace[];
  mobility: "walking" | "motorized";
};

type OpeningInterval = { day: number; start: number; end: number };
type OpeningResult = "open" | "closed" | "unknown";
type RejectedDayItem = { candidateId: string; reason: "closed" | "business_closed" | "geographic_jump" };

const DAY_NAMES: Record<string, number> = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 };
const CLOSED_STATUSES = new Set(["permanently_closed", "temporarily_closed"]);

const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

const text = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;

const number = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) ? value : undefined;

const minuteOf = (value: unknown): number | undefined => {
  const entry = record(value);
  const hour = number(entry?.hour);
  const minute = number(entry?.minute) ?? 0;
  if (hour === undefined || hour < 0 || hour > 24 || minute < 0 || minute > 59) return undefined;
  if (hour === 24 && minute !== 0) return undefined;
  return hour * 60 + minute;
};

const weekdayOf = (date: string): number | undefined => {
  const parsed = new Date(`${date}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parsed.getTime()) ? parsed.getUTCDay() : undefined;
};

const structuredIntervals = (value: unknown): OpeningInterval[] | undefined => {
  const hours = record(value);
  if (!hours) return undefined;
  if (hours.isOpen24Hours === true || hours.open24Hours === true) {
    return Array.from({ length: 7 }, (_, day) => ({ day, start: 0, end: 10_080 }));
  }
  if (!Array.isArray(hours.periods)) return undefined;
  const result: OpeningInterval[] = [];
  for (const periodValue of hours.periods) {
    const period = record(periodValue);
    const open = record(period?.open);
    const close = record(period?.close);
    const day = number(open?.day);
    const start = minuteOf(open);
    if (day === undefined || day < 0 || day > 6 || start === undefined) continue;
    if (!close) {
      result.push({ day, start, end: start + 10_080 });
      continue;
    }
    const closeDay = number(close.day);
    const closeMinute = minuteOf(close);
    if (closeDay === undefined || closeDay < 0 || closeDay > 6 || closeMinute === undefined) continue;
    let duration = (closeDay - day) * 1_440 + closeMinute - start;
    if (duration <= 0) duration += 7 * 1_440;
    result.push({ day, start, end: start + duration });
  }
  return result;
};

const parseOsmDayPart = (value: string): number[] | undefined => {
  const days: number[] = [];
  for (const part of value.split(",")) {
    const pieces = part.trim().split("-");
    if (pieces.length > 2 || !pieces.every((piece) => DAY_NAMES[piece] !== undefined)) return undefined;
    const first = DAY_NAMES[pieces[0]];
    const last = DAY_NAMES[pieces[pieces.length - 1]];
    if (pieces.length === 1) days.push(first);
    else if (first <= last) for (let day = first; day <= last; day += 1) days.push(day % 7);
    else for (let day = first; day !== last; day = (day + 1) % 7) days.push(day);
    if (pieces.length === 2) days.push(last);
  }
  return days.length > 0 ? [...new Set(days)] : undefined;
};

const parseOsmTime = (value: string): number | undefined => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 24 && minute < 60 && !(hour === 24 && minute !== 0) ? hour * 60 + minute : undefined;
};

const osmIntervals = (value: string): OpeningInterval[] | undefined => {
  if (value === "24/7") return Array.from({ length: 7 }, (_, day) => ({ day, start: 0, end: 10_080 }));
  const result: OpeningInterval[] = [];
  for (const rawPart of value.split(";")) {
    const part = rawPart.trim();
    if (!part) return undefined;
    const match = /^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su)|,\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))*)\s+(.+)$/.exec(part);
    if (!match) return undefined;
    const days = parseOsmDayPart(match[1]);
    const timeText = match[2].trim();
    if (!days) return undefined;
    if (timeText === "off") continue;
    const slots = timeText.split(",").map((slot) => slot.trim());
    for (const slot of slots) {
      const times = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(slot);
      if (!times) return undefined;
      const start = parseOsmTime(times[1]);
      const end = parseOsmTime(times[2]);
      if (start === undefined || end === undefined) return undefined;
      for (const day of days) result.push({ day, start, end: end <= start ? end + 1_440 : end });
    }
  }
  return result;
};

const openingIntervalsFor = (candidate: DiscoveredPlace): OpeningInterval[] | undefined => {
  const metadata = candidate as unknown as Record<string, unknown>;
  const structured = structuredIntervals(metadata.openingHours ?? metadata.currentOpeningHours);
  if (structured) return structured;
  const openingHours = record(metadata.openingHours);
  const sourceText = text(openingHours?.sourceText ?? metadata.opening_hours ?? metadata.openingHoursSourceText ?? metadata.sourceText);
  return sourceText ? osmIntervals(sourceText) : undefined;
};

const openingStatus = (candidate: DiscoveredPlace | undefined, date: string, start: number, duration: number): OpeningResult => {
  if (!candidate) return "unknown";
  const metadata = candidate as unknown as Record<string, unknown>;
  const businessStatus = text(metadata.businessStatus)?.toLowerCase().replace(/[ -]/g, "_");
  if (businessStatus && CLOSED_STATUSES.has(businessStatus)) return "closed";
  const intervals = openingIntervalsFor(candidate);
  if (!intervals) return "unknown";
  const day = weekdayOf(date);
  if (day === undefined) return "unknown";
  const end = start + duration;
  const covers = intervals.some((interval) => {
    const offset = (day - interval.day + 7) % 7;
    const intervalStart = -offset * 1_440 + interval.start;
    const intervalEnd = intervalStart + interval.end - interval.start;
    return intervalStart <= start && intervalEnd >= end;
  });
  return covers ? "open" : "closed";
};

export function validateDaySchedule({ date, items, candidates, mobility }: ValidationInput): { items: VerifiedDayItem[]; rejected: RejectedDayItem[] } {
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const ordered = items.map((entry, index) => ({ entry, index })).sort((a, b) => a.entry.localTime.localeCompare(b.entry.localTime) || a.index - b.index);
  const kept: VerifiedDayItem[] = [];
  const rejected: RejectedDayItem[] = [];
  const maximumDistance = mobility === "walking" ? 5_000 : 20_000;
  let previous: DiscoveredPlace | undefined;
  for (const { entry } of ordered) {
    const candidate = candidateById.get(entry.candidateId);
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(entry.localTime);
    const start = timeMatch ? Number(timeMatch[1]) * 60 + Number(timeMatch[2]) : 0;
    const status = openingStatus(candidate, date, start, entry.durationMinutes);
    if (status === "closed") {
      const businessStatus = text((candidate as unknown as Record<string, unknown> | undefined)?.businessStatus)?.toLowerCase().replace(/[ -]/g, "_");
      rejected.push({ candidateId: entry.candidateId, reason: businessStatus && CLOSED_STATUSES.has(businessStatus) ? "business_closed" : "closed" });
      continue;
    }
    const distance = previous && candidate ? haversineDistanceMeters(previous.coordinates, candidate.coordinates) : undefined;
    if (distance !== undefined && distance > maximumDistance) {
      rejected.push({ candidateId: entry.candidateId, reason: "geographic_jump" });
      continue;
    }
    kept.push({ ...entry, openingStatus: status === "open" ? "verified_open" : "unknown", ...(distance === undefined ? {} : { distanceFromPreviousMeters: distance }) });
    if (candidate) previous = candidate;
  }
  return { items: kept, rejected };
}
