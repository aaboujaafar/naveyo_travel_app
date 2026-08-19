import { describe, expect, it } from "vitest";
import { excludePreviouslyUsedPlaces, type UsedPlaceIdentity } from "./day-place-exclusions.ts";
import type { DiscoveredPlace } from "./day-place-discovery.ts";

const place = (overrides: Partial<DiscoveredPlace> = {}): DiscoveredPlace => ({
  id: "candidate-1",
  provider: "google",
  providerPlaceId: "google-1",
  name: "Café des Arts",
  coordinates: { latitude: 36.4, longitude: 25.4 },
  attribution: "test",
  ...overrides,
});

describe("excludePreviouslyUsedPlaces", () => {
  it("is agnostic to the day, stop, and trip that produced history", () => {
    const candidates = [place({ id: "used" }), place({ id: "new", providerPlaceId: "google-2", name: "New Place" })];
    const history: UsedPlaceIdentity[] = [{ candidateId: "used" }];

    expect(excludePreviouslyUsedPlaces(candidates, history).map((candidate) => candidate.id)).toEqual(["new"]);
  });

  it("matches names without accents or case sensitivity", () => {
    const candidates = [place({ id: "cafe", name: "CAFÉ DES ARTS" })];
    expect(excludePreviouslyUsedPlaces(candidates, [{ name: "cafe des arts" }])).toEqual([]);
  });

  it("excludes a same-name place within 100 metres", () => {
    const candidates = [place({ coordinates: { latitude: 36.4005, longitude: 25.4 } })];
    expect(excludePreviouslyUsedPlaces(candidates, [{ name: "Cafe des Arts", coordinates: { latitude: 36.4, longitude: 25.4 } }])).toEqual([]);
  });

  it("keeps a homonym farther than 100 metres", () => {
    const candidates = [place({ id: "far", coordinates: { latitude: 36.402, longitude: 25.4 } })];
    expect(excludePreviouslyUsedPlaces(candidates, [{ name: "Cafe des Arts", coordinates: { latitude: 36.4, longitude: 25.4 } }])).toEqual(candidates);
  });

  it("excludes the same place across providers when the name and proximity match", () => {
    const candidates = [place({ provider: "geoapify", providerPlaceId: "geo-1" })];
    const history: UsedPlaceIdentity[] = [{ provider: "google", providerPlaceId: "google-1", name: "Cafe des Arts", coordinates: { latitude: 36.4, longitude: 25.4 } }];
    expect(excludePreviouslyUsedPlaces(candidates, history)).toEqual([]);
  });

  it("supports exact candidate and provider identities", () => {
    const candidates = [
      place({ id: "candidate-used" }),
      place({ id: "provider-used", providerPlaceId: "provider-used" }),
      place({ id: "remaining", providerPlaceId: "remaining" }),
    ];
    const history: UsedPlaceIdentity[] = [
      { candidateId: "candidate-used" },
      { provider: "google", providerPlaceId: "provider-used" },
    ];
    expect(excludePreviouslyUsedPlaces(candidates, history).map((candidate) => candidate.id)).toEqual(["remaining"]);
  });

  it("uses a conservative name-only exclusion for history without coordinates", () => {
    const candidates = [place({ id: "same-name", coordinates: { latitude: 40, longitude: 20 } }), place({ id: "different", name: "Other" })];
    expect(excludePreviouslyUsedPlaces(candidates, [{ name: "Cafe des Arts" }]).map((candidate) => candidate.id)).toEqual(["different"]);
  });

  it("ignores partial or invalid history without throwing", () => {
    const candidates = [place({ id: "kept" })];
    const history = [null, {}, { provider: "unknown" }, { coordinates: { latitude: 999, longitude: 0 } }, { name: "" }] as unknown as UsedPlaceIdentity[];
    expect(excludePreviouslyUsedPlaces(candidates, history)).toEqual(candidates);
  });

  it("preserves order and does not mutate candidates", () => {
    const candidates = [place({ id: "first" }), place({ id: "second", name: "Other", providerPlaceId: "google-2" })];
    const snapshot = structuredClone(candidates);
    const result = excludePreviouslyUsedPlaces(candidates, []);
    expect(result.map((candidate) => candidate.id)).toEqual(["first", "second"]);
    expect(candidates).toEqual(snapshot);
    expect(result[0]).toBe(candidates[0]);
  });
});
