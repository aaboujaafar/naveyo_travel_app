import type { DayPlanDraft, DayPlanItemDraft } from "../modules/day-planner";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateOnly(value: string): Date {
  if (typeof value !== "string") {
    throw new RangeError("Une date doit être une chaîne YYYY-MM-DD.");
  }

  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new RangeError("La date doit respecter le format YYYY-MM-DD.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError("La date est invalide.");
  }
  return date;
}

export function stopDates(start: string, end: string): string[] {
  const first = parseDateOnly(start);
  const last = parseDateOnly(end);
  if (first.getTime() > last.getTime()) {
    throw new RangeError("La date de début doit précéder la date de fin.");
  }

  const dates: string[] = [];
  for (let current = first.getTime(); current <= last.getTime(); current += 86_400_000) {
    dates.push(new Date(current).toISOString().slice(0, 10));
  }
  return dates;
}

export function formatDayPlanDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseDateOnly(date));
}

export function formatDayPlanDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes < 1) {
    throw new RangeError("La durée doit être un nombre entier positif.");
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} h`;
  return `${hours} h ${remainder} min`;
}

export function sortedDayPlanItems(
  items: readonly DayPlanItemDraft[],
): DayPlanItemDraft[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftTime = left.item.localTime || "99:99";
      const rightTime = right.item.localTime || "99:99";
      return leftTime.localeCompare(rightTime) || left.index - right.index;
    })
    .map(({ item }) => item);
}

export type { DayPlanDraft, DayPlanItemDraft };
