import { describe, expect, it } from "vitest";
import type { PlaceCandidate, ReservationDraft } from "../_shared/model";
import {
  applyReservationPlaceCandidate,
  clearReservationPlaceLocation,
  detectedReservationPlaces,
} from "./place-resolution";

const candidate: PlaceCandidate = {
  id: "00000000-0000-4000-8000-000000000010" as PlaceCandidate["id"],
  provider: "geoapify",
  name: "Athens Airport",
  address: "Attiki, Greece",
  countryCode: "GR",
  coordinates: { latitude: 37.9364, longitude: 23.9475 },
  attribution: "Powered by Geoapify",
};

const draft: ReservationDraft = {
  type: "flight",
  title: "Flight",
  origin: { kind: "origin", label: "Paris CDG" },
  destination: { kind: "destination", label: "Athens" },
  confidence: "medium",
  fieldsRequiringConfirmation: ["origin", "destination"],
};

describe("reservation place resolution", () => {
  it("lists detected venue/origin/destination without inventing missing fields", () => {
    expect(detectedReservationPlaces(draft)).toEqual(["origin", "destination"]);
  });

  it("applies a provider candidate only after an explicit choice", () => {
    const next = applyReservationPlaceCandidate(draft, "destination", candidate);
    expect(next.destination).toMatchObject({
      kind: "destination",
      placeId: candidate.id,
      coordinates: candidate.coordinates,
    });
    expect(next.origin).toEqual(draft.origin);
  });

  it("supports leaving a detected reference unresolved", () => {
    const resolved = applyReservationPlaceCandidate(draft, "origin", candidate);
    const withLegacyProviderFields = {
      ...resolved,
      origin: {
        ...resolved.origin,
        providerId: "legacy-provider-id",
        providerPlaceId: "legacy-place-id",
      },
    } as ReservationDraft;
    const unresolved = clearReservationPlaceLocation(withLegacyProviderFields, "origin");
    expect(unresolved.origin).toEqual({ kind: "origin", label: candidate.name, address: candidate.address, countryCode: candidate.countryCode });
  });
});
