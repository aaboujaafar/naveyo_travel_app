import type { Expense, ExpenseCategory } from "../modules/expenses";
import type { ItineraryItem, Reservation, Stop, TrackPoint, Trip } from "../modules/_shared/model";
import { formatCountry } from "./place-detail-model";
import { countTripDays } from "./trip-dashboard-model";
import { expenseCategoryLabels, formatMoney } from "./trip-budget-model";
import { formatDistance, trackDistanceMeters } from "./trip-map-model";

export interface TripRecap {
  title: string;
  dates: string;
  days: number | null;
  countries: string[];
  stops: string[];
  activityCount: number;
  reservationCount: number;
  distance: string | null;
  totalSpent: string | null;
  topCategory: string | null;
  /** Highlights in the order they were planned, for the "souvenirs" list. */
  highlights: { date: string; title: string }[];
  shareText: string;
}

export function buildTripRecap(input: {
  trip: Trip;
  stops: readonly Stop[];
  itinerary: readonly ItineraryItem[];
  reservations: readonly Reservation[];
  expenses: readonly Expense[];
  trackPoints: readonly TrackPoint[];
}): TripRecap {
  const stops = [...input.stops].sort((left, right) => left.startDate.localeCompare(right.startDate));
  const countries = Array.from(new Set(stops.map((stop) => stop.countryCode)))
    .map((code) => formatCountry(code))
    .filter((value): value is string => value !== null);
  const days = countTripDays(input.trip.startsOn, input.trip.endsOn);
  const distanceMeters = input.trackPoints.length > 1 ? trackDistanceMeters([...input.trackPoints]) : 0;

  const spentMinorUnits = input.expenses.reduce((sum, expense) => sum + expense.reference.minorUnits, 0);
  const byCategory = new Map<ExpenseCategory, number>();
  for (const expense of input.expenses) byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.reference.minorUnits);
  const top = [...byCategory.entries()].sort((left, right) => right[1] - left[1])[0];

  const highlights = [...input.itinerary]
    .sort((left, right) => `${left.date}${left.time?.local ?? ""}`.localeCompare(`${right.date}${right.time?.local ?? ""}`))
    .map((item) => ({ date: item.date, title: item.title }));

  const recap: Omit<TripRecap, "shareText"> = {
    title: input.trip.name,
    dates: formatRange(input.trip.startsOn, input.trip.endsOn),
    days,
    countries,
    stops: stops.map((stop) => stop.name),
    activityCount: input.itinerary.length,
    reservationCount: input.reservations.length,
    distance: distanceMeters > 0 ? formatDistance(distanceMeters) : null,
    totalSpent: spentMinorUnits > 0 ? formatMoney({ minorUnits: spentMinorUnits, currency: input.trip.referenceCurrency }) : null,
    topCategory: top ? expenseCategoryLabels[top[0]] : null,
    highlights,
  };
  return { ...recap, shareText: shareText(recap) };
}

function shareText(recap: Omit<TripRecap, "shareText">): string {
  const lines = [
    `${recap.title} · ${recap.dates}`,
    [recap.days ? `${recap.days} jours` : null, recap.stops.length > 0 ? recap.stops.join(" → ") : null].filter(Boolean).join(" · "),
    recap.activityCount > 0 ? `${recap.activityCount} activité${recap.activityCount > 1 ? "s" : ""}` : null,
    recap.distance ? `${recap.distance} parcourus` : null,
    "Préparé avec Naveyo",
  ];
  return lines.filter(Boolean).join("\n");
}

function formatRange(startsOn?: string, endsOn?: string): string {
  if (!startsOn || !endsOn) return "Dates à préciser";
  const format = (value: string) =>
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return `${format(startsOn)} – ${format(endsOn)}`;
}
