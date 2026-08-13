import { describe, expect, it, vi } from "vitest";
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
import { buildStopMapModel } from "./StopDetailScreen";

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Platform: { select: (values: { default?: string }) => values.default },
  View: "View",
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  Line: "Line",
  Path: "Path",
  Polygon: "Polygon",
  Polyline: "Polyline",
  Rect: "Rect",
}));
vi.mock("../ui", () => ({
  AppText: "AppText",
  Badge: "Badge",
  Button: "Button",
  Icon: "Icon",
  IconButton: "IconButton",
  InlineMessage: "InlineMessage",
  SectionTitle: "SectionTitle",
  Skeleton: "Skeleton",
}));
vi.mock("../adapters/map/expo-maps-view", () => ({
  ExpoMapsView: () => null,
}));

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

  it("builds the stop map only from confirmed itinerary coordinates", () => {
    const items: ItineraryItem[] = [
      {
        ...item("museum", stop.id, "2026-08-10", "2026-08-10T09:00"),
        place: {
          kind: "venue",
          label: "Musée",
          coordinates: { latitude: 38.7223, longitude: -9.1393 },
        },
      },
      {
        ...item("walk", stop.id, "2026-08-10", "2026-08-10T11:00"),
        place: { kind: "meetingPoint", label: "Point sans coordonnées" },
      },
      {
        ...item("market", stop.id, "2026-08-10", "2026-08-10T13:00"),
        place: {
          kind: "venue",
          label: "Marché",
          coordinates: { latitude: 38.7139, longitude: -9.1394 },
        },
      },
    ];

    expect(buildStopMapModel(items)).toEqual({
      points: [
        {
          id: "museum",
          label: "Musée",
          coordinates: { latitude: 38.7223, longitude: -9.1393 },
        },
        {
          id: "market",
          label: "Marché",
          coordinates: { latitude: 38.7139, longitude: -9.1394 },
        },
      ],
    });
  });

  it("keeps an empty map model when an Étape has no geolocated place", () => {
    expect(buildStopMapModel([item("agenda", stop.id, "2026-08-10", "2026-08-10T09:00")])).toEqual({
      points: [],
    });
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
