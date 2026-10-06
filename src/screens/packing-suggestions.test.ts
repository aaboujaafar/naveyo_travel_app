import { describe, expect, it } from "vitest";
import { suggestPackingItems } from "./packing-suggestions";

const labels = (input: Parameters<typeof suggestPackingItems>[0]) => suggestPackingItems(input).map((item) => item.label);

describe("packing suggestions", () => {
  it("scales clothes with the length of the Voyage, up to a week", () => {
    const short = suggestPackingItems({ startsOn: "2026-11-16", endsOn: "2026-11-20", countryCodes: ["PT"], existingLabels: [] });
    expect(short.find((item) => item.label === "T-shirts")?.quantity).toBe(5);
    const long = suggestPackingItems({ startsOn: "2026-07-01", endsOn: "2026-07-21", countryCodes: ["PT"], existingLabels: [] });
    expect(long.find((item) => item.label === "T-shirts")?.quantity).toBe(7);
  });

  it("adapts to the season and to the countries visited", () => {
    const winterLisbon = labels({ startsOn: "2026-11-16", endsOn: "2026-11-20", countryCodes: ["PT"], existingLabels: [] });
    expect(winterLisbon).toContain("Manteau chaud");
    expect(winterLisbon).toContain("Carte européenne d’assurance maladie");
    expect(winterLisbon).not.toContain("Adaptateur de prise");

    const summerLondon = labels({ startsOn: "2026-07-01", endsOn: "2026-07-05", countryCodes: ["GB"], existingLabels: [] });
    expect(summerLondon).toEqual(expect.arrayContaining(["Maillot de bain", "Adaptateur de prise type G", "Passeport (validité à vérifier)"]));
  });

  it("skips what is already on the list, ignoring case and accents", () => {
    const remaining = labels({ countryCodes: [], existingLabels: ["pyjama", "CARTE D'IDENTITÉ OU PASSEPORT"] });
    expect(remaining).not.toContain("Pyjama");
    expect(remaining).not.toContain("Carte d’identité ou passeport");
  });
});
