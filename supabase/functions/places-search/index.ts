import { requireTripMember } from "../_shared/auth.ts";

type Coordinates = { latitude: number; longitude: number };
type SearchRequest = {
  operation?: unknown;
  query?: unknown;
  countryCode?: unknown;
  stopId?: unknown;
  tripId?: unknown;
  stopName?: unknown;
  type?: unknown;
  near?: unknown;
  id?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  radiusMeters?: unknown;
  categories?: unknown;
  coordinates?: unknown;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const fail = (error: string, status = 400): never => {
  throw new Response(JSON.stringify({ error }), { status });
};
const coordinates = (latitude: unknown, longitude: unknown): Coordinates => {
  if (
    typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) fail("invalid_coordinates");
  return { latitude: latitude as number, longitude: longitude as number };
};

function parseRequest(value: unknown): SearchRequest & { operation: string; tripId: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid_request");
  const request = value as SearchRequest;
  const operation = request.operation;
  const valid = ["search", "getById", "autocomplete", "reverse", "nearby", "placeDetails"];
  if (typeof operation !== "string" || !valid.includes(operation)) fail("invalid_operation");
  if (!uuid(request.tripId)) fail("trip_required");
  if (request.stopId !== undefined && !uuid(request.stopId)) fail("invalid_stop_id");
  if (operation === "getById" || operation === "placeDetails") {
    if (!uuid(request.id)) fail("invalid_place_id");
  }
  if (operation === "search" || operation === "autocomplete") {
    if (typeof request.query !== "string" || request.query.trim().length < 2 || request.query.trim().length > 160)
      fail("invalid_query");
    if (request.countryCode !== undefined && (typeof request.countryCode !== "string" || !/^[A-Za-z]{2}$/.test(request.countryCode)))
      fail("invalid_country");
  }
  if (operation === "reverse" || operation === "nearby") {
    const point = request.coordinates && typeof request.coordinates === "object" && !Array.isArray(request.coordinates)
      ? request.coordinates as Record<string, unknown>
      : request;
    coordinates(point.latitude, point.longitude);
  }
  if (operation === "nearby") {
    if (request.radiusMeters !== undefined &&
      (typeof request.radiusMeters !== "number" || !Number.isFinite(request.radiusMeters) || request.radiusMeters < 100 || request.radiusMeters > 5000))
      fail("invalid_radius");
    if (request.categories !== undefined &&
      (!Array.isArray(request.categories) || request.categories.length > 8 || request.categories.some((c) => typeof c !== "string" || c.length < 1 || c.length > 80)))
      fail("invalid_categories");
  }
  return request as SearchRequest & { operation: string; tripId: string };
}

function typeCategory(type: string | undefined): string | undefined {
  if (type === "airport") return "airport";
  if (type === "port") return "commercial.port";
  if (type === "station") return "public_transport.train";
  if (type === "accommodation") return "accommodation.hotel";
  if (type === "restaurant") return "catering.restaurant";
  if (type === "attraction") return "tourism.sights,tourism.attraction";
  if (type === "activity") return "activity,leisure";
  return undefined;
}

// Edge instances are short-lived, so this is intentionally a small best-effort cache.
const cache = new Map<string, { expires: number; body: string }>();
const CACHE_MS = 30_000;
const cached = (key: string): string | undefined => {
  const item = cache.get(key);
  if (!item || item.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return item.body;
};

type UnsplashPhoto = {
  imageUrl: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
};

const imageCache = new Map<string, { expires: number; photo: UnsplashPhoto | null }>();
const IMAGE_CACHE_MS = 6 * 60 * 60 * 1_000;
const IMAGE_TIMEOUT_MS = 2_500;
const IMAGE_ENRICH_LIMIT = 6;

const withUnsplashAttribution = (value: string): string =>
  `${value}${value.includes("?") ? "&" : "?"}utm_source=naveyo&utm_medium=referral`;

function unsplashQuery(properties: Record<string, unknown>): string | undefined {
  const name = text(properties.name) ?? text(properties.formatted);
  if (!name) return undefined;
  const categories = Array.isArray(properties.categories)
    ? properties.categories.filter((value): value is string => typeof value === "string").join(" ").toLowerCase()
    : text(properties.category)?.toLowerCase() ?? "";
  const suffix = /catering|restaurant|food|dish|cuisine/.test(categories)
    ? "food dish local cuisine"
    : /tourism|sights|museum|attraction|activity|landmark/.test(categories)
      ? "travel landmark architecture"
      : "travel place";
  const city = text(properties.city) ?? text(properties.county) ?? text(properties.country);
  return `${name}${city ? ` ${city}` : ""} ${suffix}`.slice(0, 120);
}

async function fetchUnsplashPhoto(query: string, accessKey: string): Promise<UnsplashPhoto | null> {
  const cachedPhoto = imageCache.get(query);
  if (cachedPhoto && cachedPhoto.expires > Date.now()) return cachedPhoto.photo;
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json() as {
      results?: {
        urls?: { regular?: unknown; small?: unknown };
        user?: { name?: unknown; links?: { html?: unknown } };
      }[];
    };
    const result = payload.results?.[0];
    const imageUrl = typeof result?.urls?.regular === "string"
      ? result.urls.regular
      : typeof result?.urls?.small === "string" ? result.urls.small : undefined;
    const photographer = typeof result?.user?.name === "string" ? result.user.name.trim() : undefined;
    const photographerUrl = typeof result?.user?.links?.html === "string" ? result.user.links.html : undefined;
    if (!imageUrl || !photographer || !photographerUrl) return null;
    const photo: UnsplashPhoto = {
      imageUrl,
      photographer,
      photographerUrl: withUnsplashAttribution(photographerUrl),
      sourceUrl: "https://unsplash.com/?utm_source=naveyo&utm_medium=referral",
    };
    imageCache.set(query, { expires: Date.now() + IMAGE_CACHE_MS, photo });
    return photo;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichWithUnsplash(body: string, operation: string): Promise<string> {
  const accessKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!accessKey || !["search", "nearby", "getById", "placeDetails"].includes(operation)) return body;
  let payload: { features?: unknown };
  try {
    payload = JSON.parse(body) as { features?: unknown };
  } catch {
    return body;
  }
  if (!Array.isArray(payload.features)) return body;
  const targets = payload.features
    .map((feature, index) => ({ feature, index }))
    .filter(({ feature }) => feature && typeof feature === "object" && !Array.isArray(feature))
    .slice(0, IMAGE_ENRICH_LIMIT);
  const photos = await Promise.all(targets.map(async ({ feature, index }) => {
    const properties = (feature as { properties?: unknown }).properties;
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) return { index, photo: null };
    const query = unsplashQuery(properties as Record<string, unknown>);
    return { index, photo: query ? await fetchUnsplashPhoto(query, accessKey) : null };
  }));
  for (const { index, photo } of photos) {
    if (!photo) continue;
    const feature = payload.features[index];
    if (!feature || typeof feature !== "object" || Array.isArray(feature)) continue;
    const properties = (feature as { properties?: unknown }).properties;
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) continue;
    const record = properties as Record<string, unknown>;
    // Prefer the curated Unsplash image when configured; otherwise the original
    // Geoapify image (if any) remains untouched because this function exits early.
    record.image = photo.imageUrl;
    record.image_credit = {
      photographer: photo.photographer,
      photographerUrl: photo.photographerUrl,
      sourceUrl: photo.sourceUrl,
    };
  }
  return JSON.stringify(payload);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const input = parseRequest(await request.json());
    const { client } = await requireTripMember(request, input.tripId);
    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!apiKey) return json({ error: "places_provider_unavailable" }, 503);

    let providerPlaceId: string | undefined;
    if (input.operation === "getById" || input.operation === "placeDetails") {
      const { data, error } = await client.from("places").select("provider_place_id").eq("id", input.id).eq("trip_id", input.tripId).maybeSingle();
      if (error) return json({ error: "places_lookup_failed" }, 503);
      providerPlaceId = text(data?.provider_place_id);
      if (!providerPlaceId) {
        // Itinerary places keep the client candidate id they were confirmed with.
        const { data: saved, error: savedError } = await client.from("places").select("provider_place_id").eq("trip_id", input.tripId).eq("provider_payload->>candidateId", String(input.id)).limit(1).maybeSingle();
        if (savedError) return json({ error: "places_lookup_failed" }, 503);
        providerPlaceId = text(saved?.provider_place_id);
      }
      if (!providerPlaceId) return json({ error: "place_not_found" }, 404);
    }

    const endpoint =
      input.operation === "nearby" ? "https://api.geoapify.com/v2/places" :
      input.operation === "getById" || input.operation === "placeDetails" ? "https://api.geoapify.com/v2/place-details" :
      input.operation === "reverse" ? "https://api.geoapify.com/v1/geocode/reverse" :
      input.operation === "autocomplete" ? "https://api.geoapify.com/v1/geocode/autocomplete" :
      "https://api.geoapify.com/v1/geocode/search";
    const url = new URL(endpoint);
    url.searchParams.set("apiKey", apiKey);
    // Keep the provider response shape stable for the mobile normalizer.
    url.searchParams.set("format", "geojson");
    url.searchParams.set("limit", input.operation === "nearby" ? "20" : "5");
    if (providerPlaceId) url.searchParams.set("id", providerPlaceId);
    const source = input.coordinates && typeof input.coordinates === "object" && !Array.isArray(input.coordinates)
        ? input.coordinates as Record<string, unknown>
        : input;
    if (input.operation === "reverse" || input.operation === "nearby") {
      const point = coordinates(source.latitude, source.longitude);
      url.searchParams.set("lat", String(point.latitude));
      url.searchParams.set("lon", String(point.longitude));
    }
    if (input.operation === "nearby") {
      const radius = input.radiusMeters === undefined ? 1000 : input.radiusMeters as number;
      url.searchParams.set("filter", `circle:${source.longitude},${source.latitude},${radius}`);
      const categories = Array.isArray(input.categories) ? input.categories : ["catering.restaurant", "tourism.sights", "accommodation", "activity"];
      url.searchParams.set("categories", categories.join(","));
    }
    if (input.operation === "search" || input.operation === "autocomplete") {
      url.searchParams.set("text", String(input.query).trim());
      if (text(input.countryCode)) url.searchParams.set("filter", `countrycode:${String(input.countryCode).toLowerCase()}`);
      const category = typeCategory(text(input.type));
      if (category) url.searchParams.set("categories", category);
      const near = input.near;
      if (near && typeof near === "object" && !Array.isArray(near)) {
        const item = near as Record<string, unknown>;
        const point = coordinates(item.latitude, item.longitude);
        url.searchParams.set("bias", `proximity:${point.longitude},${point.latitude}`);
      }
    }
    const key = `${input.operation}:${url.pathname}:${url.searchParams.toString().replace(`apiKey=${apiKey}`, "apiKey=*")}`;
    const old = cached(key);
    if (old) return new Response(old, { headers: { "Content-Type": "application/json", "X-Places-Attribution": "Geoapify" } });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7_000);
    let response: Response;
    try { response = await fetch(url, { signal: controller.signal }); }
    catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return json({ error: "places_timeout" }, 408);
      return json({ error: "places_provider_failed" }, 503);
    } finally { clearTimeout(timeout); }
    if (response.status === 429) return json({ error: "places_quota_reached" }, 429);
    if (!response.ok) return json({ error: "places_provider_failed" }, response.status >= 500 ? 503 : 502);
    const body = await enrichWithUnsplash(await response.text(), input.operation);
    cache.set(key, { expires: Date.now() + CACHE_MS, body });
    return new Response(body, { status: 200, headers: { "Content-Type": "application/json", "X-Places-Attribution": "Geoapify" } });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: "places_search_failed" }, 500);
  }
});
