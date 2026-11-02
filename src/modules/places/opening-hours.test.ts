import { describe, expect, it } from "vitest";
import { openingStatusOn, parseOsmOpeningHours, weeklyOpeningHours } from "./opening-hours";

const osm = (sourceText: string) => ({ sourceText });
// 2026-11-16 is a Monday.
const MONDAY = "2026-11-16";
const TUESDAY = "2026-11-17";
const SATURDAY = "2026-11-21";
const SUNDAY = "2026-11-22";

describe("opening hours", () => {
  it("knows the days a museum is closed", () => {
    const museum = osm("Tu-Su 10:00-18:00");
    expect(openingStatusOn(museum, MONDAY)).toBe("closed-day");
    expect(openingStatusOn(museum, TUESDAY, "11:00")).toBe("open");
    expect(openingStatusOn(museum, TUESDAY, "19:00")).toBe("closed-time");
  });

  it("applies later rules over earlier ones and explicit days off", () => {
    const shop = osm("Mo-Sa 09:00-19:00; Sa 10:00-14:00; Su off");
    expect(openingStatusOn(shop, SATURDAY, "15:00")).toBe("closed-time");
    expect(openingStatusOn(shop, SATURDAY, "11:00")).toBe("open");
    expect(openingStatusOn(shop, SUNDAY)).toBe("closed-day");
  });

  it("handles split days, overnight hours and 24/7", () => {
    const restaurant = osm("Mo-Sa 12:00-15:00,19:00-23:00");
    expect(openingStatusOn(restaurant, TUESDAY, "16:30")).toBe("closed-time");
    expect(openingStatusOn(restaurant, TUESDAY, "20:00")).toBe("open");

    const bar = osm("Th-Sa 18:00-02:00");
    // Saturday 01:00 still belongs to Friday night.
    expect(openingStatusOn(bar, SATURDAY, "01:00")).toBe("open");
    expect(openingStatusOn(bar, SUNDAY, "01:00")).toBe("open");
    expect(openingStatusOn(bar, SUNDAY, "03:00")).toBe("closed-time");

    expect(openingStatusOn(osm("24/7"), SUNDAY, "04:00")).toBe("open");
  });

  it("ignores holiday rules but stays silent on syntax it does not know", () => {
    expect(parseOsmOpeningHours("Mo-Fr 09:00-17:00; PH off")).toHaveLength(5);
    expect(openingStatusOn(osm("Jun-Sep Mo-Su 10:00-20:00"), MONDAY)).toBe("unknown");
    expect(openingStatusOn(osm("sunrise-sunset"), MONDAY)).toBe("unknown");
    expect(openingStatusOn(undefined, MONDAY)).toBe("unknown");
  });

  it("reads structured periods from the day planner", () => {
    const hours = { periods: [{ open: { day: 2, hour: 10, minute: 0 }, close: { day: 2, hour: 18, minute: 0 } }] };
    expect(openingStatusOn(hours, TUESDAY, "12:00")).toBe("open");
    expect(openingStatusOn(hours, MONDAY)).toBe("closed-day");
  });

  it("describes the week from Monday", () => {
    expect(weeklyOpeningHours(osm("Tu-Su 10:00-18:00; Fr 10:00-22:00"))?.slice(0, 5)).toEqual([
      { label: "Lundi", hours: "Fermé" },
      { label: "Mardi", hours: "10:00–18:00" },
      { label: "Mercredi", hours: "10:00–18:00" },
      { label: "Jeudi", hours: "10:00–18:00" },
      { label: "Vendredi", hours: "10:00–22:00" },
    ]);
    expect(weeklyOpeningHours(osm("24/7"))?.[0]).toEqual({ label: "Lundi", hours: "24 h/24" });
  });
});
