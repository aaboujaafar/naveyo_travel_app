import type { PlaceCandidate, UUID } from "../../modules/_shared/model";
import type { PlaceSearchInput, PlacesProvider } from "../../modules/places";
import { normalizeGeoapifyResponse } from "./normalize";

export type PlacesTransport = (request: {
  operation: "search" | "getById";
  input: PlaceSearchInput | { id: UUID; tripId?: UUID };
}) => Promise<unknown>;

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
      if (response.status === 429)
        throw new Error("Places search quota reached");
      if (response.status === 408 || response.status >= 500)
        throw new Error("Places search is temporarily unavailable");
      if (!response.ok) throw new Error("Places search failed");
      return response.json() as Promise<unknown>;
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
