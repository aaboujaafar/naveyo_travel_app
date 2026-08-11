import type { Stop, Trip } from "../modules/_shared/model";

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
