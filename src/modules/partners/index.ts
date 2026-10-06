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
