import type { PlaceCandidate, Stop, UUID } from "../modules/_shared/model";

export interface PlaceScheduleDate {
  stopId: UUID;
  date: string;
  label: string;
}

const months = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

export function buildPlaceScheduleDates(stops: readonly Stop[]): PlaceScheduleDate[] {
  return [...stops]
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
    .flatMap((stop) =>
      datesBetween(stop.startDate, stop.endDate).map((date) => ({
        stopId: stop.id,
        date,
        label: `${stop.name} · ${formatLocalDate(date)}`,
      })),
    );
}

// Geoapify category keys, most specific first within each family.
const categoryLabels: Record<string, string> = {
  "catering.restaurant": "Restaurant",
  "catering.cafe": "Café",
  "catering.bar": "Bar",
  "catering.pub": "Pub",
  "catering.fast_food": "Restauration rapide",
  "catering.ice_cream": "Glacier",
  "catering.biergarten": "Brasserie",
  "catering.food_court": "Aire de restauration",
  catering: "Restaurant",
  "accommodation.hotel": "Hôtel",
  "accommodation.hostel": "Auberge de jeunesse",
  "accommodation.guest_house": "Maison d’hôtes",
  "accommodation.apartment": "Appartement",
  "accommodation.motel": "Motel",
  accommodation: "Hébergement",
  "tourism.sights.memorial": "Monument",
  "tourism.sights.castle": "Château",
  "tourism.sights.fort": "Fort",
  "tourism.sights.viewpoint": "Point de vue",
  "tourism.sights.place_of_worship": "Lieu de culte",
  "tourism.sights.monastery": "Monastère",
  "tourism.sights.tower": "Tour",
  "tourism.sights.bridge": "Pont",
  "tourism.sights.archaeological_site": "Site archéologique",
  "tourism.sights.square": "Place",
  "tourism.sights": "À voir",
  "tourism.attraction": "Attraction",
  "tourism.information": "Office de tourisme",
  tourism: "Tourisme",
  "entertainment.museum": "Musée",
  "entertainment.culture": "Culture",
  "entertainment.zoo": "Zoo",
  "entertainment.aquarium": "Aquarium",
  "entertainment.theme_park": "Parc d’attractions",
  entertainment: "Loisirs",
  "leisure.park": "Parc",
  "leisure.picnic": "Pique-nique",
  leisure: "Loisirs",
  "beach": "Plage",
  "natural": "Nature",
  "heritage": "Patrimoine",
  "religion": "Lieu de culte",
  "commercial.supermarket": "Supermarché",
  "commercial.marketplace": "Marché",
  commercial: "Commerce",
  "activity": "Activité",
  "sport": "Sport",
  "airport": "Aéroport",
  "public_transport.train": "Gare",
  "public_transport": "Transport",
  "commercial.port": "Port",
  "populated_place": "Ville",
  "building.historic": "Site historique",
  "building.tourism": "À voir",
};

/** French label for a provider category such as `catering.restaurant.portuguese`. */
export function formatPlaceCategory(category?: string): string | null {
  const value = category?.trim().toLowerCase();
  if (!value) return null;
  const parts = value.split(".");
  for (let length = parts.length; length > 0; length -= 1) {
    const label = categoryLabels[parts.slice(0, length).join(".")];
    if (label) return label;
  }
  // An unknown provider key would show an English word in a French app: better say nothing.
  return null;
}

const countryNames: Record<string, string> = {
  PT: "Portugal", ES: "Espagne", FR: "France", IT: "Italie", DE: "Allemagne", BE: "Belgique",
  CH: "Suisse", NL: "Pays-Bas", GB: "Royaume-Uni", IE: "Irlande", MA: "Maroc", GR: "Grèce",
  HR: "Croatie", AT: "Autriche", US: "États-Unis", CA: "Canada", JP: "Japon", TN: "Tunisie",
  DZ: "Algérie", TR: "Turquie", LU: "Luxembourg", DK: "Danemark", SE: "Suède", NO: "Norvège",
};

/** Country name with its flag, falling back to the ISO code when the name is unknown. */
export function formatCountry(countryCode?: string): string | null {
  const code = countryCode?.trim().toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code)) return null;
  const flag = String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
  return `${flag} ${countryNames[code] ?? code}`;
}

export function formatPlaceSource(provider: PlaceCandidate["provider"]): string {
  return provider === "geoapify" ? "Lieu vérifié" : "Lieu saisi manuellement";
}

function datesBetween(start: string, end: string): string[] {
  const startParts = parseDate(start);
  const endParts = parseDate(end);
  if (!startParts || !endParts) return [];

  const current = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
  const last = Date.UTC(endParts.year, endParts.month - 1, endParts.day);
  if (last < current) return [];

  const result: string[] = [];
  for (let instant = current; instant <= last; instant += 86_400_000) {
    const date = new Date(instant);
    result.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return result;
}

function formatLocalDate(value: string): string {
  const parts = parseDate(value);
  if (!parts) return value;
  return `${parts.day} ${months[parts.month - 1]}`;
}

function parseDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}
