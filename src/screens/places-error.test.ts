import { describe, expect, it } from "vitest";
import { describePlacesError } from "./places-error";

describe("describePlacesError", () => {
  it("never surfaces raw gateway messages", () => {
    expect(describePlacesError(new Error("Places search failed (404): place_not_found"))).toBe(
      "Ce lieu n’est plus disponible. Relancez la recherche.",
    );
    expect(describePlacesError(new Error("Places search quota reached"))).toContain("Trop de recherches");
    expect(describePlacesError(new Error("boom"), "Repli")).toBe("Repli");
  });
});
