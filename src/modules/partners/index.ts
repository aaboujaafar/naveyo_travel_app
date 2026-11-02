import type { Coordinates } from "../_shared/model";

export type PartnerCategory = "stay" | "flight" | "ground" | "car" | "esim";

export interface StaySearch {
  /** City, or « district, city » when searching near the planned places. */
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  childrenAges: readonly number[];
}

export interface JourneySearch {
  from: { name: string; countryCode: string; iata?: string };
  to: { name: string; countryCode: string; iata?: string };
  date: string;
  adults: number;
  childrenAges: readonly number[];
}

export interface PartnerLink {
  partner: string;
  label: string;
  category: PartnerCategory;
  url: string;
  /** False when the partner page opens without the search filled in: the summary is shown to copy. */
  prefilled: boolean;
}

/**
 * Travelpayouts identifiers. Without a marker, plain links are opened; once
 * the account and its programs are approved, setting them turns every link
 * into an affiliate one, without changing the screens.
 */
export interface AffiliateConfig {
  marker?: string;
  /** Travelpayouts program id per partner, from the account's « Tools ». */
  programs?: Partial<Record<string, string>>;
}

export const DEFAULT_AFFILIATE_CONFIG: AffiliateConfig = {
  marker: process.env.EXPO_PUBLIC_TRAVELPAYOUTS_MARKER || undefined,
  programs: {
    booking: process.env.EXPO_PUBLIC_TRAVELPAYOUTS_BOOKING || undefined,
    aviasales: process.env.EXPO_PUBLIC_TRAVELPAYOUTS_AVIASALES || undefined,
    omio: process.env.EXPO_PUBLIC_TRAVELPAYOUTS_OMIO || undefined,
    "12go": process.env.EXPO_PUBLIC_TRAVELPAYOUTS_12GO || undefined,
    discovercars: process.env.EXPO_PUBLIC_TRAVELPAYOUTS_DISCOVERCARS || undefined,
    airalo: process.env.EXPO_PUBLIC_TRAVELPAYOUTS_AIRALO || undefined,
  },
};

/** Wraps a partner URL in a Travelpayouts tracking link when the program is configured. */
export function affiliate(partner: string, url: string, config: AffiliateConfig = DEFAULT_AFFILIATE_CONFIG): string {
  const program = config.programs?.[partner];
  if (!config.marker || !program) return url;
  return `https://tp.media/r?marker=${encodeURIComponent(config.marker)}&p=${encodeURIComponent(program)}&u=${encodeURIComponent(url)}`;
}

/** Booking.com search filled with destination, dates and party. */
export function bookingUrl(search: StaySearch): string {
  const params = new URLSearchParams({
    ss: search.destination,
    checkin: search.checkIn,
    checkout: search.checkOut,
    group_adults: String(Math.max(1, search.adults)),
    group_children: String(search.childrenAges.length),
    no_rooms: "1",
  });
  for (const age of search.childrenAges) params.append("age", String(age));
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

/** Aviasales search when both cities have an IATA code, else its home page. */
export function aviasalesUrl(search: JourneySearch): { url: string; prefilled: boolean } {
  if (!search.from.iata || !search.to.iata) return { url: "https://www.aviasales.com/", prefilled: false };
  const params = new URLSearchParams({
    origin_iata: search.from.iata,
    destination_iata: search.to.iata,
    depart_date: search.date,
    adults: String(Math.max(1, search.adults)),
    children: String(search.childrenAges.filter((age) => age >= 2).length),
    infants: String(search.childrenAges.filter((age) => age < 2).length),
    one_way: "true",
  });
  return { url: `https://www.aviasales.com/?${params.toString()}`, prefilled: true };
}

/** Asia, where 12Go sells trains, buses and ferries; Omio covers Europe. */
const ASIA = new Set(["TH", "VN", "KH", "LA", "MY", "SG", "ID", "PH", "MM", "JP", "KR", "TW", "CN", "IN", "LK", "NP"]);

export function stayLinks(search: StaySearch, config?: AffiliateConfig): PartnerLink[] {
  return [{ partner: "booking", label: "Booking.com", category: "stay", url: affiliate("booking", bookingUrl(search), config), prefilled: true }];
}

export function journeyLinks(search: JourneySearch, modes: readonly ("flight" | "ground")[], config?: AffiliateConfig): PartnerLink[] {
  const links: PartnerLink[] = [];
  if (modes.includes("ground")) {
    const asia = ASIA.has(search.from.countryCode.toUpperCase()) && ASIA.has(search.to.countryCode.toUpperCase());
    links.push(asia
      ? { partner: "12go", label: "12Go (train, bus, ferry)", category: "ground", url: affiliate("12go", "https://12go.asia/en"), prefilled: false }
      : { partner: "omio", label: "Omio (train, bus, ferry)", category: "ground", url: affiliate("omio", "https://www.omio.com/"), prefilled: false });
  }
  if (modes.includes("flight")) {
    const { url, prefilled } = aviasalesUrl(search);
    links.push({ partner: "aviasales", label: "Aviasales (vols)", category: "flight", url: affiliate("aviasales", url, config), prefilled });
  }
  return links;
}

/** What to type on a partner page that opens without the search filled in. */
export function journeySummary(search: JourneySearch, formatDate: (date: string) => string): string {
  const children = search.childrenAges.length > 0 ? ` · ${search.childrenAges.length} enfant${search.childrenAges.length > 1 ? "s" : ""}` : "";
  return `${search.from.name} → ${search.to.name} · ${formatDate(search.date)} · ${search.adults} adulte${search.adults > 1 ? "s" : ""}${children}`;
}

/** The average position of the places planned at an Étape: where to look for a stay. */
export function centreOfPlaces(points: readonly Coordinates[]): Coordinates | null {
  const valid = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  if (valid.length < 2) return null;
  return {
    latitude: valid.reduce((sum, point) => sum + point.latitude, 0) / valid.length,
    longitude: valid.reduce((sum, point) => sum + point.longitude, 0) / valid.length,
  };
}

export interface JourneyEstimate {
  mode: "train" | "bus" | "flight";
  label: string;
  /** Door-to-door estimate in minutes, rounded to the quarter hour. */
  minutes: number;
}

/**
 * Rough door-to-door durations from the distance as the crow flies: roads
 * and rails are about a fifth longer, a flight adds the trips to and from
 * the airports and the checks. Shown as « environ », never as a timetable.
 */
export function estimateJourneys(distanceKm: number): JourneyEstimate[] {
  const quarter = (minutes: number) => Math.max(15, Math.round(minutes / 15) * 15);
  const estimates: JourneyEstimate[] = [];
  if (distanceKm <= 1500) {
    // Calibrated on Lisbon → Porto (274 km): about 3 h by train, 3 h 30–4 h by coach.
    estimates.push({ mode: "train", label: "Train", minutes: quarter(((distanceKm * 1.2) / 120) * 60 + 20) });
    estimates.push({ mode: "bus", label: "Bus", minutes: quarter(((distanceKm * 1.2) / 90) * 60 + 20) });
  }
  if (distanceKm >= 300) estimates.push({ mode: "flight", label: "Avion", minutes: quarter((distanceKm / 700) * 60 + 30 + 150) });
  return estimates.sort((left, right) => left.minutes - right.minutes);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

/** EU roaming zone (« roam like at home »): the European Union plus Iceland, Liechtenstein and Norway. */
const EU_ROAMING = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT",
  "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
]);

export type ExtraSuggestion =
  | { kind: "car"; key: string; stopId: string; stopName: string; startDate: string; endDate: string }
  | { kind: "esim"; key: string; countryCode: string; stopNames: string[] };

/**
 * Optional extras for the Voyage: a hire car at an Étape with no railway
 * station nearby, and an eSIM in each country outside the EU roaming zone.
 * `stationNearby` is undefined while unknown: no car is suggested then.
 */
export function suggestExtras(stops: readonly { id: string; name: string; countryCode: string; startDate: string; endDate: string }[], stationNearby: Readonly<Record<string, boolean | undefined>>): ExtraSuggestion[] {
  const cars: ExtraSuggestion[] = stops
    .filter((stop) => stationNearby[stop.id] === false)
    .map((stop) => ({ kind: "car", key: `car:${stop.id}`, stopId: stop.id, stopName: stop.name, startDate: stop.startDate, endDate: stop.endDate }));
  const countries = new Map<string, string[]>();
  for (const stop of stops) {
    const code = stop.countryCode.toUpperCase();
    if (EU_ROAMING.has(code)) continue;
    countries.set(code, [...(countries.get(code) ?? []), stop.name]);
  }
  const esims: ExtraSuggestion[] = [...countries].map(([countryCode, stopNames]) => ({ kind: "esim", key: `esim:${countryCode}`, countryCode, stopNames }));
  return [...cars, ...esims];
}

export function carLinks(config?: AffiliateConfig): PartnerLink[] {
  return [{ partner: "discovercars", label: "DiscoverCars (location de voiture)", category: "car", url: affiliate("discovercars", "https://www.discovercars.com/", config), prefilled: false }];
}

export function esimLinks(config?: AffiliateConfig): PartnerLink[] {
  return [{ partner: "airalo", label: "Airalo (eSIM)", category: "esim", url: affiliate("airalo", "https://www.airalo.com/", config), prefilled: false }];
}
