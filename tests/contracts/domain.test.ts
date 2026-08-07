import { describe, expect, it } from "vitest";
import {
  expense,
  place,
  reservationDraft,
  stop,
  trackPoint,
  trip,
  tripId,
  tripPack,
} from "../../src/modules/__fixtures__/domain";
import {
  FakeOfflineTripPack,
  FakePlacesProvider,
  FakeTripTracking,
  FakeTrips,
} from "./fakes";
import {
  assertStableId,
  isCurrency,
  isIanaTimeZone,
  isIsoDateTime,
  parseCoordinates,
  parseExpense,
  parseItineraryItem,
  parseReservation,
  parseReservationDraft,
  parseStop,
  parseTrackPoint,
  parseTrip,
  parseTripPack,
  parseTravelDocument,
  parseMoney,
} from "../../src/modules/_shared/validation";

describe("ARC-001 domain contracts", () => {
  it("keeps local dates and IANA timezone on a stop", () => {
    expect(stop.startDate).toBe("2026-09-04");
    expect(stop.timeZone).toBe("Europe/Lisbon");
    expect(isIanaTimeZone(stop.timeZone)).toBe(true);
    expect(isIanaTimeZone("UTC")).toBe(true);
    expect(isIsoDateTime("2026-09-05T10:00")).toBe(false);
  });

  it("represents money in integer minor units and preserves currencies", () => {
    expect(parseMoney(expense.original)).toEqual({
      minorUnits: 330,
      currency: "EUR",
    });
    expect(() => parseMoney({ minorUnits: 1.5, currency: "EUR" })).toThrow();
    expect(isCurrency("EUR")).toBe(true);
    expect(isCurrency("ZZZ")).toBe(false);
  });

  it("keeps typed place semantics and validates external coordinates", () => {
    expect(place.coordinates.latitude).toBeGreaterThanOrEqual(-90);
    expect(parseCoordinates(place.coordinates)).toEqual(place.coordinates);
    expect(() => parseCoordinates({ latitude: 100, longitude: 0 })).toThrow();
    expect(() =>
      parseCoordinates({ latitude: Number.NaN, longitude: 0 }),
    ).toThrow();
  });

  it("requires stable ids and UTC instants when present", () => {
    expect(assertStableId(tripId)).toBe(tripId);
    expect(isIsoDateTime(trip.createdAt)).toBe(true);
    expect(() => assertStableId("temporary-id")).toThrow();
    expect(isIsoDateTime("2026-09-05T10:00:00+02:00")).toBe(false);
    expect(() =>
      parseTrackPoint({
        ...trackPoint,
        recordedAt: "2026-09-05T10:00:00+02:00",
      }),
    ).toThrow();
  });

  it("parses the persisted aggregates at runtime", () => {
    expect(parseTrip(trip)).toEqual(trip);
    expect(parseStop(stop)).toEqual(stop);
    expect(parseItineraryItem({ ...tripPack.itinerary[0] })).toEqual(
      tripPack.itinerary[0],
    );
    expect(parseReservation(reservationDraftToReservation())).toEqual(
      reservationDraftToReservation(),
    );
    expect(parseReservationDraft(reservationDraft)).toEqual(reservationDraft);
    expect(parseTravelDocument(tripPack.documents[0])).toEqual(
      tripPack.documents[0],
    );
    expect(parseExpense(expense)).toEqual(expense);
    expect(() =>
      parseExpense({ ...expense, exchangeRateSource: "provider" }),
    ).toThrow(/exchangeRateDate/);
    expect(
      parseExpense({
        ...expense,
        original: { minorUnits: 100, currency: "USD" },
        reference: { minorUnits: 92, currency: "EUR" },
        exchangeRateSource: "provider",
        exchangeRateDate: "2026-09-05",
      }),
    ).toMatchObject({
      exchangeRateSource: "provider",
      exchangeRateDate: "2026-09-05",
    });
    expect(parseTripPack(tripPack)).toEqual(tripPack);
    expect(() => parseTripPack({ ...tripPack, stops: [stop, stop] })).toThrow(
      /duplicates/,
    );
  });

  it("uses module interfaces through fakes", async () => {
    const trips = new FakeTrips(trip, [stop]);
    const places = new FakePlacesProvider([place]);
    const pack = new FakeOfflineTripPack();
    expect(await trips.get(tripId)).toEqual(trip);
    expect(await places.getById(place.id)).toEqual(place);
    expect(await places.search({ query: "belém", countryCode: "PT" })).toEqual([
      place,
    ]);
    expect(await pack.get(tripId)).toBeNull();
    await pack.replace(tripPack);
    expect((await pack.manifest(tripId))?.schemaVersion).toBe(1);
    const createdStop = await trips.createStop({
      tripId,
      name: "Porto",
      countryCode: "PT",
      timeZone: stop.timeZone,
      startDate: "2026-09-08",
      endDate: "2026-09-10",
    });
    expect(assertStableId(createdStop.id)).toBe(createdStop.id);
    expect(await trips.listStops(tripId)).toHaveLength(2);
  });

  it("keeps draft reservations and trip tracking idempotency data explicit", () => {
    expect(reservationDraft.sourceDocumentId).toBeDefined();
    expect(reservationDraft.confidence).toBe("high");
    expect(reservationDraft.fieldsRequiringConfirmation).toContain("provider");
    expect(trackPoint.idempotencyKey).toMatch(/^track-/);
    expect(isIsoDateTime(trackPoint.recordedAt)).toBe(true);
  });

  it("deduplicates retrying GPS points by idempotency key", async () => {
    const tracking = new FakeTripTracking();
    await tracking.append(trackPoint);
    await tracking.append({ ...trackPoint, latitude: 38.7 });
    expect(await tracking.list(tripId)).toEqual([trackPoint]);
  });
});

const reservationDraftToReservation = () => ({
  id: "77777777-7777-4777-8777-777777777777" as typeof tripId,
  tripId,
  type: "flight" as const,
  title: "Paris to Lisbon",
  origin: { kind: "origin" as const, label: "Paris CDG" },
  destination: { kind: "destination" as const, label: "Lisbon LIS" },
  confirmedAt: trip.createdAt,
});
