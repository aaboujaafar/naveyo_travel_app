import type { Coordinates, PlaceCandidate, UUID } from "../_shared/model";
import { assertStableId, parseCoordinates } from "../_shared/validation";
import type {
  ManualPlaceInput,
  NearbyPlacesInput,
  PlaceAutocompleteInput,
  PlaceSearchInput,
  PlacesModule,
  PlacesProvider,
  ReverseGeocodeInput,
} from "./interface";

const manualId = (name: string, coordinates: Coordinates): UUID => {
  const input = `${name.trim().toLowerCase()}|${coordinates.latitude.toFixed(6)}|${coordinates.longitude.toFixed(6)}`;
  let hash = 2166136261;
  for (const character of input)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return assertStableId(`${hex}-0000-4000-8000-000000000000`);
};

const maxRememberedCandidates = 200;

export class Places implements PlacesModule {
  /**
   * Provider candidates use client-side ids that are not rows of `places`,
   * so recently displayed candidates are resolved locally first.
   */
  private readonly recent = new Map<UUID, PlaceCandidate>();

  constructor(private readonly provider: PlacesProvider) {}

  remember(candidates: readonly PlaceCandidate[]): void {
    for (const candidate of candidates) {
      this.recent.delete(candidate.id);
      this.recent.set(candidate.id, candidate);
    }
    while (this.recent.size > maxRememberedCandidates) {
      const oldest = this.recent.keys().next().value;
      if (oldest === undefined) break;
      this.recent.delete(oldest);
    }
  }

  private async track<T extends PlaceCandidate[] | PlaceCandidate | null>(result: Promise<T>): Promise<T> {
    const value = await result;
    if (Array.isArray(value)) this.remember(value);
    else if (value) this.remember([value as PlaceCandidate]);
    return value;
  }

  search(input: PlaceSearchInput): Promise<PlaceCandidate[]> {
    const query = input.query.trim();
    if (query.length < 2 && !input.near) return Promise.resolve([]);
    return this.track(this.provider.search({ ...input, query }));
  }

  autocomplete(input: PlaceAutocompleteInput): Promise<PlaceCandidate[]> {
    const query = input.query.trim();
    if (query.length < 2) return Promise.resolve([]);
    const normalized = { ...input, query, limit: clampLimit(input.limit) };
    if (this.provider.autocomplete) return this.track(this.provider.autocomplete(normalized));
    return this.track(this.provider.search({ query, countryCode: input.countryCode, type: input.type === "city" ? "venue" : undefined }));
  }

  reverse(input: ReverseGeocodeInput): Promise<PlaceCandidate | null> {
    const coordinates = parseCoordinates(input.coordinates);
    if (this.provider.reverse) return this.track(this.provider.reverse({ coordinates, tripId: input.tripId }));
    return Promise.resolve(null);
  }

  nearby(input: NearbyPlacesInput): Promise<PlaceCandidate[]> {
    const coordinates = parseCoordinates(input.coordinates);
    const radiusMeters = input.radiusMeters ?? 1_000;
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0 || radiusMeters > 50_000)
      throw new Error("Invalid nearby radius");
    const normalized = { ...input, coordinates, radiusMeters, limit: clampLimit(input.limit) };
    if (this.provider.nearby) return this.track(this.provider.nearby(normalized));
    return this.track(this.provider.search({ query: input.query?.trim() ?? "", near: { ...coordinates, radiusMeters }, type: input.type, tripId: input.tripId }));
  }

  getById(id: UUID, tripId?: UUID): Promise<PlaceCandidate | null> {
    const remembered = this.recent.get(id);
    if (remembered) return Promise.resolve(remembered);
    return this.provider.getById(id, tripId);
  }

  createManual(input: ManualPlaceInput): PlaceCandidate {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 160)
      throw new Error("Manual place name must contain 1 to 160 characters");
    const coordinates = parseCoordinates(input.coordinates);
    return {
      id: manualId(name, coordinates),
      provider: "manual",
      name,
      category: input.category?.trim() || undefined,
      address: input.address?.trim() || undefined,
      countryCode: input.countryCode?.trim().toUpperCase() || undefined,
      coordinates,
      providerPlaceId: input.providerPlaceId?.trim() || undefined,
      attribution: input.attribution?.trim() || undefined,
      timeZone: input.timeZone?.trim() as PlaceCandidate["timeZone"] || undefined,
    };
  }
}

const clampLimit = (value: number | undefined): number => {
  const limit = value ?? 5;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20)
    throw new Error("Invalid places result limit");
  return limit;
};
