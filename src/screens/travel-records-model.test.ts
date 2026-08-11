import { describe, expect, it } from "vitest";
import type { Reservation } from "../modules/_shared/model";
import { formatDocumentSize, formatReservationDate, formatReservationTime } from "./travel-records-model";

describe("travel records model", () => {
  it("formats document byte sizes", () => {
    expect(formatDocumentSize(512)).toBe("512 o");
    expect(formatDocumentSize(2048)).toBe("2 Ko");
  });

  it("keeps reservation local date and time", () => {
    const reservation = {
      start: { local: "2026-08-10T07:45", timeZone: "Europe/Paris" },
    } as Reservation;
    expect(formatReservationDate(reservation)).toBe("10 août");
    expect(formatReservationTime(reservation)).toBe("07:45");
  });
});
