import { describe, expect, it } from "vitest";
import { collectUsedPlaceHistory } from "./day-plan-history";

describe("collectUsedPlaceHistory", () => {
  it("normalizes a DB row with an object relation", () => {
    const [identity] = collectUsedPlaceHistory([
      { place_id: "place-1", place: { id: "place-1", provider: "google", provider_place_id: "g-1", name: " Musée ", latitude: 48.85, longitude: 2.35 } },
    ], []);
    expect(identity).toEqual({ candidateId: "place-1", provider: "google", providerPlaceId: "g-1", name: "Musée", coordinates: { latitude: 48.85, longitude: 2.35 } });
  });

  it("supports DB relation arrays and places as the relation name", () => {
    expect(collectUsedPlaceHistory([
      { place_id: "place-2", places: [{ id: "place-2", name: "Plage", latitude: 36, longitude: 25 }] },
    ], [])).toEqual([{ candidateId: "place-2", name: "Plage", coordinates: { latitude: 36, longitude: 25 } }]);
  });

  it("normalizes mobile aliases and nested place data", () => {
    expect(collectUsedPlaceHistory([], [
      { candidateId: "candidate-1", provider: "geoapify", providerPlaceId: "osm-1", title: "Port", coordinates: { lat: 1, lng: 2 } },
      { placeId: "place-2", place: { provider: "google", providerPlaceId: "g-2", label: "Tour" }, },
    ])).toEqual([
      { candidateId: "candidate-1", provider: "geoapify", providerPlaceId: "osm-1", name: "Port", coordinates: { latitude: 1, longitude: 2 } },
      { candidateId: "place-2", provider: "google", providerPlaceId: "g-2", name: "Tour" },
    ]);
  });

  it("ignores malformed rows and invalid coordinates while retaining useful identity", () => {
    expect(collectUsedPlaceHistory([
      null,
      "bad",
      { place: { name: "No coordinates needed" } },
      { place_id: "useful", place: { latitude: 91, longitude: 2 } },
      { place: { latitude: 1, longitude: Number.NaN } },
      { place: { name: "" } },
    ], [undefined, { coordinates: { latitude: 2, longitude: 181 } }])).toEqual([
      { name: "No coordinates needed" },
      { candidateId: "useful" },
    ]);
  });

  it("deduplicates exact identities, bounds strings, and caps at 500", () => {
    const long = "x".repeat(300);
    const rows = Array.from({ length: 501 }, (_, index) => ({ place_id: `place-${index}`, name: long }));
    const result = collectUsedPlaceHistory(rows, [{ placeId: "place-0", name: long }]);
    expect(result).toHaveLength(500);
    expect(result[0]).toEqual({ candidateId: "place-0", name: "x".repeat(256) });
  });

  it("accepts non-array inputs without throwing", () => {
    expect(collectUsedPlaceHistory(null, { row: true })).toEqual([]);
  });
});
