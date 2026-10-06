import { describe, expect, it } from "vitest";
import { reservation } from "../modules/__fixtures__/domain";
import { buildEmergencySheet } from "./emergency-model";

describe("emergency sheet", () => {
  it("gives each country its numbers, stays and taxi phrase", () => {
    const sheet = buildEmergencySheet(
      [
        { name: "Porto", countryCode: "PT", startDate: "2026-11-19" },
        { name: "Lisbonne", countryCode: "pt", startDate: "2026-11-16" },
        { name: "Séville", countryCode: "ES", startDate: "2026-11-21" },
        { name: "Reykjavik", countryCode: "XX", startDate: "2026-11-25" },
      ],
      [
        { ...reservation, type: "flight", title: "Vol" },
        { ...reservation, type: "accommodation", title: "Hotel Avenida", venue: { kind: "venue", label: "Hotel Avenida", address: "Av. da Liberdade 1", countryCode: "PT" }, start: { local: "2026-11-16T15:00", timeZone: "Europe/Lisbon" as never } },
      ],
    );
    expect(sheet.map((country) => [country.countryCode, country.numbers?.general ?? null, country.stops])).toEqual([
      ["PT", "112", ["Lisbonne", "Porto"]],
      ["ES", "112", ["Séville"]],
      ["XX", null, ["Reykjavik"]],
    ]);
    expect(sheet[0]!.stays).toEqual([{ name: "Hotel Avenida", address: "Av. da Liberdade 1", from: "2026-11-16" }]);
    expect(sheet[0]!.taxiPhrase).toBe("Por favor, leve-me a esta morada.");
    expect(sheet[2]!.taxiPhrase).toBe("Please take me to this address.");
    const withFriends = buildEmergencySheet([{ id: "s1", name: "Porto", countryCode: "PT", startDate: "2026-11-19" }], [], [{ stopId: "s1", label: "Chez des proches à Porto", address: "Rua das Flores 10" }]);
    expect(withFriends[0]!.stays).toEqual([{ name: "Chez des proches à Porto", address: "Rua das Flores 10", from: "2026-11-19" }]);
  });
});
