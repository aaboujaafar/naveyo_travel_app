import { describe, expect, it } from "vitest";
import { InMemoryTripPackFileStore } from "../../adapters/sqlite/in-memory-file-store";
import { InMemoryTripPackStore } from "../../adapters/sqlite/in-memory-trip-pack-store";
import type { UUID } from "../_shared/model";
import {
  document,
  expense,
  itineraryItem,
  place,
  reservation,
  stop,
  trip,
  tripId,
} from "../__fixtures__/domain";
import { downloadTripPack, type TripPackSources } from "./download";
import { OfflineTripPack } from "./module";

const sources = (overrides: Partial<TripPackSources> = {}): TripPackSources => ({
  getTrip: async () => trip,
  listStops: async () => [stop],
  listItinerary: async () => [{ ...itineraryItem, place: { kind: "venue", placeId: place.id, label: place.name } }],
  getPlace: async () => place,
  listReservations: async () => [reservation],
  listDocuments: async () => [document],
  listExpenses: async () => [expense],
  ...overrides,
});

describe("offline trip pack download", () => {
  it("stores a pack the offline module can load back", async () => {
    const offline = new OfflineTripPack(new InMemoryTripPackStore(), new InMemoryTripPackFileStore());
    const pack = await downloadTripPack(tripId, sources(), offline, () => new Date("2026-10-02T10:00:00.000Z"));

    expect(pack.places).toEqual([place]);
    expect(pack.manifest.files).toEqual([]);
    expect(await offline.load(tripId)).toMatchObject({ state: "ready", manifest: { generatedAt: "2026-10-02T10:00:00.000Z" } });
  });

  it("keeps going when a place or a document link cannot be resolved", async () => {
    const offline = new OfflineTripPack(new InMemoryTripPackStore(), new InMemoryTripPackFileStore());
    const pack = await downloadTripPack(
      tripId,
      sources({
        getPlace: async () => { throw new Error("offline"); },
        listReservations: async () => [],
        listDocuments: async () => [{ ...document, reservationId: "00000000-0000-4000-8000-00000000ffff" as UUID }],
      }),
      offline,
    );

    expect(pack.places).toEqual([]);
    expect(pack.documents).toEqual([]);
    expect((await offline.load(tripId)).state).toBe("ready");
  });

  it("refuses to build a pack for an unknown Voyage", async () => {
    const offline = new OfflineTripPack(new InMemoryTripPackStore(), new InMemoryTripPackFileStore());
    await expect(downloadTripPack(tripId, sources({ getTrip: async () => null }), offline)).rejects.toThrow("Voyage introuvable");
  });
});
