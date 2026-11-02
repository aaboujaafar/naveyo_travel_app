import { describe, expect, it } from "vitest";
import type { ItineraryItem, Reservation, Stop, UUID } from "../modules/_shared/model";
import { itineraryItem, reservation, stop } from "../modules/__fixtures__/domain";
import { buildCalendarEvents, zonedDate } from "./calendar-export-model";

const lisbon: Stop = { ...stop, timeZone: "Europe/Lisbon" as Stop["timeZone"] };

describe("calendar export", () => {
  it("converts the wall clock of a time zone into an instant, across DST", () => {
    expect(zonedDate("2026-11-16T10:00", "Europe/Lisbon").toISOString()).toBe("2026-11-16T10:00:00.000Z");
    expect(zonedDate("2026-11-16T10:00", "Europe/Paris").toISOString()).toBe("2026-11-16T09:00:00.000Z");
    expect(zonedDate("2026-07-01T10:00", "Europe/Paris").toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(zonedDate("2026-11-16T10:00", "America/New_York").toISOString()).toBe("2026-11-16T15:00:00.000Z");
  });

  it("turns timed activities into 90-minute events with a reminder, untimed ones into all-day events", () => {
    const timed: ItineraryItem = { ...itineraryItem, id: "00000000-0000-4000-8000-0000000000a1" as UUID, stopId: lisbon.id, title: "Musée", date: "2026-11-17", time: { local: "2026-11-17T10:00", timeZone: lisbon.timeZone }, place: { kind: "venue", label: "Museu", address: "Rua 1" } };
    const untimed: ItineraryItem = { ...timed, id: "00000000-0000-4000-8000-0000000000a2" as UUID, title: "Flâner", time: undefined, place: undefined };
    const [first, second] = buildCalendarEvents({ items: [untimed, timed], reservations: [], stops: [lisbon] });
    expect(first).toMatchObject({ title: "Flâner", allDay: true });
    expect(first?.startDate.getDate()).toBe(17);
    expect(second).toMatchObject({ title: "Musée", allDay: false, location: "Museu, Rua 1", alarmOffsetMinutes: -30 });
    expect(second?.startDate.toISOString()).toBe("2026-11-17T10:00:00.000Z");
    expect(second!.endDate.getTime() - second!.startDate.getTime()).toBe(90 * 60_000);
  });

  it("reminds an hour before a flight and keeps its reference", () => {
    const flight: Reservation = {
      ...reservation,
      type: "flight",
      title: "Paris → Lisbonne",
      reference: "AB12CD",
      start: { local: "2026-11-16T07:15", timeZone: "Europe/Paris" as Stop["timeZone"] },
      end: { local: "2026-11-16T08:45", timeZone: "Europe/Lisbon" as Stop["timeZone"] },
    };
    const [event] = buildCalendarEvents({ items: [], reservations: [flight], stops: [lisbon] });
    expect(event).toMatchObject({ title: "✈️ Paris → Lisbonne", alarmOffsetMinutes: -60, allDay: false });
    expect(event?.notes).toContain("Réf. AB12CD");
    expect(event?.startDate.toISOString()).toBe("2026-11-16T06:15:00.000Z");
    expect(event?.endDate.toISOString()).toBe("2026-11-16T08:45:00.000Z");
  });

  it("keeps a stay without hours as an all-day event over its dates", () => {
    const stay: Reservation = { ...reservation, type: "accommodation", title: "Hôtel", start: { local: "2026-11-16", timeZone: lisbon.timeZone }, end: { local: "2026-11-20", timeZone: lisbon.timeZone } };
    const [event] = buildCalendarEvents({ items: [], reservations: [stay], stops: [lisbon] });
    expect(event).toMatchObject({ allDay: true, title: "🛏️ Hôtel" });
    expect([event?.startDate.getDate(), event?.endDate.getDate()]).toEqual([16, 20]);
  });

  it("adds formality deadlines as all-day reminders", () => {
    const [event] = buildCalendarEvents({ items: [], reservations: [], stops: [lisbon], deadlines: [{ key: "formality:US:FR:eta", title: "Demander l’ESTA", date: "2026-11-24", url: "https://esta.cbp.dhs.gov/" }] });
    expect(event).toMatchObject({ key: "formality:US:FR:eta", title: "📝 Demander l’ESTA", allDay: true, notes: "https://esta.cbp.dhs.gov/" });
    expect(event?.startDate.getDate()).toBe(24);
  });
});
