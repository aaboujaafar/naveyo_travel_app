import { describe, expect, it } from "vitest";
import type { Reservation } from "../_shared/model";
import { reservation } from "../__fixtures__/domain";
import { detectLogisticsGaps, type LogisticsStop } from ".";

const LIS = { latitude: 38.7223, longitude: -9.1393 };
const SINTRA = { latitude: 38.8029, longitude: -9.3817 };
const PORTO = { latitude: 41.1579, longitude: -8.6291 };
const PARIS = { name: "Paris", countryCode: "FR", coordinates: { latitude: 48.8566, longitude: 2.3522 } };
const lisbon: LogisticsStop = { id: "s1", name: "Lisbonne", countryCode: "PT", startDate: "2026-11-16", endDate: "2026-11-19", coordinates: LIS };
const sintra: LogisticsStop = { id: "s2", name: "Sintra", countryCode: "PT", startDate: "2026-11-18", endDate: "2026-11-18", coordinates: SINTRA };
const porto: LogisticsStop = { id: "s3", name: "Porto", countryCode: "PT", startDate: "2026-11-19", endDate: "2026-11-21", coordinates: PORTO };
const tz = "Europe/Lisbon" as never;
const stay = (checkIn: string, checkOut: string): Reservation => ({ ...reservation, type: "accommodation", start: { local: `${checkIn}T15:00`, timeZone: tz }, end: { local: `${checkOut}T11:00`, timeZone: tz } });
const ticket = (type: Reservation["type"], day: string, destination?: Reservation["destination"]): Reservation => ({ ...reservation, type, start: { local: `${day}T08:00`, timeZone: tz }, ...(destination ? { destination } : { destination: undefined }) });

describe("logistics gaps", () => {
  it("finds the nights without a stay and every journey to book", () => {
    const report = detectLogisticsGaps({ stops: [lisbon, porto], reservations: [stay("2026-11-16", "2026-11-18")], departure: PARIS });
    expect(report.gaps.map((gap) => (gap.kind === "stay" ? `${gap.stop.name} ${gap.checkIn}→${gap.checkOut} ${gap.nights}n` : `${gap.role} ${gap.from.name}→${gap.to.name} ${gap.date} ${gap.distanceKm}km`))).toEqual([
      "Lisbonne 2026-11-18→2026-11-19 1n",
      "Porto 2026-11-19→2026-11-21 2n",
      "outbound Paris→Lisbonne 2026-11-16 1453km",
      "between Lisbonne→Porto 2026-11-19 274km",
      "return Porto→Paris 2026-11-21 1213km",
    ]);
    expect(report.nights).toEqual({ total: 5, covered: 2 });
    expect(report.legs).toEqual({ total: 3, covered: 0 });
    expect(report.readiness).toBeCloseTo(2 / 8);
  });

  it("treats day trips as no journey, and tickets or waivers as covered", () => {
    const report = detectLogisticsGaps({
      stops: [lisbon, sintra, porto],
      reservations: [
        stay("2026-11-16", "2026-11-19"),
        // The flight leaves the evening before; the train arrives in Porto.
        ticket("flight", "2026-11-15", { kind: "destination", label: "Lisbon LIS", coordinates: { latitude: 38.7742, longitude: -9.1342 } }),
        ticket("train", "2026-11-19", { kind: "destination", label: "Porto Campanhã" }),
      ],
      departure: PARIS,
      waivers: [{ kind: "stay", stopId: "s3", mode: "friends" }],
    });
    expect(report.gaps.map((gap) => gap.key)).toEqual(["leg:return:porto>paris:2026-11-21"]);
    expect(report.legs).toEqual({ total: 3, covered: 2 });
  });

  it("skips the outbound and return without a departure city", () => {
    const report = detectLogisticsGaps({ stops: [lisbon], reservations: [] });
    expect(report.gaps).toEqual([expect.objectContaining({ kind: "stay", nights: 3 })]);
    expect(detectLogisticsGaps({ stops: [], reservations: [] }).readiness).toBe(1);
  });
});
