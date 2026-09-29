import type { PlaceCandidate, UUID } from "../../modules/_shared/model";
import type {
  NearbyPlacesInput,
  PlaceAutocompleteInput,
  PlaceSearchInput,
  PlacesProvider,
  ReverseGeocodeInput,
} from "../../modules/places";
import { normalizeGeoapifyResponse } from "./normalize";

export type PlacesTransport = (request: {
  operation:
    | "search"
    | "getById"
    | "autocomplete"
    | "reverse"
    | "nearby"
    | "placeDetails";
  input:
    | PlaceSearchInput
    | { id: UUID; tripId?: UUID }
    | (PlaceAutocompleteInput & { tripId?: UUID })
    | (ReverseGeocodeInput & { tripId?: UUID })
    | {
        latitude: number;
        longitude: number;
        radiusMeters?: number;
        categories?: string[];
        tripId?: UUID;
      };
}) => Promise<unknown>;

export type GeoapifyAutocompleteInput = PlaceAutocompleteInput & { tripId?: UUID };
export type GeoapifyReverseInput = ReverseGeocodeInput & { tripId?: UUID };
export type GeoapifyNearbyInput = NearbyPlacesInput & { tripId?: UUID };

export class GeoapifyPlacesProvider implements PlacesProvider {
  constructor(private readonly transport: PlacesTransport) {}

  async search(input: PlaceSearchInput): Promise<PlaceCandidate[]> {
    return normalizeGeoapifyResponse(
      await this.transport({ operation: "search", input }),
    );
  }

  async getById(id: UUID, tripId?: UUID): Promise<PlaceCandidate | null> {
    const response = await this.transport({
      operation: "getById",
      input: { id, tripId },
    });
    if (response === null) return null;
    const candidates = normalizeGeoapifyResponse(response);
    return candidates[0] ?? null;
  }

  async autocomplete(input: PlaceAutocompleteInput): Promise<PlaceCandidate[]> {
    const query = input.query.trim();
    if (query.length < 2 || query.length > 160) return [];
    return normalizeGeoapifyResponse(
      await this.transport({ operation: "autocomplete", input: { ...input, query } }),
    );
  }

  async reverse(input: ReverseGeocodeInput): Promise<PlaceCandidate | null> {
    const candidates = normalizeGeoapifyResponse(
      await this.transport({ operation: "reverse", input: { coordinates: input.coordinates, tripId: input.tripId } }),
    );
    return candidates[0] ?? null;
  }

  async nearby(input: NearbyPlacesInput): Promise<PlaceCandidate[]> {
    return normalizeGeoapifyResponse(
      await this.transport({ operation: "nearby", input: { coordinates: input.coordinates, radiusMeters: input.radiusMeters, categories: nearbyCategories(input.type), tripId: input.tripId } }),
    );
  }

  async placeDetails(id: UUID, tripId?: UUID): Promise<PlaceCandidate | null> {
    const response = await this.transport({
      operation: "placeDetails",
      input: { id, tripId },
    });
    if (response === null) return null;
    const candidates = normalizeGeoapifyResponse(response);
    return candidates[0] ?? null;
  }
}

function nearbyCategories(type: NearbyPlacesInput["type"]): string[] | undefined {
  if (type === "restaurant") return ["catering.restaurant"];
  if (type === "accommodation") return ["accommodation"];
  if (type === "attraction") return ["tourism.sights", "tourism.attraction"];
  if (type === "activity") return ["activity", "leisure"];
  if (type === "airport") return ["airport"];
  if (type === "port") return ["commercial.port"];
  if (type === "station") return ["public_transport.train"];
  return undefined;
}

export function createGeoapifyPlacesProvider(
  endpoint: string,
  getAccessToken: () => Promise<string | null>,
): GeoapifyPlacesProvider {
  return new GeoapifyPlacesProvider(async ({ operation, input }) => {
    const token = await getAccessToken();
    if (!token) throw new Error("Authentication is required to search places");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operation, ...input }),
        signal: controller.signal,
      });
      // Read the body once so gateway diagnostics are not lost on 4xx/5xx.
      const rawBody = await response.text();
      let body: { error?: unknown; message?: unknown } | undefined;
      try {
        body = JSON.parse(rawBody) as { error?: unknown; message?: unknown };
      } catch {
        // The provider may return a non-JSON body; preserve the HTTP status below.
      }
      const detail = typeof body?.error === "string"
        ? body.error
        : typeof body?.message === "string" ? body.message : undefined;
      if (response.status === 429)
        throw new Error(`Places search quota reached${detail ? `: ${detail}` : ""}`);
      if (response.status === 408)
        throw new Error(`Places search timed out${detail ? `: ${detail}` : ""}`);
      if (response.status >= 500)
        throw new Error(`Places search unavailable (${response.status})${detail ? `: ${detail}` : ""}`);
      if (!response.ok)
        throw new Error(`Places search failed (${response.status})${detail ? `: ${detail}` : ""}`);
      return body ?? JSON.parse(rawBody) as unknown;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        throw new Error("Places search timed out");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  });
}

export { normalizeGeoapifyResponse } from "./normalize";
export {
  createGeoapifyRoutingProvider,
  GeoapifyRoutingProvider,
  normalizeGeoapifyRoute,
} from "./routing";
