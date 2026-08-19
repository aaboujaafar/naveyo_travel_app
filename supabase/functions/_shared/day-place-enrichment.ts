import type { DiscoveredPlace, PlaceOpeningHours } from "./day-place-discovery.ts";
import { parsePlaceOpeningHours } from "./day-place-discovery.ts";

const DETAILS_ENDPOINT = "https://api.geoapify.com/v2/place-details";
const REQUEST_TIMEOUT_MS = 4_000;
const MAX_CANDIDATES = 16;
const MAX_CONCURRENCY = 4;

type EnrichmentOptions = {
  maxCandidates?: number;
  fetcher?: typeof fetch;
};

const text = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  return result.length > 0 ? result : undefined;
};

const detailsOpeningHours = (payload: unknown): PlaceOpeningHours | undefined => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const root = payload as Record<string, unknown>;
  const feature = Array.isArray(root.features) ? root.features[0] : root;
  if (!feature || typeof feature !== "object" || Array.isArray(feature)) return undefined;
  const featureRecord = feature as Record<string, unknown>;
  const properties = featureRecord.properties && typeof featureRecord.properties === "object" && !Array.isArray(featureRecord.properties)
    ? featureRecord.properties as Record<string, unknown>
    : undefined;
  const details = properties?.details && typeof properties.details === "object" && !Array.isArray(properties.details)
    ? properties.details as Record<string, unknown>
    : featureRecord.details && typeof featureRecord.details === "object" && !Array.isArray(featureRecord.details)
      ? featureRecord.details as Record<string, unknown>
      : undefined;
  const openingHours = details?.opening_hours ?? details?.openingHours ?? properties?.opening_hours ?? featureRecord.opening_hours;
  return parsePlaceOpeningHours(openingHours);
};

const enrichOne = async (candidate: DiscoveredPlace, apiKey: string, fetcher: typeof fetch): Promise<DiscoveredPlace> => {
  const url = new URL(DETAILS_ENDPOINT);
  url.searchParams.set("id", candidate.providerPlaceId);
  url.searchParams.set("features", "details");
  url.searchParams.set("apiKey", apiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) return candidate;
    const openingHours = detailsOpeningHours(await response.json());
    return openingHours
      ? { ...candidate, openingHours }
      : candidate;
  } catch {
    return candidate;
  } finally {
    clearTimeout(timeout);
  }
};

export async function enrichDayPlaces(
  candidates: DiscoveredPlace[],
  options: EnrichmentOptions = {},
): Promise<DiscoveredPlace[]> {
  const runtime = globalThis as typeof globalThis & { Deno?: { env?: { get(name: string): string | undefined } } };
  const apiKey = text(runtime.Deno?.env?.get("GEOAPIFY_API_KEY"));
  const maxCandidates = Math.max(1, Math.min(options.maxCandidates ?? MAX_CANDIDATES, MAX_CANDIDATES));
  const result = candidates.slice(0, maxCandidates);
  if (!apiKey) return result;
  const indexes = result.map((candidate, index) => candidate.provider === "geoapify" ? index : -1).filter((index) => index >= 0);
  const fetcher = options.fetcher ?? fetch;
  let next = 0;
  const worker = async () => {
    while (next < indexes.length) {
      const index = indexes[next++];
      const candidate = result[index];
      if (candidate) result[index] = await enrichOne(candidate, apiKey, fetcher);
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, indexes.length) }, worker));
  return result;
}
