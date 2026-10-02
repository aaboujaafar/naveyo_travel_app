import type { ClimateSummary } from "./model";

/** The same calendar dates one year earlier, or null for an incomplete range. */
export function sameDatesLastYear(startDate: string, endDate: string): { year: number; startDate: string; endDate: string } | null {
  const shift = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    // 29 February falls back to the 28th in a common year.
    const year = Number(match[1]) - 1;
    const day = match[2] === "02" && match[3] === "29" ? "28" : match[3];
    return `${year}-${match[2]}-${day}`;
  };
  const start = shift(startDate);
  const end = shift(endDate);
  if (!start || !end || end < start) return null;
  return { year: Number(start.slice(0, 4)), startDate: start, endDate: end };
}

/** Averages last year's observed days; days without a value are skipped. */
export function summarizeClimate(year: number, days: { temperatureMaxC?: unknown; temperatureMinC?: unknown; precipitationSumMm?: unknown }[]): ClimateSummary | null {
  const numbers = (key: keyof (typeof days)[number]) =>
    days.map((day) => day[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const max = numbers("temperatureMaxC");
  const min = numbers("temperatureMinC");
  if (max.length === 0 || min.length === 0) return null;
  const average = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return {
    year,
    days: days.length,
    temperatureMaxC: average(max),
    temperatureMinC: average(min),
    rainyDays: numbers("precipitationSumMm").filter((value) => value >= 1).length,
  };
}
