import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deterministicUuid,
  discoverDayPlaces,
  haversineDistanceMeters,
  normalizeAndDedupePlaces,
} from "./day-place-discovery.ts";

const input = (overrides: Record<string, unknown> = {}) => ({
  center: { latitude: 36.4, longitude: 25.4 },
  countryCode: "GR",
  preferences: {
    radiusMeters: 5_000,
    themes: ["mixed"],
  },
  ...overrides,
});

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const setRuntimeEnv = (values: Record<string, string | undefined>) => {
  vi.stubGlobal("Deno", {
    env: { get: (name: string) => values[name] },
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("day place discovery helpers", () => {
  it("creates a stable UUID-shaped value", async () => {
    const first = await deterministicUuid("google:place-a");
    const second = await deterministicUuid("google:place-a");

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("dedupes exact provider ids and nearby cross-provider names", () => {
    const base = { name: "Café Bleu", coordinates: { latitude: 36.4, longitude: 25.4 }, attribution: "test" };
    const places = normalizeAndDedupePlaces([
      { ...base, id: "1", provider: "google", providerPlaceId: "a" },
      { ...base, id: "2", provider: "google", providerPlaceId: "a" },
      { ...base, id: "3", provider: "geoapify", providerPlaceId: "b" },
      { ...base, id: "4", provider: "geoapify", providerPlaceId: "c", coordinates: { latitude: 36.42, longitude: 25.42 } },
    ]);

    expect(places).toHaveLength(2);
  });

  it("returns zero distance for identical points", () => {
    expect(haversineDistanceMeters({ latitude: 1, longitude: 2 }, { latitude: 1, longitude: 2 })).toBe(0);
  });
});

describe("discoverDayPlaces provider fallback", () => {
  it("uses Geoapify when Google is absent", async () => {
    setRuntimeEnv({ GEOAPIFY_API_KEY: "geoapify-test-key" });
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [25.401, 36.401] },
        properties: {
          place_id: "geo-1",
          name: "Blue Museum",
          formatted: "Blue Museum, Santorini",
          country_code: "gr",
          categories: ["entertainment.museum"],
        },
      }],
    }));

    const result = await discoverDayPlaces(input({ preferences: { radiusMeters: 5_000, themes: ["culture"] } }));

    expect(result.providers).toEqual(["geoapify"]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ provider: "geoapify", providerPlaceId: "geo-1", name: "Blue Museum" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("api.geoapify.com");
  });

  it("uses Geoapify when the Google request fails", async () => {
    setRuntimeEnv({ GOOGLE_PLACES_API_KEY: "google-test-key", GEOAPIFY_API_KEY: "geoapify-test-key" });
    const fetcher = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ error: "provider unavailable" }, 503))
      .mockResolvedValueOnce(response({
        features: [{
          type: "Feature",
          geometry: { type: "Point", coordinates: [25.402, 36.402] },
          properties: { place_id: "geo-fallback", name: "Fallback Beach", categories: ["natural.coastal"] },
        }],
      }));

    const result = await discoverDayPlaces(input({ preferences: { radiusMeters: 10_000, themes: ["nature"] } }));

    expect(result.providers).toEqual(["geoapify"]);
    expect(result.candidates[0]?.providerPlaceId).toBe("geo-fallback");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1]?.[0])).toContain("api.geoapify.com");
  });

  it("makes multiple bounded calls for mixed themes and deterministically dedupes results", async () => {
    setRuntimeEnv({ GOOGLE_PLACES_API_KEY: "google-test-key" });
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (_request, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { includedTypes?: string[] };
      expect(body.includedTypes?.length).toBeGreaterThan(0);
      return response({
        places: [{
          id: "google-same-place",
          displayName: { text: "Same Place" },
          formattedAddress: "Same Place, Santorini",
          location: { latitude: 36.401, longitude: 25.401 },
          types: body.includedTypes,
        }],
      });
    });

    const result = await discoverDayPlaces(input({
      maxCandidates: 20,
      preferences: { radiusMeters: 5_000, themes: ["culture", "food", "nature", "romantic", "shopping", "family"] },
    }));

    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(result.providers).toEqual(["google"]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.id).toBe(await deterministicUuid("google:google-same-place"));
  });
});
