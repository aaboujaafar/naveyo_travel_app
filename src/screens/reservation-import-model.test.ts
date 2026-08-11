import { describe, expect, it } from "vitest";
import type { IANATimeZone, ReservationDraft } from "../modules/_shared/model";
import {
  buildReservationDraftFields,
  canConfirmReservationDraft,
} from "./reservation-import-model";

const draft: ReservationDraft = {
  type: "flight",
  title: "Vol Paris Lisbonne",
  provider: "TAP",
  start: {
    local: "2026-09-03T08:40",
    timeZone: "Europe/Paris" as IANATimeZone,
  },
  confidence: "medium",
  fieldsRequiringConfirmation: ["title"],
};

describe("reservation import confirmation model", () => {
  it("asks for explicit confirmation of every value that will be persisted", () => {
    expect(buildReservationDraftFields(draft).map((field) => field.key)).toEqual([
      "type",
      "title",
      "provider",
      "start",
    ]);
  });

  it("keeps analyzer-required unknown fields visible instead of confirming them silently", () => {
    const fields = buildReservationDraftFields({
      ...draft,
      fieldsRequiringConfirmation: ["title", "terminal"],
    });
    expect(fields.at(-1)).toEqual({
      key: "terminal",
      label: "terminal",
      value: "Champ signalé par l’analyse",
    });
  });

  it("does not enable saving until every displayed field was checked", () => {
    const fields = buildReservationDraftFields(draft);
    expect(canConfirmReservationDraft(draft, fields, new Set(["title"]))).toBe(false);
    expect(
      canConfirmReservationDraft(
        draft,
        fields,
        new Set(fields.map((field) => field.key)),
      ),
    ).toBe(true);
  });
});
