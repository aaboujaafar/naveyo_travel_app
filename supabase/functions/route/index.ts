import { requireTripMember } from "../_shared/auth.ts";

type Coordinates = { latitude: number; longitude: number };
type RouteMode = "drive" | "walk" | "bicycle";
type RouteRequest = {
  tripId?: unknown;
  coordinates?: unknown;
  mode?: unknown;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const fail = (error: string, status = 400): never => {
  throw new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

function parseCoordinates(value: unknown): Coordinates[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 50) {
    fail("invalid_route_coordinates");
  }
  const result = value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      fail("invalid_route_coordinates");
    }
    const point = item as Record<string, unknown>;
    if (
      typeof point.latitude !== "number" || !Number.isFinite(point.latitude) ||
      point.latitude < -90 || point.latitude > 90 ||
      typeof point.longitude !== "number" || !Number.isFinite(point.longitude) ||
      point.longitude < -180 || point.longitude > 180
    ) {
      fail("invalid_route_coordinates");
    }
    return { latitude: point.latitude, longitude: point.longitude };
  });
  return result;
}

function parseRequest(value: unknown): {
  tripId: string;
  coordinates: Coordinates[];
  mode: RouteMode;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("invalid_request");
  }
  const request = value as RouteRequest;
  if (!uuid(request.tripId)) fail("trip_required");
  const mode = request.mode ?? "drive";
  if (mode !== "drive" && mode !== "walk" && mode !== "bicycle") {
    fail("invalid_route_mode");
  }
  return {
    tripId: request.tripId,
    coordinates: parseCoordinates(request.coordinates),
    mode,
  };
}

const cache = new Map<string, { expires: number; body: string }>();
const CACHE_MS = 5 * 60_000;

function cached(key: string): string | undefined {
  const entry = cache.get(key);
  if (!entry || entry.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.body;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const input = parseRequest(await request.json());
    await requireTripMember(request, input.tripId);
    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!apiKey) return json({ error: "route_provider_unavailable" }, 503);

    const waypoints = input.coordinates
      .map((point) => `${point.latitude},${point.longitude}`)
      .join("|");
    const key = `${input.mode}:${waypoints}`;
    const old = cached(key);
    if (old) return new Response(old, { headers: { "Content-Type": "application/json" } });

    const url = new URL("https://api.geoapify.com/v1/routing");
    url.searchParams.set("waypoints", waypoints);
    url.searchParams.set("mode", input.mode);
    url.searchParams.set("format", "geojson");
    url.searchParams.set("apiKey", apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return json({ error: "route_timeout" }, 408);
      return json({ error: "route_provider_failed" }, 503);
    } finally {
      clearTimeout(timeout);
    }
    if (response.status === 429) return json({ error: "route_quota_reached" }, 429);
    if (!response.ok) return json({ error: "route_provider_failed" }, response.status >= 500 ? 503 : 502);

    const body = await response.text();
    cache.set(key, { expires: Date.now() + CACHE_MS, body });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Route-Provider": "Geoapify" },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: "route_calculation_failed" }, 500);
  }
});
