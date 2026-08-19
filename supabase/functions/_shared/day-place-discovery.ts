export type DayPlaceProvider = "google" | "geoapify";

export type PlaceBusinessStatus = "operational" | "temporarily_closed" | "permanently_closed" | "unknown";

export type PlaceOpeningHours = {
  periods?: {
    open: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }[];
  weekdayDescriptions?: string[];
  sourceText?: string;
};

export type PlaceFacts = {
  rating?: number;
  userRatingCount?: number;
  priceLevel?: 0 | 1 | 2 | 3 | 4;
  businessStatus?: PlaceBusinessStatus;
  openingHours?: PlaceOpeningHours;
};

export type DiscoveredPlace = {
  id: string;
  provider: DayPlaceProvider;
  providerPlaceId: string;
  name: string;
  category?: string;
  address?: string;
  countryCode?: string;
  coordinates: { latitude: number; longitude: number };
  attribution: string;
  distanceMeters?: number;
} & PlaceFacts;

export type DayPlaceDiscoveryInput = {
  center: { latitude: number; longitude: number };
  countryCode?: string;
  preferences: {
    radiusMeters: number;
    themes: string[];
    budget?: string;
    constraints?: {
      accessibility?: boolean;
      children?: boolean;
      indoorOutdoor?: string;
      dietary?: string[];
    };
  };
  maxCandidates?: number;
};

export type DayPlaceDiscoveryResult = {
  candidates: DiscoveredPlace[];
  providers: DayPlaceProvider[];
};

const GOOGLE_ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";
const GEOAPIFY_ENDPOINT = "https://api.geoapify.com/v2/places";
const REQUEST_TIMEOUT_MS = 7_000;
const GOOGLE_CALL_LIMIT = 4;
const GEOAPIFY_CALL_LIMIT = 4;
const DEFAULT_MAX_CANDIDATES = 60;
const GOOGLE_ATTRIBUTION = "Google Maps";
const GEOAPIFY_ATTRIBUTION = "Powered by Geoapify · © OpenStreetMap contributors";

type CategoryBucket = { key: string; google: string[]; geoapify: string[] };

const CATEGORY_BUCKETS: CategoryBucket[] = [
  {
    key: "culture",
    google: ["museum", "art_gallery", "historical_landmark"],
    geoapify: ["entertainment.museum", "tourism.sights", "tourism.attraction"],
  },
  {
    key: "food",
    google: ["restaurant", "cafe", "bar"],
    geoapify: ["catering.restaurant", "catering.cafe", "catering.bar"],
  },
  {
    key: "nature",
    google: ["park", "beach", "national_park", "nature_preserve"],
    geoapify: ["leisure.park", "natural.coastal", "leisure.park.nature_reserve", "tourism.sights"],
  },
  {
    key: "romantic",
    google: ["tourist_attraction", "observation_deck", "garden", "spa"],
    geoapify: ["tourism.attraction", "tourism.sights", "leisure.park.garden", "service.beauty.spa"],
  },
  {
    key: "shopping",
    google: ["shopping_mall", "market", "store"],
    geoapify: ["commercial.shopping_mall", "commercial.marketplace", "commercial.supermarket"],
  },
  {
    key: "family",
    google: ["amusement_park", "aquarium", "zoo", "playground"],
    geoapify: ["entertainment.zoo", "entertainment.aquarium", "entertainment.theme_park", "leisure.playground"],
  },
  {
    key: "nightlife",
    google: ["night_club", "bar", "live_music_venue"],
    geoapify: ["catering.bar", "catering.pub", "entertainment.culture"],
  },
  {
    key: "mixed",
    google: ["tourist_attraction", "restaurant", "museum", "park"],
    geoapify: ["tourism.attraction", "catering.restaurant", "entertainment.museum", "leisure.park"],
  },
];

const text = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  return result.length > 0 ? result : undefined;
};

const finiteCoordinate = (value: unknown, min: number, max: number): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return undefined;
  return value;
};

const normalizeName = (value: string): string => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

const validDayTime = (value: unknown): { day: number; hour: number; minute: number } | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const day = record.day;
  const hour = record.hour ?? 0;
  const minute = record.minute ?? 0;
  if (!Number.isInteger(day) || !Number.isInteger(hour) || !Number.isInteger(minute)) return undefined;
  if ((day as number) < 0 || (day as number) > 6 || (hour as number) < 0 || (hour as number) > 23 || (minute as number) < 0 || (minute as number) > 59) return undefined;
  return { day: day as number, hour: hour as number, minute: minute as number };
};

const DAY_NAMES: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };

const parseClock = (value: string): { hour: number; minute: number } | undefined => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? { hour, minute } : undefined;
};

const parseGeoOpeningHoursText = (value: string): PlaceOpeningHours | undefined => {
  const periods: NonNullable<PlaceOpeningHours["periods"]> = [];
  const pattern = /((?:Su|Mo|Tu|We|Th|Fr|Sa)(?:-(?:Su|Mo|Tu|We|Th|Fr|Sa))?)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g;
  for (const match of value.matchAll(pattern)) {
    const range = match[1].split("-");
    const startDay = DAY_NAMES[range[0]];
    const endDay = DAY_NAMES[range[1] ?? range[0]];
    const openClock = parseClock(match[2]);
    const closeClock = parseClock(match[3]);
    if (startDay === undefined || endDay === undefined || !openClock || !closeClock) continue;
    const days: number[] = [];
    for (let day = startDay; ; day = (day + 1) % 7) {
      days.push(day);
      if (day === endDay) break;
      if (days.length === 7) break;
    }
    for (const day of days) {
      periods.push({
        open: { day, hour: openClock.hour, minute: openClock.minute },
        close: { day: closeClock.hour < openClock.hour || (closeClock.hour === openClock.hour && closeClock.minute < openClock.minute) ? (day + 1) % 7 : day, hour: closeClock.hour, minute: closeClock.minute },
      });
    }
  }
  return periods.length > 0 ? { periods, sourceText: value.trim() } : (value.trim() ? { sourceText: value.trim() } : undefined);
};

export const parsePlaceOpeningHours = (value: unknown): PlaceOpeningHours | undefined => {
  if (typeof value === "string") return parseGeoOpeningHoursText(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const hasPeriods = Array.isArray(record.periods);
  const rawPeriods = hasPeriods ? record.periods as unknown[] : [];
  const periods = rawPeriods.flatMap((period) => {
    if (!period || typeof period !== "object" || Array.isArray(period)) return [];
    const item = period as Record<string, unknown>;
    const open = validDayTime(item.open);
    if (!open) return [];
    const close = item.close === undefined ? undefined : validDayTime(item.close);
    if (item.close !== undefined && !close) return [];
    return [{ open, ...(close ? { close } : {}) }];
  });
  const weekdayDescriptions = Array.isArray(record.weekdayDescriptions ?? record.weekday_text)
    ? (record.weekdayDescriptions ?? record.weekday_text as unknown[]).filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : undefined;
  const sourceText = text(record.sourceText);
  if (!hasPeriods && (!weekdayDescriptions || weekdayDescriptions.length === 0) && !sourceText) return undefined;
  return {
    ...(hasPeriods ? { periods } : {}),
    ...(weekdayDescriptions && weekdayDescriptions.length > 0 ? { weekdayDescriptions } : {}),
    ...(sourceText ? { sourceText } : {}),
  };
};

const parseRating = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5 ? value : undefined;
const parseCount = (value: unknown): number | undefined => typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
const GOOGLE_PRICE_LEVELS = {
  FREE: 0,
  INEXPENSIVE: 1,
  MODERATE: 2,
  EXPENSIVE: 3,
  VERY_EXPENSIVE: 4,
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
} as const;
const parsePriceLevel = (value: unknown): 0 | 1 | 2 | 3 | 4 | undefined => typeof value === "string" && value in GOOGLE_PRICE_LEVELS
  ? GOOGLE_PRICE_LEVELS[value as keyof typeof GOOGLE_PRICE_LEVELS]
  : undefined;

const parseBusinessStatus = (value: unknown): PlaceBusinessStatus | undefined => {
  if (value === "OPERATIONAL") return "operational";
  if (value === "CLOSED_TEMPORARILY") return "temporarily_closed";
  if (value === "CLOSED_PERMANENTLY") return "permanently_closed";
  if (typeof value === "string") return "unknown";
  return undefined;
};

const googleFacts = (place: Record<string, unknown>): PlaceFacts | undefined => {
  const regularOpeningHours = parsePlaceOpeningHours(place.regularOpeningHours);
  const facts: PlaceFacts = {
    ...(parseRating(place.rating) !== undefined ? { rating: parseRating(place.rating) } : {}),
    ...(parseCount(place.userRatingCount) !== undefined ? { userRatingCount: parseCount(place.userRatingCount) } : {}),
    ...(parsePriceLevel(place.priceLevel) !== undefined ? { priceLevel: parsePriceLevel(place.priceLevel) } : {}),
    ...(parseBusinessStatus(place.businessStatus) !== undefined ? { businessStatus: parseBusinessStatus(place.businessStatus) } : {}),
    ...(regularOpeningHours ? { openingHours: regularOpeningHours } : {}),
  };
  return Object.keys(facts).length > 0 ? facts : undefined;
};

export const haversineDistanceMeters = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
): number => {
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const latitudeOne = toRadians(first.latitude);
  const latitudeTwo = toRadians(second.latitude);
  const arc = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc)));
};

export const normalizeProviderId = (provider: DayPlaceProvider, providerPlaceId: string): string =>
  `${provider}:${providerPlaceId.trim()}`;

export const normalizeAndDedupePlaces = (places: DiscoveredPlace[]): DiscoveredPlace[] => {
  const exactIds = new Set<string>();
  const result: DiscoveredPlace[] = [];
  for (const place of places) {
    const exactId = normalizeProviderId(place.provider, place.providerPlaceId);
    if (exactIds.has(exactId)) continue;
    const duplicate = result.find((candidate) =>
      normalizeName(candidate.name) === normalizeName(place.name) &&
      haversineDistanceMeters(candidate.coordinates, place.coordinates) <= 100,
    );
    if (duplicate) continue;
    exactIds.add(exactId);
    result.push(place);
  }
  return result;
};

export async function deterministicUuid(namespace: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(namespace));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const selectedBuckets = (input: DayPlaceDiscoveryInput): CategoryBucket[] => {
  const normalizedThemes = new Set(input.preferences.themes.map((theme) => normalizeName(theme)));
  if (normalizedThemes.has("mixed")) {
    return CATEGORY_BUCKETS.filter((bucket) => ["culture", "food", "nature", "romantic"].includes(bucket.key));
  }
  if (normalizedThemes.has("beach")) normalizedThemes.add("nature");
  if (input.preferences.constraints?.children) normalizedThemes.add("family");
  if (input.preferences.constraints?.indoorOutdoor === "indoor") {
    normalizedThemes.add("culture");
    normalizedThemes.add("food");
  }
  if (input.preferences.constraints?.indoorOutdoor === "outdoor") normalizedThemes.add("nature");
  const matches = CATEGORY_BUCKETS.filter((bucket) => normalizedThemes.has(bucket.key));
  return (matches.length > 0 ? matches : [CATEGORY_BUCKETS[CATEGORY_BUCKETS.length - 1]]).slice(0, GOOGLE_CALL_LIMIT);
};

const geoapifyConditions = (input: DayPlaceDiscoveryInput): string[] => {
  const conditions = new Set<string>();
  if (input.preferences.constraints?.accessibility) conditions.add("wheelchair.yes");
  for (const preference of input.preferences.constraints?.dietary ?? []) {
    const normalized = normalizeName(preference);
    if (/vegetar/.test(normalized)) conditions.add("vegetarian");
    if (/vegan/.test(normalized)) conditions.add("vegan");
    if (/halal/.test(normalized)) conditions.add("halal");
    if (/kosher|casher/.test(normalized)) conditions.add("kosher");
    if (/gluten/.test(normalized)) conditions.add("gluten_free");
    if (/organic|bio/.test(normalized)) conditions.add("organic");
  }
  return [...conditions];
};

const fetchJson = async (url: URL, init: RequestInit): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
};

const googlePlace = async (value: unknown, center: DayPlaceDiscoveryInput["center"]): Promise<DiscoveredPlace | undefined> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const place = value as Record<string, unknown>;
  const location = place.location && typeof place.location === "object" ? place.location as Record<string, unknown> : undefined;
  const latitude = finiteCoordinate(location?.latitude, -90, 90);
  const longitude = finiteCoordinate(location?.longitude, -180, 180);
  const providerPlaceId = text(place.id);
  const name = text(place.displayName && typeof place.displayName === "object" ? (place.displayName as Record<string, unknown>).text : undefined);
  if (!providerPlaceId || !name || latitude === undefined || longitude === undefined) return undefined;
  const addressComponents = Array.isArray(place.addressComponents) ? place.addressComponents : [];
  const country = addressComponents.find((component) => {
    if (!component || typeof component !== "object" || Array.isArray(component)) return false;
    const types = (component as Record<string, unknown>).types;
    return Array.isArray(types) && types.includes("country");
  }) as Record<string, unknown> | undefined;
  const countryCode = text(country?.shortText);
  return {
    id: await deterministicUuid(normalizeProviderId("google", providerPlaceId)),
    provider: "google",
    providerPlaceId,
    name,
    category: Array.isArray(place.types) ? text(place.types.find((type) => typeof type === "string")) : undefined,
    address: text(place.formattedAddress),
    countryCode,
    coordinates: { latitude, longitude },
    attribution: GOOGLE_ATTRIBUTION,
    distanceMeters: haversineDistanceMeters(center, { latitude, longitude }),
    ...(googleFacts(place) ?? {}),
  };
};

async function discoverGoogle(input: DayPlaceDiscoveryInput, apiKey: string): Promise<DiscoveredPlace[]> {
  const places: DiscoveredPlace[] = [];
  for (const bucket of selectedBuckets(input).slice(0, GOOGLE_CALL_LIMIT)) {
    const payload = await fetchJson(new URL(GOOGLE_ENDPOINT), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.addressComponents,places.rating,places.userRatingCount,places.priceLevel,places.businessStatus,places.regularOpeningHours",
      },
      body: JSON.stringify({
        includedTypes: bucket.google,
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        ...(input.countryCode ? { regionCode: input.countryCode.toUpperCase() } : {}),
        locationRestriction: { circle: { center: { latitude: input.center.latitude, longitude: input.center.longitude }, radius: input.preferences.radiusMeters } },
      }),
    }) as { places?: unknown[] } | undefined;
    if (!payload?.places) continue;
    for (const place of payload.places) {
      const normalized = await googlePlace(place, input.center);
      if (normalized) places.push({ ...normalized, category: normalized.category ?? bucket.key });
    }
  }
  return places;
}

const geoapifyPlace = async (value: unknown, center: DayPlaceDiscoveryInput["center"]): Promise<DiscoveredPlace | undefined> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const feature = value as Record<string, unknown>;
  const properties = feature.properties && typeof feature.properties === "object" ? feature.properties as Record<string, unknown> : feature;
  const coordinates = feature.geometry && typeof feature.geometry === "object" && !Array.isArray(feature.geometry)
    ? (feature.geometry as Record<string, unknown>).coordinates
    : undefined;
  const coordinateArray = Array.isArray(coordinates) ? coordinates : undefined;
  const longitude = finiteCoordinate(coordinateArray?.[0], -180, 180) ?? finiteCoordinate(properties.lon, -180, 180);
  const latitude = finiteCoordinate(coordinateArray?.[1], -90, 90) ?? finiteCoordinate(properties.lat, -90, 90);
  const providerPlaceId = text(properties.place_id) ?? text(properties.osm_id);
  const name = text(properties.name) ?? text(properties.address_line1) ?? text(properties.formatted);
  if (!providerPlaceId || !name || latitude === undefined || longitude === undefined) return undefined;
  const categories = Array.isArray(properties.categories) ? properties.categories.filter((item): item is string => typeof item === "string") : [];
  const openingHours = parsePlaceOpeningHours(properties.opening_hours);
  return {
    id: await deterministicUuid(normalizeProviderId("geoapify", providerPlaceId)),
    provider: "geoapify",
    providerPlaceId,
    name,
    category: categories[0],
    address: text(properties.formatted),
    countryCode: text(properties.country_code),
    coordinates: { latitude, longitude },
    attribution: GEOAPIFY_ATTRIBUTION,
    distanceMeters: haversineDistanceMeters(center, { latitude, longitude }),
    ...(openingHours ? { openingHours } : {}),
  };
};

async function discoverGeoapify(input: DayPlaceDiscoveryInput, apiKey: string): Promise<DiscoveredPlace[]> {
  const places: DiscoveredPlace[] = [];
  for (const bucket of selectedBuckets(input).slice(0, GEOAPIFY_CALL_LIMIT)) {
    const url = new URL(GEOAPIFY_ENDPOINT);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("categories", bucket.geoapify.join(","));
    url.searchParams.set("filter", `circle:${input.center.longitude},${input.center.latitude},${input.preferences.radiusMeters}`);
    url.searchParams.set("bias", `proximity:${input.center.longitude},${input.center.latitude}`);
    url.searchParams.set("limit", "20");
    const conditions = geoapifyConditions(input);
    if (conditions.length > 0) url.searchParams.set("conditions", conditions.join(","));
    const payload = await fetchJson(url, {}) as { features?: unknown[] } | undefined;
    if (!payload?.features) continue;
    for (const feature of payload.features) {
      const normalized = await geoapifyPlace(feature, input.center);
      if (normalized) places.push({ ...normalized, category: normalized.category ?? bucket.key });
    }
  }
  return places;
}

export async function discoverDayPlaces(input: DayPlaceDiscoveryInput): Promise<DayPlaceDiscoveryResult> {
  const maxCandidates = Math.max(1, Math.min(input.maxCandidates ?? DEFAULT_MAX_CANDIDATES, DEFAULT_MAX_CANDIDATES));
  const runtime = globalThis as typeof globalThis & { Deno?: { env?: { get(name: string): string | undefined } } };
  const googleKey = text(runtime.Deno?.env?.get("GOOGLE_PLACES_API_KEY"));
  const geoapifyKey = text(runtime.Deno?.env?.get("GEOAPIFY_API_KEY"));
  let candidates: DiscoveredPlace[] = [];
  const providers: DayPlaceProvider[] = [];

  if (googleKey) {
    candidates = normalizeAndDedupePlaces(await discoverGoogle(input, googleKey));
    if (candidates.length > 0) providers.push("google");
  }
  if (candidates.length === 0 && geoapifyKey) {
    candidates = normalizeAndDedupePlaces(await discoverGeoapify(input, geoapifyKey));
    if (candidates.length > 0) providers.push("geoapify");
  }
  return { candidates: candidates.slice(0, maxCandidates), providers };
}
