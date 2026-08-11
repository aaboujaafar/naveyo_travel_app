import { describe, expect, it } from "vitest";
import type { Stop, UUID } from "../modules/_shared/model";
import {
  buildPlaceScheduleDates,
  formatPlaceCategory,
  formatPlaceSource,
} from "./place-detail-model";

const stop = (input: Partial<Stop> & Pick<Stop, "id" | "name" | "startDate" | "endDate">): Stop => ({
  tripId: "00000000-0000-4000-8000-000000000001" as UUID,
  countryCode: "PT",
  timeZone: "Europe/Lisbon" as Stop["timeZone"],
  ...input,
});

describe("place detail model", () => {
  it("builds selectable local dates without using the device timezone", () => {
    expect(
      buildPlaceScheduleDates([
        stop({
          id: "00000000-0000-4000-8000-000000000101" as UUID,
          name: "Lisbonne",
          startDate: "2026-08-10",
          endDate: "2026-08-12",
        }),
      ]),
    ).toEqual([
      expect.objectContaining({ date: "2026-08-10", label: "Lisbonne · 10 août" }),
      expect.objectContaining({ date: "2026-08-11", label: "Lisbonne · 11 août" }),
      expect.objectContaining({ date: "2026-08-12", label: "Lisbonne · 12 août" }),
    ]);
  });

  it("sorts Étapes and rejects reversed ranges", () => {
    const later = stop({ id: "00000000-0000-4000-8000-000000000102" as UUID, name: "Porto", startDate: "2026-08-14", endDate: "2026-08-14" });
    const reversed = stop({ id: "00000000-0000-4000-8000-000000000103" as UUID, name: "Sintra", startDate: "2026-08-16", endDate: "2026-08-15" });
    const earlier = stop({ id: "00000000-0000-4000-8000-000000000101" as UUID, name: "Lisbonne", startDate: "2026-08-10", endDate: "2026-08-10" });

    expect(buildPlaceScheduleDates([later, reversed, earlier]).map((item) => item.label)).toEqual([
      "Lisbonne · 10 août",
      "Porto · 14 août",
    ]);
  });

  it("formats only values supplied by the place provider", () => {
    expect(formatPlaceCategory("local_cafe")).toBe("Local Cafe");
    expect(formatPlaceCategory(undefined)).toBeNull();
    expect(formatPlaceSource("geoapify")).toBe("Lieu vérifié");
    expect(formatPlaceSource("manual")).toBe("Lieu saisi manuellement");
  });
});
