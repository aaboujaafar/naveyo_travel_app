import { describe, expect, it } from "vitest";
import { evaluateFormalities } from "./formalities";
import { BUNDLED_MATRIX } from "./matrix-data";

const stop = (countryCode: string, startDate: string, endDate: string) => ({ countryCode, startDate, endDate });

describe("entry formalities", () => {
  it("asks for the ESTA a week before arriving, and nothing inside the EU", () => {
    const formalities = evaluateFormalities({ nationalities: ["FR"], stops: [stop("PT", "2026-11-16", "2026-11-20"), stop("US", "2026-12-01", "2026-12-10")], matrix: BUNDLED_MATRIX });
    expect(formalities.map((item) => [item.countryCode, item.level, item.title, item.deadline ?? null, new URL(item.link.url).hostname])).toEqual([
      ["PT", "ok", "Sans visa", null, "www.diplomatie.gouv.fr"],
      ["US", "task", "Demander l’ESTA", "2026-11-24", "esta.cbp.dhs.gov"],
    ]);
  });

  it("groups nationalities sharing a situation and splits the others", () => {
    const formalities = evaluateFormalities({ nationalities: ["FR", "BE", "MA"], stops: [stop("GB", "2026-11-16", "2026-11-20")], matrix: BUNDLED_MATRIX });
    const eta = formalities.find((item) => item.key.endsWith(":eta"));
    expect(eta?.nationalities).toEqual(["FR", "BE"]);
    expect(formalities.some((item) => item.nationalities.includes("MA") && item.level !== "ok")).toBe(true);
  });

  it("warns when the stay is longer than allowed, and adds arrival forms", () => {
    const formalities = evaluateFormalities({ nationalities: ["FR"], stops: [stop("TH", "2026-11-01", "2027-02-10")], matrix: BUNDLED_MATRIX });
    expect(formalities.map((item) => [item.level, item.title])).toEqual([
      ["warning", "Séjour plus long que la durée sans visa"],
      ["task", "Remplir Carte d’arrivée TDAC"],
    ]);
  });

  it("skips one's own country and says when nothing is known", () => {
    expect(evaluateFormalities({ nationalities: ["FR"], stops: [stop("FR", "2026-11-01", "2026-11-03")], matrix: BUNDLED_MATRIX })).toEqual([]);
    expect(evaluateFormalities({ nationalities: ["FR"], stops: [stop("XX", "2026-11-01", "2026-11-03")], matrix: BUNDLED_MATRIX })[0]).toMatchObject({ level: "unknown" });
  });
});
