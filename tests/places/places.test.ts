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
    expect(result[1]?.attribution).toContain("Geoapify");
    expect(result[1]?.attribution).toContain("OpenStreetMap");
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

  it("supports autocomplete, reverse and nearby contracts", async () => {
    const provider = new FakePlacesProvider([airport]);
    const places = new Places(provider);
    expect(await places.autocomplete({ query: "a" })).toEqual([]);
    expect(await places.autocomplete({ query: "air" })).toHaveLength(1);
    expect(await places.reverse({ coordinates: airport.coordinates })).toBeNull();
    expect(await places.nearby({ coordinates: airport.coordinates, radiusMeters: 500 })).toHaveLength(1);
    expect(() => places.nearby({ coordinates: airport.coordinates, radiusMeters: 0 })).toThrow();
  });

  it("resolves recently displayed candidates without a places row", async () => {
    const candidate: PlaceCandidate = {
      id: assertStableId("60000000-0000-5000-8000-000000000000"),
      provider: "geoapify",
      name: "Miradouro",
      coordinates: { latitude: 38.71, longitude: -9.13 },
    };
    const provider = {
      search: async () => [],
      nearby: async () => [candidate],
      getById: async () => { throw new Error("Places search failed (404): place_not_found"); },
    };
    const places = new Places(provider);
    await places.nearby({ coordinates: candidate.coordinates, radiusMeters: 1_000 });
    await expect(places.getById(candidate.id)).resolves.toEqual(candidate);

    const remembered = { ...candidate, id: assertStableId("70000000-0000-5000-8000-000000000000") };
    places.remember([remembered]);
    await expect(places.getById(remembered.id)).resolves.toEqual(remembered);
  });
});
