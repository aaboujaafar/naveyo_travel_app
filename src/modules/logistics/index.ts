import type { Coordinates, Reservation } from "../_shared/model";

/** The Étape fields the detection needs. Dates are local YYYY-MM-DD. */
export interface LogisticsStop {
  id: string;
  name: string;
  countryCode: string;
  startDate: string;
  endDate: string;
  coordinates?: Coordinates;
}

export interface LogisticsCity {
  name: string;
  countryCode: string;
  coordinates?: Coordinates;
}

/** What the travellers said they do not need to book (step 3 records them). */
export type LogisticsWaiver =
  | { kind: "stay"; stopId: string; mode: "friends" | "camping" | "other"; address?: string }
  | { kind: "leg"; legKey: string };

export interface StayGap {
  kind: "stay";
  key: string;
  stop: LogisticsStop;
  /** First uncovered night, and the morning after the last one (check-out). */
  checkIn: string;
  checkOut: string;
  nights: number;
}

export interface LegGap {
  kind: "leg";
  key: string;
  from: LogisticsCity;
  to: LogisticsCity;
  date: string;
  role: "outbound" | "between" | "return";
  /** As the crow flies, when both ends are located. */
  distanceKm?: number;
}

export type LogisticsGap = StayGap | LegGap;

export interface LogisticsReport {
  gaps: LogisticsGap[];
  /** Covered share of what the Voyage needs (nights and journeys), from 0 to 1. */
  readiness: number;
  nights: { total: number; covered: number };
  legs: { total: number; covered: number };
}

/** Two Étapes closer than this are a day trip or a short ride, not a journey to book. */
const SHORT_HOP_KM = 40;
/** A booked journey ending this close to the destination covers the leg. */
const SAME_PLACE_KM = 60;
const TRANSPORT_TYPES = new Set<Reservation["type"]>(["flight", "train", "ferry", "other"]);

/**
 * What the Voyage still lacks: nights without a confirmed stay, and journeys
 * (outbound, between Étapes, return) without a ticket — minus what the
 * travellers said they do not need.
 */
export function detectLogisticsGaps(input: {
  stops: readonly LogisticsStop[];
  reservations: readonly Reservation[];
  departure?: LogisticsCity | null;
  waivers?: readonly LogisticsWaiver[];
}): LogisticsReport {
  const stops = [...input.stops].sort((left, right) => left.startDate.localeCompare(right.startDate) || left.endDate.localeCompare(right.endDate));
  const waivers = input.waivers ?? [];
  const gaps: LogisticsGap[] = [];

  // Nights: a stay from check-in to check-out covers each night in between.
  const coveredNights = new Set<string>();
  for (const stay of input.reservations.filter((reservation) => reservation.type === "accommodation")) {
    const checkIn = stay.start?.local.slice(0, 10);
    if (!checkIn) continue;
    const checkOut = stay.end?.local.slice(0, 10) ?? addDays(checkIn, 1);
    for (let night = checkIn; night < checkOut; night = addDays(night, 1)) coveredNights.add(night);
  }
  let totalNights = 0;
  let covered = 0;
  stops.forEach((stop, index) => {
    // The last Étape ends the Voyage: its last day is the way home, not a night.
    const lastNight = addDays(stop.endDate, -1);
    const nights = datesBetween(stop.startDate, lastNight).filter((night) => {
      // On a shared day the night belongs to the next Étape.
      const next = stops[index + 1];
      return !(next && night >= next.startDate);
    });
    totalNights += nights.length;
    const waived = waivers.some((waiver) => waiver.kind === "stay" && waiver.stopId === stop.id);
    const missing = waived ? [] : nights.filter((night) => !coveredNights.has(night));
    covered += nights.length - missing.length;
    for (const run of consecutiveRuns(missing)) {
      gaps.push({ kind: "stay", key: `stay:${stop.id}:${run[0]}`, stop, checkIn: run[0]!, checkOut: addDays(run[run.length - 1]!, 1), nights: run.length });
    }
  });

  // Journeys.
  const legs: Omit<LegGap, "key" | "kind">[] = [];
  const city = (stop: LogisticsStop): LogisticsCity => ({ name: stop.name, countryCode: stop.countryCode, ...(stop.coordinates ? { coordinates: stop.coordinates } : {}) });
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (input.departure && first) legs.push({ from: input.departure, to: city(first), date: first.startDate, role: "outbound" });
  stops.slice(1).forEach((stop, index) => legs.push({ from: city(stops[index]!), to: city(stop), date: stop.startDate, role: "between" }));
  if (input.departure && last) legs.push({ from: city(last), to: input.departure, date: last.endDate, role: "return" });

  const transports = input.reservations.filter((reservation) => TRANSPORT_TYPES.has(reservation.type) && reservation.start);
  let totalLegs = 0;
  let coveredLegs = 0;
  for (const leg of legs) {
    const distanceKm = leg.from.coordinates && leg.to.coordinates ? Math.round(distance(leg.from.coordinates, leg.to.coordinates)) : undefined;
    const sameCity = normalize(leg.from.name) === normalize(leg.to.name);
    if (sameCity || (distanceKm !== undefined && distanceKm < SHORT_HOP_KM)) continue;
    totalLegs += 1;
    const key = `leg:${leg.role}:${normalize(leg.from.name)}>${normalize(leg.to.name)}:${leg.date}`;
    const waived = waivers.some((waiver) => waiver.kind === "leg" && waiver.legKey === key);
    if (waived || transports.some((ticket) => coversLeg(ticket, leg))) {
      coveredLegs += 1;
      continue;
    }
    gaps.push({ kind: "leg", key, ...leg, ...(distanceKm !== undefined ? { distanceKm } : {}) });
  }

  const units = totalNights + totalLegs;
  return {
    gaps,
    readiness: units === 0 ? 1 : (covered + coveredLegs) / units,
    nights: { total: totalNights, covered },
    legs: { total: totalLegs, covered: coveredLegs },
  };
}

/** A ticket covers a journey when it leaves around that day and arrives at its destination. */
function coversLeg(ticket: Reservation, leg: Omit<LegGap, "key" | "kind">): boolean {
  const day = ticket.start!.local.slice(0, 10);
  // Night trains and early flights: the day before also counts.
  if (day !== leg.date && day !== addDays(leg.date, -1)) return false;
  const arrival = ticket.destination;
  if (!arrival) return true;
  if (arrival.coordinates && leg.to.coordinates) return distance(arrival.coordinates, leg.to.coordinates) <= SAME_PLACE_KM;
  const label = normalize(`${arrival.label} ${arrival.address ?? ""}`);
  return label.includes(normalize(leg.to.name)) || (arrival.countryCode !== undefined && arrival.countryCode.toUpperCase() === leg.to.countryCode.toUpperCase());
}

function consecutiveRuns(dates: readonly string[]): string[][] {
  const runs: string[][] = [];
  for (const date of dates) {
    const current = runs[runs.length - 1];
    if (current && addDays(current[current.length - 1]!, 1) === date) current.push(date);
    else runs.push([date]);
  }
  return runs;
}

function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to && dates.length < 400; date = addDays(date, 1)) dates.push(date);
  return dates;
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function distance(left: Coordinates, right: Coordinates): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(right.latitude - left.latitude);
  const dLon = toRad(right.longitude - left.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(left.latitude)) * Math.cos(toRad(right.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
