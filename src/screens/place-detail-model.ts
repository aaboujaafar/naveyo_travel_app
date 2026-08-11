import type { PlaceCandidate, Stop, UUID } from "../modules/_shared/model";

export interface PlaceScheduleDate {
  stopId: UUID;
  date: string;
  label: string;
}

const months = [
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

export function buildPlaceScheduleDates(stops: readonly Stop[]): PlaceScheduleDate[] {
  return [...stops]
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
    .flatMap((stop) =>
      datesBetween(stop.startDate, stop.endDate).map((date) => ({
        stopId: stop.id,
        date,
        label: `${stop.name} · ${formatLocalDate(date)}`,
      })),
    );
}

export function formatPlaceCategory(category?: string): string | null {
  const value = category?.trim();
  if (!value) return null;
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

export function formatPlaceSource(provider: PlaceCandidate["provider"]): string {
  return provider === "geoapify" ? "Lieu vérifié" : "Lieu saisi manuellement";
}

function datesBetween(start: string, end: string): string[] {
  const startParts = parseDate(start);
  const endParts = parseDate(end);
  if (!startParts || !endParts) return [];

  const current = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
  const last = Date.UTC(endParts.year, endParts.month - 1, endParts.day);
  if (last < current) return [];

  const result: string[] = [];
  for (let instant = current; instant <= last; instant += 86_400_000) {
    const date = new Date(instant);
    result.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return result;
}

function formatLocalDate(value: string): string {
  const parts = parseDate(value);
  if (!parts) return value;
  return `${parts.day} ${months[parts.month - 1]}`;
}

function parseDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}
