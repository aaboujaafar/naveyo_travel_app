import { describe, expect, it } from "vitest";
import { normalizeGeoapifyResponse } from "../../src/adapters/geoapify";
import { FakePlacesProvider, Places } from "../../src/modules/places";
import { assertStableId } from "../../src/modules/_shared/validation";
import type { PlaceCandidate } from "../../src/modules/_shared/model";

const airport: PlaceCandidate = {
  id: assertStableId("10000000-0000-4000-8000-000000000001"),
  provider: "geoapify",
  name: "Humberto Delgado Airport",
  category: "airport",
  countryCode: "PT",
  coordinates: { latitude: 38.7756, longitude: -9.1354 },
};

describe("places module", () => {
  it("normalizes and validates airport and port responses", () => {
    const result = normalizeGeoapifyResponse({
      features: [
        {
          properties: {
            place_id: "airport-1",
            name: "Humberto Delgado Airport",
            formatted: "Lisbon Airport, PT",
            country_code: "pt",
            categories: ["airport"],
            datasource: { attribution: "OpenStreetMap contributors" },
          },
          geometry: { coordinates: [-9.1354, 38.7756] },
        },
        {
          properties: {
            place_id: "port-1",
            name: "Port of Lisbon",
            country_code: "pt",
            categories: ["commercial.port"],
          },
          geometry: { coordinates: [-9.1, 38.7] },
        },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0]?.provider).toBe("geoapify");
    expect(result[0]?.attribution).toContain("OpenStreetMap");
    expect(result[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects malformed external responses", () => {
    expect(() =>
      normalizeGeoapifyResponse({
        features: [{ properties: {}, geometry: { coordinates: ["bad"] } }],
      }),
    ).toThrow();
  });

  it("supports country/type filtering and manual fallback", async () => {
    const places = new Places(new FakePlacesProvider([airport]));
    expect(
      (
        await places.search({
          query: "airport",
          countryCode: "PT",
          type: "airport",
        })
      ).map((place) => place.name),
    ).toEqual([airport.name]);
    const manual = places.createManual({
      name: "Point de rendez-vous",
      coordinates: { latitude: 38.7, longitude: -9.1 },
      countryCode: "PT",
    });
    expect(manual.provider).toBe("manual");
    expect(manual.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
