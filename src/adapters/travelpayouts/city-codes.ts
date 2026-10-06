import type { Coordinates } from "../../modules/_shared/model";
import { distance } from "../../modules/logistics";

/** A code farther than this from the city is another place with a similar name. */
const MAX_DISTANCE_KM = 80;
const cache = new Map<string, string | null>();

/**
 * The IATA city code flight searches need (LIS, OPO, PAR), from the public
 * Travelpayouts place search. Null when no city of that country matches near
 * the given position: the flight search then opens without it.
 */
export async function findCityCode(city: { name: string; countryCode: string; coordinates?: Coordinates }): Promise<string | null> {
  const key = `${city.name}|${city.countryCode}`.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const params = new URLSearchParams({ term: city.name, locale: "fr" });
  params.append("types[]", "city");
  try {
    const response = await fetch(`https://autocomplete.travelpayouts.com/places2?${params.toString()}`);
    if (!response.ok) return null;
    const places = (await response.json()) as { code?: string; country_code?: string; coordinates?: { lat?: number; lon?: number } }[];
    const match = (Array.isArray(places) ? places : []).find((place) => {
      if (typeof place.code !== "string" || place.country_code?.toUpperCase() !== city.countryCode.toUpperCase()) return false;
      const lat = place.coordinates?.lat;
      const lon = place.coordinates?.lon;
      if (!city.coordinates || typeof lat !== "number" || typeof lon !== "number") return true;
      return distance(city.coordinates, { latitude: lat, longitude: lon }) <= MAX_DISTANCE_KM;
    });
    const code = match?.code ?? null;
    cache.set(key, code);
    return code;
  } catch {
    return null;
  }
}
