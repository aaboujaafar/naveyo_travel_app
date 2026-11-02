import type {
  Expense,
  ISODateTime,
  ItineraryItem,
  PlaceCandidate,
  Reservation,
  Stop,
  TravelDocument,
  Trip,
  UUID,
} from "../_shared/model";
import type { OfflineTripPackModule } from "./interface";
import { CURRENT_TRIP_PACK_SCHEMA_VERSION, type TripPack } from "./model";

/** Everything the device needs to read a Voyage without a connection. */
export interface TripPackSources {
  getTrip(tripId: UUID): Promise<Trip | null>;
  listStops(tripId: UUID): Promise<Stop[]>;
  listItinerary(tripId: UUID): Promise<ItineraryItem[]>;
  getPlace(placeId: UUID, tripId: UUID): Promise<PlaceCandidate | null>;
  listReservations(tripId: UUID): Promise<Reservation[]>;
  listDocuments(tripId: UUID): Promise<TravelDocument[]>;
  listExpenses(tripId: UUID): Promise<Expense[]>;
}

export interface TripPackContent {
  trip: Trip;
  stops: Stop[];
  places: PlaceCandidate[];
  itinerary: ItineraryItem[];
  reservations: Reservation[];
  documents: TravelDocument[];
  expenses: Expense[];
}

/**
 * Assembles a self-consistent pack. Document files stay online for now: the
 * pack carries their metadata only, so the manifest lists no file to verify.
 */
export function buildTripPack(content: TripPackContent, generatedAt: ISODateTime): TripPack {
  const stopIds = new Set(content.stops.map((stop) => stop.id));
  const reservationIds = new Set(content.reservations.map((reservation) => reservation.id));
  return {
    manifest: {
      tripId: content.trip.id,
      schemaVersion: CURRENT_TRIP_PACK_SCHEMA_VERSION,
      generatedAt,
      serverRevision: generatedAt,
      files: [],
    },
    trip: content.trip,
    stops: content.stops,
    places: uniqueById(content.places),
    itinerary: content.itinerary,
    reservations: content.reservations,
    // A document pointing at data the pack does not hold would make the whole pack invalid.
    documents: content.documents.filter(
      (document) =>
        (document.stopId === undefined || stopIds.has(document.stopId)) &&
        (document.reservationId === undefined || reservationIds.has(document.reservationId)),
    ),
    expenses: content.expenses,
  };
}

export async function downloadTripPack(
  tripId: UUID,
  sources: TripPackSources,
  offline: Pick<OfflineTripPackModule, "replace">,
  now: () => Date = () => new Date(),
): Promise<TripPack> {
  const [trip, stops, itinerary, reservations, documents, expenses] = await Promise.all([
    sources.getTrip(tripId),
    sources.listStops(tripId),
    sources.listItinerary(tripId),
    sources.listReservations(tripId),
    sources.listDocuments(tripId),
    sources.listExpenses(tripId),
  ]);
  if (!trip) throw new Error("Voyage introuvable");

  const placeIds = Array.from(
    new Set(itinerary.flatMap((item) => (item.place?.placeId ? [item.place.placeId] : []))),
  );
  // A place that cannot be fetched still keeps its label and coordinates in the itinerary item.
  const places = (await Promise.allSettled(placeIds.map((placeId) => sources.getPlace(placeId, tripId))))
    .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []));

  const pack = buildTripPack(
    { trip, stops, places, itinerary, reservations, documents, expenses },
    now().toISOString() as ISODateTime,
  );
  await offline.replace(pack);
  return pack;
}

function uniqueById<T extends { id: string }>(values: T[]): T[] {
  return Array.from(new Map(values.map((value) => [value.id, value])).values());
}
