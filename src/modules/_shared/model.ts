export type UUID = string & { readonly __brand: "UUID" };
export type ISODateTime = string & { readonly __brand: "ISODateTime" };
export type IANATimeZone = string & { readonly __brand: "IANATimeZone" };
export type ISO4217 = string & { readonly __brand: "ISO4217" };

export interface LocalDateTime {
  local: string;
  timeZone: IANATimeZone;
  instantUtc?: ISODateTime;
}

export interface Money {
  minorUnits: number;
  currency: ISO4217;
}

export interface PlaceReference {
  kind: "venue" | "meetingPoint" | "origin" | "destination";
  placeId?: UUID;
  label: string;
  address?: string;
  countryCode?: string;
  coordinates?: Coordinates;
  attribution?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TripMember {
  accountId: UUID;
  role: "owner" | "editor";
}

export interface TripInvitation {
  id: UUID;
  tripId: UUID;
  invitedEmail?: string;
  role: "editor";
  token: UUID;
  status: "pending" | "accepted" | "expired";
  expiresAt: ISODateTime;
}

export interface Trip {
  id: UUID;
  name: string;
  imageUrl?: string;
  referenceCurrency: ISO4217;
  startsOn?: string;
  endsOn?: string;
  travelers: UUID[];
  members: TripMember[];
  stopIds: UUID[];
  createdAt: ISODateTime;
}

export interface Stop {
  id: UUID;
  tripId: UUID;
  name: string;
  imageUrl?: string;
  countryCode: string;
  timeZone: IANATimeZone;
  startDate: string;
  endDate: string;
  /** Optional geocoded location; legacy stops may omit these fields. */
  coordinates?: Coordinates;
  address?: string;
  providerPlaceId?: string;
  attribution?: string;
}

export interface PlaceImageCredit {
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
}

export interface PlaceCandidate {
  id: UUID;
  provider: "geoapify" | "google" | "manual";
  name: string;
  /** Optional provider photo URL; consumers must keep a local fallback. */
  imageUrl?: string;
  /** Unsplash attribution metadata when the illustrative photo comes from Unsplash. */
  imageCredit?: PlaceImageCredit;
  category?: string;
  address?: string;
  countryCode?: string;
  coordinates: Coordinates;
  providerPlaceId?: string;
  attribution?: string;
  timeZone?: IANATimeZone;
  distanceMeters?: number;
}

export interface ItineraryItem {
  id: UUID;
  tripId: UUID;
  stopId: UUID;
  title: string;
  date: string;
  time?: LocalDateTime;
  place?: PlaceReference;
  notes?: string;
}

export interface Budget {
  tripId: UUID;
  planned: Money;
}

export interface Expense {
  id: UUID;
  tripId: UUID;
  label: string;
  original: Money;
  reference: Money;
  exchangeRateSource: "manual" | "provider" | "not-applicable";
  exchangeRateDate?: string;
  occurredOn: string;
  paidBy: UUID;
}

export type ReservationType =
  | "accommodation"
  | "flight"
  | "train"
  | "ferry"
  | "activity"
  | "other";

export interface Reservation {
  id: UUID;
  tripId: UUID;
  type: ReservationType;
  title: string;
  provider?: string;
  reference?: string;
  start?: LocalDateTime;
  end?: LocalDateTime;
  venue?: PlaceReference;
  origin?: PlaceReference;
  destination?: PlaceReference;
  confirmedAt: ISODateTime;
}

export type DocumentKind = "pdf" | "image" | "text" | "url" | "ics";

export interface TravelDocument {
  id: UUID;
  tripId: UUID;
  kind: DocumentKind;
  fileName?: string;
  mimeType?: string;
  byteSize?: number;
  storagePath?: string;
  persistentUri: string;
  checksum: string;
  stopId?: UUID;
  reservationId?: UUID;
  createdAt: ISODateTime;
}

export interface ReservationDraft {
  sourceDocumentId?: UUID;
  type?: ReservationType;
  title?: string;
  provider?: string;
  reference?: string;
  start?: LocalDateTime;
  end?: LocalDateTime;
  venue?: PlaceReference;
  origin?: PlaceReference;
  destination?: PlaceReference;
  confidence: "low" | "medium" | "high";
  fieldsRequiringConfirmation: string[];
}

export interface SuggestionDraft {
  id: UUID;
  candidateId: UUID;
  reason: string;
  title: string;
  createdAt: ISODateTime;
}

export interface TripPackManifest {
  tripId: UUID;
  schemaVersion: number;
  generatedAt: ISODateTime;
  serverRevision: string;
  files: { path: string; checksum: string; state: "pending" | "ready" }[];
}

export interface TripPack {
  manifest: TripPackManifest;
  trip: Trip;
  stops: Stop[];
  places: PlaceCandidate[];
  itinerary: ItineraryItem[];
  reservations: Reservation[];
  documents: TravelDocument[];
  expenses: Expense[];
}

export interface TrackPoint {
  idempotencyKey: string;
  latitude: number;
  longitude: number;
  recordedAt: ISODateTime;
  accuracyMeters: number;
}

export interface TrackingStatus {
  state: "stopped" | "starting" | "recording" | "error";
  tripId?: UUID;
  message?: string;
}
