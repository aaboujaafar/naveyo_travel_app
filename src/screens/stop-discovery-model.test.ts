import { describe, expect, it } from "vitest";
import type { IANATimeZone, ItineraryItem, PlaceCandidate, Stop, UUID } from "../modules/_shared/model";
import type { PlacesModule } from "../modules/places";
import { loadStopDiscovery, recommendDiscoveryDate } from "./stop-discovery-model";

const tripId = "trip-1" as UUID;
const stop: Stop = {
  id: "stop-1" as UUID,
  tripId,
  name: "Lisbonne",
  countryCode: "PT",
  timeZone: "Europe/Lisbon" as IANATimeZone,
  startDate: "2026-08-10",
  endDate: "2026-08-12",
};

describe("stop discovery", () => {
  it("requests must-sees, activities and specialties around the stop", async () => {
    const inputs: Parameters<PlacesModule["nearby"]>[0][] = [];
    const candidates = [place("museum"), place("walk"), place("restaurant")];
    const places = {
      async nearby(input: Parameters<PlacesModule["nearby"]>[0]) {
        inputs.push(input);
        return [candidates[inputs.length - 1]!];
      },
    } as unknown as PlacesModule;

    const sections = await loadStopDiscovery(places, tripId, stop, { latitude: 38.72, longitude: -9.14 });

    expect(sections.map((section) => section.kind)).toEqual(["mustSee", "activity", "specialty"]);
    expect(inputs).toHaveLength(3);
    expect(inputs[0]?.radiusMeters).toBe(5_000);
    expect(inputs[2]?.type).toBe("restaurant");
  });

  it("places a new suggestion on the least busy day", () => {
    const items = [item("2026-08-10"), item("2026-08-10"), item("2026-08-11")];
    expect(recommendDiscoveryDate(stop, items)).toBe("2026-08-12");
  });

  it("keeps successful categories when another Places request fails", async () => {
    let request = 0;
    const places = {
      async search() {
        request += 1;
        if (request === 2) throw new Error("activity search unavailable");
        return [place(`place-${request}`)];
      },
    } as unknown as PlacesModule;

    const sections = await loadStopDiscovery(places, tripId, stop);
    expect(sections.map((section) => section.places.length)).toEqual([1, 0, 1]);
  });
});

function place(id: string): PlaceCandidate {
  return {
    id: id as UUID,
    provider: "geoapify",
    name: id,
    coordinates: { latitude: 38.72, longitude: -9.14 },
  };
}

function item(date: string): ItineraryItem {
  return {
    id: `${date}-${Math.random()}` as UUID,
    tripId,
    stopId: stop.id,
    title: "Programme",
    date,
  };
}
