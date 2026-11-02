import { describe, expect, it } from "vitest";
import type { Coordinates, ItineraryItem, Stop, Trip, UUID } from "../modules/_shared/model";
import {
  buildDashboardMapPresentation,
  buildPreparationSteps,
  dashboardRouteCoordinates,
  countTripDays,
  formatTripDateRange,
  getTravelerCount,
  sortStopsByLocalDate,
} from "./trip-dashboard-model";

describe("trip dashboard model", () => {
  it("lists what is left to prepare", () => {
    const empty = buildPreparationSteps({ stops: 0, itineraryItems: 0, reservations: 0 });
    expect(empty.map((step) => step.done)).toEqual([false, false, false]);
    expect(empty[0]?.label).toBe("Ajouter une première Étape");
    const started = buildPreparationSteps({ stops: 1, itineraryItems: 0, reservations: 2 });
    expect(started.filter((step) => step.done).map((step) => step.key)).toEqual(["stop", "reservation"]);
    expect(buildPreparationSteps({ stops: 1, itineraryItems: 1, reservations: 1, offlineReady: false }).at(-1)).toEqual({
      key: "offline", label: "Télécharger pour le hors-ligne", done: false,
    });
  });

  it("formats date-only values without using the device timezone", () => {
    expect(formatTripDateRange("2026-08-10", "2026-08-17")).toBe(
      "10–17 août",
    );
    expect(countTripDays("2026-08-10", "2026-08-17")).toBe(8);
  });

  it("rejects incomplete and reversed date ranges", () => {
    expect(formatTripDateRange("2026-08-10", undefined)).toBe(
      "Dates à préciser",
    );
    expect(countTripDays("2026-08-17", "2026-08-10")).toBeNull();
  });

  it("uses actual travelers and sorts Étapes by their local dates", () => {
    const trip = {
      travelers: ["traveler-a", "traveler-b"],
      members: [{ accountId: "account-a", role: "owner" }],
    } as Trip;
    const later = { id: "b", name: "Porto", startDate: "2026-08-14" } as Stop;
    const earlier = {
      id: "a",
      name: "Lisbonne",
      startDate: "2026-08-10",
    } as Stop;

    expect(getTravelerCount(trip)).toBe(2);
    expect(sortStopsByLocalDate([later, earlier]).map((stop) => stop.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("builds identifiable markers across Étapes from confirmed coordinates only", () => {
    const stops = [
      dashboardStop("stop-a", "Lisbonne"),
      dashboardStop("stop-b", "Porto"),
    ];
    const items = [
      dashboardItem("item-a", "stop-a", { latitude: 38.7223, longitude: -9.1393 }),
      dashboardItem("item-b", "stop-b", { latitude: 41.1579, longitude: -8.6291 }),
      dashboardItem("item-without-place", "stop-a", undefined, false),
    ];

    expect(buildDashboardMapPresentation(stops, items)).toEqual({
      model: {
        points: [
          {
            id: "item-a",
            label: "Étape 1 · Lieu item-a",
            coordinates: { latitude: 38.7223, longitude: -9.1393 },
          },
          {
            id: "item-b",
            label: "Étape 2 · Lieu item-b",
            coordinates: { latitude: 41.1579, longitude: -8.6291 },
          },
        ],
      },
      confirmedPlaceCount: 2,
      locatedPlaceCount: 2,
      unlocatedPlaceCount: 0,
    });
  });

  it("keeps partial and empty Voyages marker-free without inventing coordinates", () => {
    const stop = dashboardStop("stop-a", "Lisbonne");
    const partial = buildDashboardMapPresentation(
      [stop],
      [
        dashboardItem("missing", stop.id, undefined),
        dashboardItem("invalid", stop.id, { latitude: 91, longitude: 2 }),
        dashboardItem("not-a-place", stop.id, undefined, false),
      ],
    );

    expect(partial.model.points).toEqual([]);
    expect(partial.confirmedPlaceCount).toBe(2);
    expect(partial.locatedPlaceCount).toBe(0);
    expect(partial.unlocatedPlaceCount).toBe(2);
    expect(buildDashboardMapPresentation([], [])).toEqual({
      model: { points: [] },
      confirmedPlaceCount: 0,
      locatedPlaceCount: 0,
      unlocatedPlaceCount: 0,
    });
  });

  it("adds a planned route to the dashboard map model when provided", () => {
    const stops = [{
      ...dashboardStop("stop-a", "Lisbonne"),
      coordinates: { latitude: 38.7223, longitude: -9.1393 },
    }];
    const items = [dashboardItem("item-a", "stop-a", { latitude: 38.8, longitude: -9.1 })];
    const route = [
      { latitude: 38.7223, longitude: -9.1393 },
      { latitude: 38.8, longitude: -9.1 },
    ];

    expect(dashboardRouteCoordinates(stops, items)).toEqual(route);
    expect(buildDashboardMapPresentation(stops, items, route).model.polyline).toEqual(route);
  });
});

function dashboardStop(id: string, name: string): Stop {
  return {
    id: id as UUID,
    tripId: "trip" as UUID,
    name,
    countryCode: "PT",
    timeZone: "Europe/Lisbon" as Stop["timeZone"],
    startDate: "2026-09-01",
    endDate: "2026-09-02",
  };
}

function dashboardItem(
  id: string,
  stopId: string,
  coordinates?: Coordinates,
  includePlace = true,
): ItineraryItem {
  return {
    id: id as UUID,
    tripId: "trip" as UUID,
    stopId: stopId as UUID,
    title: `Lieu ${id}`,
    date: "2026-09-01",
    ...(includePlace
      ? {
          place: coordinates
            ? { kind: "venue" as const, label: `Lieu ${id}`, coordinates }
            : { kind: "venue" as const, label: `Lieu ${id}` },
        }
      : {}),
  };
}
