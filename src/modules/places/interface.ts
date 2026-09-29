import type { PlaceCandidate, UUID } from "../_shared/model";
export type PlaceType =
  | "venue"
  | "airport"
  | "port"
  | "station"
  | "accommodation"
  | "restaurant"
  | "attraction"
  | "activity";

export interface PlaceSearchInput {
  query: string;
  countryCode?: string;
  stopId?: UUID;
  tripId?: UUID;
  stopName?: string;
  near?: { latitude: number; longitude: number; radiusMeters?: number };
  type?: PlaceType;
}

export interface PlaceAutocompleteInput {
  query: string;
  tripId?: UUID;
  countryCode?: string;
  /** Restricts suggestions to city/address-like results without exposing provider parameters. */
  type?: "city" | "address";
  limit?: number;
}

export interface ReverseGeocodeInput {
  coordinates: { latitude: number; longitude: number };
  tripId?: UUID;
}

export interface NearbyPlacesInput {
  coordinates: { latitude: number; longitude: number };
  tripId?: UUID;
  radiusMeters?: number;
  type?: PlaceType;
  limit?: number;
  query?: string;
}

export interface PlacesModule {
  search(input: PlaceSearchInput): Promise<PlaceCandidate[]>;
  autocomplete(input: PlaceAutocompleteInput): Promise<PlaceCandidate[]>;
  reverse(input: ReverseGeocodeInput): Promise<PlaceCandidate | null>;
  nearby(input: NearbyPlacesInput): Promise<PlaceCandidate[]>;
  getById(id: UUID, tripId?: UUID): Promise<PlaceCandidate | null>;
  createManual(input: ManualPlaceInput): PlaceCandidate;
  /** Keeps candidates shown elsewhere (e.g. AI day plans) resolvable by id. */
  remember?(candidates: readonly PlaceCandidate[]): void;
}

export interface PlacesProvider {
  search(input: PlaceSearchInput): Promise<PlaceCandidate[]>;
  autocomplete?(input: PlaceAutocompleteInput): Promise<PlaceCandidate[]>;
  reverse?(input: ReverseGeocodeInput): Promise<PlaceCandidate | null>;
  nearby?(input: NearbyPlacesInput): Promise<PlaceCandidate[]>;
  getById(id: UUID, tripId?: UUID): Promise<PlaceCandidate | null>;
}

export interface ManualPlaceInput {
  name: string;
  coordinates: { latitude: number; longitude: number };
  address?: string;
  countryCode?: string;
  category?: string;
  providerPlaceId?: string;
  attribution?: string;
  timeZone?: string;
}
