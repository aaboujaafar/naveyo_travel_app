import { describe, expect, it } from "vitest";
import { adapterNeeded, practicalNotes } from ".";
import { COUNTRY_INFO } from "./data";

describe("country practical information", () => {
  it("tells a French traveller what changes in the United Kingdom", () => {
    const notes = practicalNotes(COUNTRY_INFO.GB, COUNTRY_INFO.FR);
    expect(notes.filter((note) => note.notable).map((note) => note.kind)).toEqual(["plug", "driving", "currency"]);
    expect(notes.find((note) => note.kind === "plug")?.text).toBe("Prises type G : adaptateur à prévoir");
    expect(adapterNeeded(COUNTRY_INFO.GB, COUNTRY_INFO.FR)).toEqual(["G"]);
  });

  it("needs no adapter where a Europlug fits, and warns about low voltage", () => {
    expect(adapterNeeded(COUNTRY_INFO.PT, COUNTRY_INFO.FR)).toBeNull();
    expect(adapterNeeded(COUNTRY_INFO.CH, COUNTRY_INFO.FR)).toBeNull();
    const japan = practicalNotes(COUNTRY_INFO.JP, COUNTRY_INFO.FR);
    expect(japan.find((note) => note.kind === "voltage")).toMatchObject({ notable: true });
    expect(japan.find((note) => note.kind === "driving")?.text).toBe("Conduite à gauche");
  });

  it("covers the countries of the entry matrix", () => {
    expect(Object.keys(COUNTRY_INFO).length).toBe(199);
    expect(COUNTRY_INFO.TR?.callingCode).toBe("+90");
  });
});
