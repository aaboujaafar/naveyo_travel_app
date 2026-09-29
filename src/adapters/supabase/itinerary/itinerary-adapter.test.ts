import { describe, expect, it } from "vitest";
import { createSupabaseItineraryModule } from ".";
import type { SupabaseQuery, SupabaseResponse } from "../identity/client";
import type { PlaceCandidate, UUID } from "../../../modules/_shared/model";

const tripId = "10000000-0000-4000-8000-000000000001" as UUID;
const stopId = "20000000-0000-4000-8000-000000000002" as UUID;
const itemId = "30000000-0000-4000-8000-000000000003" as UUID;
const placeRowId = "40000000-0000-4000-8000-000000000004" as UUID;
const candidateId = "50000000-0000-5000-8000-000000000000" as UUID;

type Call = { table: string; op: string; values?: unknown; filters: [string, string][] };

/** Minimal chainable client: responses are chosen per table and operation. */
function fakeClient(respond: (call: Call) => SupabaseResponse) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, op: "select", filters: [] };
    calls.push(call);
    const chain: SupabaseQuery = {
      then: (resolve, reject) => Promise.resolve(respond(call)).then(resolve, reject),
      select: () => chain,
      insert: (values) => { call.op = "insert"; call.values = values; return chain; },
      update: (values) => { call.op = "update"; call.values = values; return chain; },
      delete: () => { call.op = "delete"; return chain; },
      eq: (column, value) => { call.filters.push([column, value]); return chain; },
      order: () => chain,
      single: () => chain,
    };
    return chain;
  };
  return { client: { auth: {}, from, rpc: () => undefined } as never, calls };
}

const itemRow = (place: Record<string, unknown> | null) => ({
  id: itemId,
  trip_id: tripId,
  stop_id: stopId,
  title: "Musée",
  local_date: "2026-09-05",
  local_time: "10:30:00",
  timezone: "Europe/Lisbon",
  notes: null,
  place,
});

const candidate: PlaceCandidate = {
  id: candidateId,
  provider: "geoapify",
  providerPlaceId: "geo-123",
  name: "Museu",
  coordinates: { latitude: 38.7, longitude: -9.2 },
  countryCode: "pt",
  attribution: "© OpenStreetMap",
};

describe("Supabase itinerary adapter", () => {
  it("persists a confirmed place and links the itinerary item to it", async () => {
    const { client, calls } = fakeClient((call) => {
      if (call.table === "places" && call.op === "select") return { data: [], error: null };
      if (call.table === "places" && call.op === "insert") return { data: { id: placeRowId }, error: null };
      return { data: itemRow({ id: placeRowId, provider: "geoapify", name: "Museu", latitude: 38.7, longitude: -9.2, provider_payload: { candidateId } }), error: null };
    });
    const module = createSupabaseItineraryModule(client);

    const item = await module.addConfirmedPlace({
      tripId,
      stopId,
      date: "2026-09-05",
      title: "Musée",
      place: candidate,
      time: { local: "2026-09-05T10:30", timeZone: "Europe/Lisbon" as never },
    });

    const placeInsert = calls.find((call) => call.table === "places" && call.op === "insert");
    expect(placeInsert?.values).toMatchObject({
      trip_id: tripId,
      provider: "geoapify",
      provider_place_id: "geo-123",
      country_code: "PT",
      provider_payload: { candidateId },
    });
    const itemInsert = calls.find((call) => call.table === "itinerary_items" && call.op === "insert");
    expect(itemInsert?.values).toMatchObject({ place_id: placeRowId, item_type: "place", local_time: "10:30" });
    expect(item.place?.placeId).toBe(candidateId);
  });

  it("reuses the place already saved by the other traveller", async () => {
    const { client, calls } = fakeClient((call) => {
      if (call.table === "places") return { data: [{ id: placeRowId }], error: null };
      return { data: itemRow(null), error: null };
    });
    await createSupabaseItineraryModule(client).addConfirmedPlace({
      tripId, stopId, date: "2026-09-05", title: "Musée", place: candidate,
      time: { local: "10:30", timeZone: "Europe/Lisbon" as never },
    });
    expect(calls.some((call) => call.table === "places" && call.op === "insert")).toBe(false);
  });

  it("lists items with the confirmed candidate id and a clock-only local time", async () => {
    const { client } = fakeClient(() => ({
      data: [itemRow({ id: placeRowId, provider: "geoapify", name: "Museu", latitude: 38.7, longitude: -9.2, provider_payload: { candidateId } })],
      error: null,
    }));
    const [item] = await createSupabaseItineraryModule(client).list(tripId);
    expect(item).toMatchObject({
      id: itemId,
      date: "2026-09-05",
      time: { local: "10:30", timeZone: "Europe/Lisbon" },
      place: { placeId: candidateId, label: "Museu", coordinates: { latitude: 38.7, longitude: -9.2 } },
    });
  });

  it("uses the Étape timezone for untimed notes", async () => {
    const { client, calls } = fakeClient((call) =>
      call.table === "stops"
        ? { data: { timezone: "Europe/Lisbon" }, error: null }
        : { data: { ...itemRow(null), local_time: null }, error: null },
    );
    await createSupabaseItineraryModule(client).add({ tripId, stopId, date: "2026-09-05", title: "Note" });
    const insert = calls.find((call) => call.table === "itinerary_items" && call.op === "insert");
    expect(insert?.values).toMatchObject({ timezone: "Europe/Lisbon", local_time: null, item_type: "note", place_id: null });
  });
});
