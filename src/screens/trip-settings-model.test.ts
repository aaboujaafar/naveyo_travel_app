import { describe, expect, it } from "vitest";
import {
  normalizeTripSettings,
  validateTripSettings,
} from "./trip-settings-model";

describe("trip settings presentation model", () => {
  it("validates local date order and ISO currency", () => {
    expect(
      validateTripSettings({
        name: "Portugal",
        startsOn: "2026-09-10",
        endsOn: "2026-09-01",
        referenceCurrency: "euro",
      }),
    ).toEqual({
      endsOn: "La fin doit être postérieure au début.",
      referenceCurrency: "Utilisez un code ISO 4217 sur trois lettres.",
    });
  });

  it("normalizes only explicitly entered values", () => {
    expect(
      normalizeTripSettings({
        name: "  Portugal  ",
        startsOn: "",
        endsOn: "",
        referenceCurrency: "eur",
      }),
    ).toEqual({ name: "Portugal", referenceCurrency: "EUR" });
  });
});
