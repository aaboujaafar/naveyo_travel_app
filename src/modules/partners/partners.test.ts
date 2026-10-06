import { describe, expect, it } from "vitest";
import { affiliate, bookingUrl, centreOfPlaces, journeyLinks, journeySummary } from ".";

describe("partner links", () => {
  it("fills Booking with destination, dates and the party", () => {
    const url = new URL(bookingUrl({ destination: "Alfama, Lisboa", checkIn: "2026-11-16", checkOut: "2026-11-20", adults: 2, childrenAges: [4, 0] }));
    expect(url.searchParams.get("ss")).toBe("Alfama, Lisboa");
    expect(url.searchParams.get("checkin")).toBe("2026-11-16");
    expect(url.searchParams.get("group_adults")).toBe("2");
    expect(url.searchParams.get("group_children")).toBe("2");
    expect(url.searchParams.getAll("age")).toEqual(["4", "0"]);
  });

  it("searches flights by IATA code, and falls back to the home page without codes", () => {
    const search = { from: { name: "Paris", countryCode: "FR", iata: "PAR" }, to: { name: "Lisbonne", countryCode: "PT", iata: "LIS" }, date: "2026-11-16", adults: 2, childrenAges: [5, 1] };
    const [flight] = journeyLinks(search, ["flight"], {});
    const url = new URL(flight!.url);
    expect([url.searchParams.get("origin_iata"), url.searchParams.get("destination_iata"), url.searchParams.get("depart_date"), url.searchParams.get("children"), url.searchParams.get("infants")]).toEqual(["PAR", "LIS", "2026-11-16", "1", "1"]);
    expect(journeyLinks({ ...search, to: { name: "Sintra", countryCode: "PT" } }, ["flight"], {})[0]).toMatchObject({ url: "https://www.aviasales.com/", prefilled: false });
  });

  it("picks the ground partner by region and summarises the trip to copy", () => {
    const europe = { from: { name: "Lisbonne", countryCode: "PT" }, to: { name: "Porto", countryCode: "PT" }, date: "2026-11-19", adults: 2, childrenAges: [4] };
    expect(journeyLinks(europe, ["ground"], {}).map((link) => link.partner)).toEqual(["omio"]);
    expect(journeyLinks({ ...europe, from: { name: "Bangkok", countryCode: "TH" }, to: { name: "Chiang Mai", countryCode: "TH" } }, ["ground"], {}).map((link) => link.partner)).toEqual(["12go"]);
    expect(journeySummary(europe, (date) => date)).toBe("Lisbonne → Porto · 2026-11-19 · 2 adultes · 1 enfant");
  });

  it("wraps links for Travelpayouts only when the program is configured", () => {
    expect(affiliate("booking", "https://www.booking.com/x", {})).toBe("https://www.booking.com/x");
    expect(affiliate("booking", "https://www.booking.com/x", { marker: "123", programs: { booking: "84" } }))
      .toBe("https://tp.media/r?marker=123&p=84&u=https%3A%2F%2Fwww.booking.com%2Fx");
  });

  it("finds the centre of the planned places", () => {
    expect(centreOfPlaces([{ latitude: 38.71, longitude: -9.13 }, { latitude: 38.73, longitude: -9.15 }])).toEqual({ latitude: 38.72, longitude: -9.14 });
    expect(centreOfPlaces([{ latitude: 38.71, longitude: -9.13 }])).toBeNull();
  });
});
