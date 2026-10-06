import type { ItineraryItem } from "../modules/_shared/model";
import { distance as km, type LegGap, type StayGap } from "../modules/logistics";
import { centreOfPlaces, journeyLinks, journeySummary, stayLinks, type JourneySearch } from "../modules/partners";
import type { PartnerSearchGroup } from "./PartnerSearchSheet";
import { shortDate } from "./logistics-model";

export interface Party {
  adults: number;
  childrenAges: readonly number[];
}

/**
 * Stay searches for a gap: in the whole city, and — when activities are
 * planned there — near the planned place closest to their centre.
 */
export function stayGroups(gap: StayGap, party: Party, itinerary: readonly ItineraryItem[]): { summary: string; groups: PartnerSearchGroup[] } {
  const base = { checkIn: gap.checkIn, checkOut: gap.checkOut, adults: party.adults, childrenAges: party.childrenAges };
  const places = itinerary
    .filter((item) => item.stopId === gap.stop.id && item.place?.coordinates)
    .map((item) => ({ name: item.place!.label || item.title, coordinates: item.place!.coordinates! }));
  const centre = centreOfPlaces(places.map((place) => place.coordinates));
  const landmark = centre ? places.reduce((best, place) => (km(place.coordinates, centre) < km(best.coordinates, centre) ? place : best)) : null;
  const groups: PartnerSearchGroup[] = [];
  if (landmark) {
    groups.push({
      title: `Près de vos activités`,
      detail: `Autour de ${landmark.name}`,
      links: stayLinks({ ...base, destination: `${landmark.name}, ${gap.stop.name}` }),
    });
  }
  groups.push({ title: landmark ? "Dans toute la ville" : gap.stop.name, links: stayLinks({ ...base, destination: gap.stop.name }) });
  const people = `${party.adults} adulte${party.adults > 1 ? "s" : ""}${party.childrenAges.length > 0 ? ` · ${party.childrenAges.length} enfant${party.childrenAges.length > 1 ? "s" : ""}` : ""}`;
  return { summary: `${gap.stop.name} · ${shortDate(gap.checkIn)} → ${shortDate(gap.checkOut)} · ${people}`, groups };
}

/** Which kinds of transport make sense for a distance: no flight under 300 km, no ground beyond 1,500 km. */
export function sensibleModes(distanceKm: number | undefined): ("flight" | "ground")[] {
  if (distanceKm === undefined) return ["ground", "flight"];
  if (distanceKm < 300) return ["ground"];
  if (distanceKm > 1500) return ["flight"];
  return ["ground", "flight"];
}

export function journeyGroups(gap: LegGap, party: Party, codes: { from?: string; to?: string }): { summary: string; groups: PartnerSearchGroup[] } {
  const search: JourneySearch = {
    from: { name: gap.from.name, countryCode: gap.from.countryCode, ...(codes.from ? { iata: codes.from } : {}) },
    to: { name: gap.to.name, countryCode: gap.to.countryCode, ...(codes.to ? { iata: codes.to } : {}) },
    date: gap.date,
    adults: party.adults,
    childrenAges: party.childrenAges,
  };
  const links = journeyLinks(search, sensibleModes(gap.distanceKm));
  return {
    summary: journeySummary(search, shortDate),
    groups: [{ title: gap.distanceKm ? `${gap.distanceKm.toLocaleString("fr-FR")} km à vol d’oiseau` : "Trajet", links }],
  };
}
