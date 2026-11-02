import { describe, expect, it } from "vitest";
import { countryFlag, countryName, searchCountries } from ".";

describe("countries", () => {
  it("names countries in French and finds them without accents", () => {
    expect(countryName("us")).toBe("États-Unis");
    expect(countryFlag("pt")).toBe("🇵🇹");
    expect(searchCountries("etats").map((country) => country.code)).toContain("US");
    expect(searchCountries("ma").some((country) => country.code === "MA")).toBe(true);
    expect(searchCountries("").length).toBe(199);
    expect(searchCountries("f")[0]?.code).toBe("FJ");
    expect(searchCountries("fra")[0]?.code).toBe("FR");
  });
});
