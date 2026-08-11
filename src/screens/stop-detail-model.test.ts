import { describe, expect, it } from "vitest";
import type {
  IANATimeZone,
  ISODateTime,
  ItineraryItem,
  Reservation,
  Stop,
  TravelDocument,
  UUID,
} from "../modules/_shared/model";
import {
  filterItineraryForStop,
  filterReservationsForStop,
  formatItineraryLocalTime,
  formatStopDateRange,
  stopDayCount,
} from "./stop-detail-model";

const tripId = "trip-1" as UUID;
const stop: Stop = {
  id: "stop-1" as UUID,
  tripId,
  name: "Lisbonne",
  countryCode: "PT",
  timeZone: "Europe/Lisbon" as IANATimeZone,
  startDate: "2026-08-10",
  endDate: "2026-08-12",
};

describe("stop detail model", () => {
  it("filters and orders itinerary items without using the phone timezone", () => {
    const items: ItineraryItem[] = [
      item("b", "stop-1", "2026-08-11", "2026-08-11T15:00"),
      item("other", "stop-2", "2026-08-10", "2026-08-10T08:00"),
      item("a", "stop-1", "2026-08-10", "2026-08-10T09:00"),
    ];

    expect(filterItineraryForStop(items, stop).map(({ id }) => id)).toEqual(["a", "b"]);
    expect(formatItineraryLocalTime(items[2]!)).toBe("09:00");
  });

  it("links reservations only through documents assigned to the stop", () => {
    const linked = reservation("reservation-linked", "2026-08-10T09:00");
    const unlinked = reservation("reservation-unlinked", "2026-08-10T08:00");
    const documents: TravelDocument[] = [{
      id: "document-1" as UUID,
      tripId,
      kind: "pdf",
      persistentUri: "file:///document.pdf",
      checksum: "checksum",
      stopId: stop.id,
      reservationId: linked.id,
      createdAt: "2026-08-01T10:00:00Z" as ISODateTime,
    }];

    expect(filterReservationsForStop([unlinked, linked], documents)).toEqual([linked]);
  });

  it("formats the explicit local date range and counts inclusive days", () => {
    expect(formatStopDateRange(stop)).toContain("10 août 2026");
    expect(formatStopDateRange(stop)).toContain("12 août 2026");
    expect(stopDayCount(stop)).toBe(3);
  });
});

function item(id: string, stopId: string, date: string, local: string): ItineraryItem {
  return {
    id: id as UUID,
    tripId,
    stopId: stopId as UUID,
    title: id,
    date,
    time: { local, timeZone: "Europe/Lisbon" as IANATimeZone },
  };
}

function reservation(id: string, local: string): Reservation {
  return {
    id: id as UUID,
    tripId,
    type: "activity",
    title: id,
    start: { local, timeZone: "Europe/Lisbon" as IANATimeZone },
    confirmedAt: "2026-08-01T10:00:00Z" as ISODateTime,
  };
}
