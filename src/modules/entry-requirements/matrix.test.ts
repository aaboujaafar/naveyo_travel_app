import { describe, expect, it } from "vitest";
import { entryStatus, parseMatrixCsv } from "./matrix";
import { BUNDLED_MATRIX } from "./matrix-data";

describe("entry requirements matrix", () => {
  it("reads the dataset's CSV values", () => {
    const passports = Array.from({ length: 150 }, (_, index) => `${String.fromCharCode(65 + Math.floor(index / 26))}${String.fromCharCode(65 + (index % 26))}`);
    const csv = ["Passport,AA,AB,AC,AD,AE,AF,AG", ...passports.map((code) => `${code},-1,visa free,90,eta,e-visa,visa on arrival,no admission`)].join("\n");
    const matrix = parseMatrixCsv(csv, "2026-02-18");
    expect([
      entryStatus(matrix, "AB", "AA"),
      entryStatus(matrix, "AB", "AB"),
      entryStatus(matrix, "AB", "AC"),
      entryStatus(matrix, "AB", "AD"),
      entryStatus(matrix, "AB", "AE"),
      entryStatus(matrix, "AB", "AF"),
      entryStatus(matrix, "AB", "AG"),
      entryStatus(matrix, "AB", "ZZ"),
    ]).toEqual([
      { kind: "own" },
      { kind: "own" },
      { kind: "visaFree", days: 90 },
      { kind: "eta" },
      { kind: "eVisa" },
      { kind: "visaOnArrival" },
      { kind: "noAdmission" },
      { kind: "unknown" },
    ]);
    expect(() => parseMatrixCsv("Passport,AA\nFR,eta", "x")).toThrow("incomplete");
  });

  it("ships the data offline (French passport examples)", () => {
    expect(BUNDLED_MATRIX.passports.length).toBe(199);
    expect(entryStatus(BUNDLED_MATRIX, "FR", "US")).toEqual({ kind: "eta" });
    expect(entryStatus(BUNDLED_MATRIX, "FR", "PT")).toEqual({ kind: "visaFree" });
    expect(entryStatus(BUNDLED_MATRIX, "fr", "ma")).toEqual({ kind: "visaFree", days: 90 });
  });
});
