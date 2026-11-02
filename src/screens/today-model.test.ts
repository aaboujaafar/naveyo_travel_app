import { describe, expect, it } from "vitest";
import type { ItineraryItem, Stop, UUID } from "../modules/_shared/model";
import { reservation, stop } from "../modules/__fixtures__/domain";
import { buildTodayPlan, formatDuration, localNow } from "./today-model";

const lisbon: Stop = { ...stop, startDate: "2026-11-16", endDate: "2026-11-20" };
const trip = { startsOn: "2026-11-16", endsOn: "2026-11-20" };
const item = (id: string, date: string, local?: string): ItineraryItem => ({
  id: `00000000-0000-4000-8000-0000000000${id}` as UUID,
  tripId: lisbon.tripId,
  stopId: lisbon.id,
  title: `Activité ${id}`,
  date,
  ...(local ? { time: { local: `${date}T${local}`, timeZone: lisbon.timeZone } } : {}),
});

describe("today model", () => {
  it("is empty outside the Voyage dates", () => {
    expect(buildTodayPlan({ trip, stops: [lisbon], items: [], now: "2026-10-02T09:00" })).toBeNull();
  });

  it("orders the day and points at the next timed activity", () => {
    const plan = buildTodayPlan({
      trip,
      stops: [lisbon],
      items: [item("03", "2026-11-17", "15:00"), item("01", "2026-11-17", "09:00"), item("02", "2026-11-17"), item("04", "2026-11-18", "10:00")],
      now: "2026-11-17T11:30",
    });

    expect(plan).toMatchObject({ dayNumber: 2, dayCount: 5, stop: { id: lisbon.id } });
    expect(plan?.entries.map((entry) => [entry.item.title, entry.status])).toEqual([
      ["Activité 01", "done"],
      ["Activité 03", "next"],
      ["Activité 02", "unscheduled"],
    ]);
    expect(plan?.next?.time).toBe("15:00");
  });

  it("keeps the reservations of the day", () => {
    const today = { ...reservation, start: { local: "2026-11-17T18:00", timeZone: lisbon.timeZone } };
    const plan = buildTodayPlan({ trip, stops: [lisbon], items: [], reservations: [today, reservation], now: "2026-11-17T08:00" });
    expect(plan?.reservations).toEqual([today]);
  });

  it("reads the wall clock of the Étape and formats durations", () => {
    expect(localNow("Europe/Lisbon", new Date("2026-11-17T10:05:00Z"))).toBe("2026-11-17T10:05");
    expect(localNow("Asia/Tokyo", new Date("2026-11-17T20:00:00Z"))).toBe("2026-11-18T05:00");
    expect(formatDuration(240)).toBe("4 min");
    expect(formatDuration(5_400)).toBe("1 h 30");
  });
});
