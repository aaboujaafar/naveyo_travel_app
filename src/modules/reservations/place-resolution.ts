import type { PlaceCandidate, PlaceReference, ReservationDraft } from "../_shared/model";

export type ReservationPlaceKey = "venue" | "origin" | "destination";

export type ReservationPlaceCandidates = Partial<Record<ReservationPlaceKey, PlaceCandidate[]>>;

/** Return only references that were actually detected by the importer. */
export function detectedReservationPlaces(draft: ReservationDraft): ReservationPlaceKey[] {
  return (["venue", "origin", "destination"] as const).filter((key) => Boolean(draft[key]));
}

/** Convert a provider result into the small, persisted reference shape. */
export function referenceFromCandidate(
  kind: ReservationPlaceKey,
  candidate: PlaceCandidate,
): PlaceReference {
  return {
    kind,
    placeId: candidate.id,
    label: candidate.name,
    address: candidate.address,
    countryCode: candidate.countryCode,
    coordinates: candidate.coordinates,
    attribution: candidate.attribution,
  };
}

/** Apply one explicit human choice; never called during analysis itself. */
export function applyReservationPlaceCandidate(
  draft: ReservationDraft,
  key: ReservationPlaceKey,
  candidate: PlaceCandidate,
): ReservationDraft {
  return { ...draft, [key]: referenceFromCandidate(key, candidate) };
}

export function clearReservationPlaceLocation(
  draft: ReservationDraft,
  key: ReservationPlaceKey,
): ReservationDraft {
  const reference = draft[key];
  if (!reference) return draft;
  const next = { ...reference } as PlaceReference & {
    providerId?: string;
    providerPlaceId?: string;
  };
  delete next.placeId;
  delete next.providerId;
  delete next.providerPlaceId;
  delete next.coordinates;
  delete next.attribution;
  return { ...draft, [key]: next };
}
