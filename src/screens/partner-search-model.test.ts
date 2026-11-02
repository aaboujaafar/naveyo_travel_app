import { describe, expect, it } from "vitest";
import type { ItineraryItem, UUID } from "../modules/_shared/model";
import { itineraryItem } from "../modules/__fixtures__/domain";
import type { LegGap, StayGap } from "../modules/logistics";
import { journeyGroups, sensibleModes, stayGroups } from "./partner-search-model";

const stop = { id: "s1", name: "Lisbonne", countryCode: "PT", startDate: "2026-11-16", endDate: "2026-11-20" };
const gap: StayGap = { kind: "stay", key: "k", stop, checkIn: "2026-11-16", checkOut: "2026-11-20", nights: 4 };
const planned = (title: string, latitude: number, longitude: number): ItineraryItem => ({
  ...itineraryItem, id: `00000000-0000-4000-8000-${String(Math.round(latitude * 1000)).padStart(12, "0")}` as UUID, stopId: "s1" as UUID, title,
  place: { kind: "venue", label: title, coordinates: { latitude, longitude } },
});

describe("partner search", () => {
  it("adds a search near the planned place closest to the activities' centre", () => {
    const { summary, groups } = stayGroups(gap, { adults: 2, childrenAges: [4] }, [
      planned("Castelo de São Jorge", 38.7139, -9.1335),
      planned("Praça do Comércio", 38.7075, -9.1364),
      planned("Time Out Market", 38.7069, -9.1460),
    ]);
    expect(summary).toBe("Lisbonne · lun. 16 nov. → ven. 20 nov. · 2 adultes · 1 enfant");
    expect(groups.map((group) => [group.title, group.detail])).toEqual([["Près de vos activités", "Autour de Praça do Comércio"], ["Dans toute la ville", undefined]]);
    expect(new URL(groups[0]!.links[0]!.url).searchParams.get("ss")).toBe("Praça do Comércio, Lisbonne");
    expect(stayGroups(gap, { adults: 1, childrenAges: [] }, []).groups.map((group) => group.title)).toEqual(["Lisbonne"]);
  });

  it("offers the transport that suits the distance", () => {
    expect([sensibleModes(270), sensibleModes(1200), sensibleModes(2500)]).toEqual([["ground"], ["ground", "flight"], ["flight"]]);
    const leg: LegGap = { kind: "leg", key: "l", from: { name: "Paris", countryCode: "FR" }, to: { name: "Lisbonne", countryCode: "PT" }, date: "2026-11-16", role: "outbound", distanceKm: 1453 };
    const { groups } = journeyGroups(leg, { adults: 2, childrenAges: [] }, { from: "PAR", to: "LIS" });
    expect(groups[0]!.links.map((link) => [link.partner, link.prefilled])).toEqual([["omio", false], ["aviasales", true]]);
  });
});
