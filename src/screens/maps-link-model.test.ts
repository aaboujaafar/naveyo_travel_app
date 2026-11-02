import { describe, expect, it } from "vitest";
import { bestNameMatch, isShortMapsLink, parseMapsLink } from "./maps-link-model";

describe("maps links", () => {
  it("reads a Google Maps place link, preferring the pin over the map centre", () => {
    expect(parseMapsLink("https://www.google.com/maps/place/Time+Out+Market+Lisboa/@38.7069,-9.1460,17z/data=!3m1!4b1!4m6!3m5!1s0xd1934!8m2!3d38.7071!4d-9.1458")).toEqual({
      source: "google",
      name: "Time Out Market Lisboa",
      coordinates: { latitude: 38.7071, longitude: -9.1458 },
    });
  });

  it("reads search links, coordinates-only links and the EU consent detour", () => {
    expect(parseMapsLink("https://www.google.com/maps/search/?api=1&query=Pasteis%20de%20Belem")).toEqual({ source: "google", name: "Pasteis de Belem" });
    expect(parseMapsLink("https://maps.google.com/?q=38.6976,-9.2033")).toEqual({ source: "google", coordinates: { latitude: 38.6976, longitude: -9.2033 } });
    const consent = `https://consent.google.com/ml?continue=${encodeURIComponent("https://www.google.com/maps/place/LX+Factory/@38.7034,-9.1785,17z")}`;
    expect(parseMapsLink(consent)).toMatchObject({ name: "LX Factory", coordinates: { latitude: 38.7034, longitude: -9.1785 } });
  });

  it("reads Apple Plans links and recognises short links", () => {
    expect(parseMapsLink("https://maps.apple.com/?q=Oceanário&ll=38.7635,-9.0937")).toEqual({ source: "apple", name: "Oceanário", coordinates: { latitude: 38.7635, longitude: -9.0937 } });
    expect(parseMapsLink("https://maps.apple.com/place?coordinate=38.69,-9.21&name=Torre%20de%20Bel%C3%A9m")).toEqual({ source: "apple", name: "Torre de Belém", coordinates: { latitude: 38.69, longitude: -9.21 } });
    expect(isShortMapsLink("https://maps.app.goo.gl/AbC123")).toBe(true);
    expect(isShortMapsLink("https://www.google.com/maps/place/X")).toBe(false);
    expect(parseMapsLink("https://example.com/maps/place/X")).toBeNull();
    expect(parseMapsLink("pas un lien")).toBeNull();
  });

  it("matches the found place with the link's name", () => {
    const found = [{ name: "Museu Nacional do Azulejo" }, { name: "Time Out Market" }, { name: "Mercado da Ribeira" }];
    expect(bestNameMatch(found, "Time Out Market Lisboa")?.name).toBe("Time Out Market");
    expect(bestNameMatch(found, "Castelo")).toBeUndefined();
    expect(bestNameMatch(found, undefined)?.name).toBe("Museu Nacional do Azulejo");
  });
});
