import type {
  ItineraryItem,
  PlaceCandidate,
  PlaceReference,
  UUID,
} from "../../../modules/_shared/model";
import { isIanaTimeZone, parseItineraryItem } from "../../../modules/_shared/validation";
import type { ConfirmedPlaceInput, ItineraryModule } from "../../../modules/itinerary/interface";
import { AuthorizationError } from "../../../modules/trips";
import type { SupabaseClientLike, SupabaseQuery } from "../identity/client";

type Row = Record<string, unknown>;
type DatabaseError = { message: string; code?: string };

const placeColumns =
  "id,provider,provider_place_id,name,address,country_code,latitude,longitude,attribution,provider_payload";
const itemColumns = `id,trip_id,stop_id,title,local_date,local_time,timezone,notes,place:places(${placeColumns})`;
const authErrorCodes = new Set(["42501", "PGRST301"]);
const uniqueViolation = "23505";

const asRows = (value: unknown): Row[] =>
  Array.isArray(value)
    ? value.filter((row): row is Row => Boolean(row) && typeof row === "object")
    : [];

const asRow = (value: unknown): Row | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null;

const optionalText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

class DatabaseRequestError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

const query = async <T>(request: SupabaseQuery<T>): Promise<T | null> => {
  const { data, error } = await request;
  throwDatabaseError(error);
  return data;
};

const throwDatabaseError = (error: DatabaseError | null): void => {
  if (!error) return;
  if (error.code && authErrorCodes.has(error.code))
    throw new AuthorizationError("Itinerary is not available for this trip");
  throw new DatabaseRequestError(error.message, error.code);
};

/** Postgres `time` columns only keep the clock part of a LocalDateTime. */
const localTimeValue = (local: string | undefined): string | null => {
  if (!local) return null;
  // Date-only values (e.g. an all-day Réservation) have no clock part.
  return /(?:^|T|\s)(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(local.trim())?.[1] ?? null;
};

const mapPlace = (row: Row | null): PlaceReference | undefined => {
  if (!row) return undefined;
  const payload = asRow(row.provider_payload);
  const candidateId = optionalText(payload?.candidateId);
  const latitude = row.latitude;
  const longitude = row.longitude;
  return {
    kind: "venue",
    placeId: (candidateId ?? row.id) as UUID,
    label: typeof row.name === "string" ? row.name : "",
    address: optionalText(row.address),
    countryCode: optionalText(row.country_code),
    coordinates:
      typeof latitude === "number" && typeof longitude === "number"
        ? { latitude, longitude }
        : undefined,
    attribution: optionalText(row.attribution),
  };
};

const mapItem = (row: Row): ItineraryItem => {
  const localTime = optionalText(row.local_time)?.slice(0, 5);
  const timeZone = row.timezone;
  return parseItineraryItem({
    id: row.id,
    tripId: row.trip_id,
    stopId: row.stop_id,
    title: row.title,
    date: row.local_date,
    ...(localTime && typeof timeZone === "string" ? { time: { local: localTime, timeZone } } : {}),
    ...(asRow(row.place) ? { place: mapPlace(asRow(row.place)) } : {}),
    ...(optionalText(row.notes) ? { notes: row.notes } : {}),
  });
};

type PlaceSnapshot = Pick<PlaceCandidate, "provider" | "name" | "address" | "countryCode" | "attribution" | "providerPlaceId"> & {
  id?: UUID;
  coordinates?: PlaceCandidate["coordinates"];
};

/** Supabase-backed itinerary shared by every member of the Voyage. */
export const createSupabaseItineraryModule = (
  client: SupabaseClientLike,
): ItineraryModule => {
  const stopTimeZone = async (tripId: UUID, stopId: UUID): Promise<string> => {
    const data = asRow(
      await query(
        client.from("stops").select("timezone").eq("trip_id", tripId).eq("id", stopId).single(),
      ),
    );
    const timeZone = data?.timezone;
    if (typeof timeZone !== "string" || !isIanaTimeZone(timeZone))
      throw new Error("Itinerary stop timezone is unavailable");
    return timeZone;
  };

  const findPlaceId = async (
    tripId: UUID,
    provider: string,
    providerPlaceId: string,
  ): Promise<UUID | null> => {
    const rows = asRows(
      await query(
        client
          .from("places")
          .select("id")
          .eq("trip_id", tripId)
          .eq("provider", provider)
          .eq("provider_place_id", providerPlaceId),
      ),
    );
    const id = rows[0]?.id;
    return typeof id === "string" ? (id as UUID) : null;
  };

  const savePlace = async (tripId: UUID, stopId: UUID, place: PlaceSnapshot): Promise<UUID> => {
    const providerPlaceId = place.provider === "manual" ? undefined : place.providerPlaceId;
    if (providerPlaceId) {
      const existing = await findPlaceId(tripId, place.provider, providerPlaceId);
      if (existing) return existing;
    }
    try {
      const data = asRow(
        await query(
          client
            .from("places")
            .insert({
              trip_id: tripId,
              stop_id: stopId,
              provider: place.provider,
              provider_place_id: providerPlaceId ?? null,
              name: place.name,
              kind: "venue",
              address: place.address ?? null,
              country_code: place.countryCode?.toUpperCase() ?? null,
              latitude: place.coordinates?.latitude ?? null,
              longitude: place.coordinates?.longitude ?? null,
              attribution: place.attribution ?? null,
              provider_payload: place.id ? { candidateId: place.id } : {},
            })
            .select("id")
            .single(),
        ),
      );
      if (typeof data?.id !== "string") throw new Error("Supabase did not return the saved place");
      return data.id as UUID;
    } catch (error) {
      // The other traveller may have saved the same provider place concurrently.
      if (error instanceof DatabaseRequestError && error.code === uniqueViolation && providerPlaceId) {
        const existing = await findPlaceId(tripId, place.provider, providerPlaceId);
        if (existing) return existing;
      }
      throw error;
    }
  };

  const insertItem = async (
    input: Omit<ItineraryItem, "id">,
    placeId: UUID | null,
  ): Promise<ItineraryItem> => {
    const timeZone = input.time?.timeZone ?? (await stopTimeZone(input.tripId, input.stopId));
    const data = await query(
      client
        .from("itinerary_items")
        .insert({
          trip_id: input.tripId,
          stop_id: input.stopId,
          place_id: placeId,
          title: input.title.trim(),
          item_type: placeId ? "place" : "note",
          local_date: input.date,
          local_time: localTimeValue(input.time?.local),
          timezone: timeZone,
          notes: input.notes?.trim() || null,
        })
        .select(itemColumns)
        .single(),
    );
    const row = asRow(data);
    if (!row) throw new Error("Supabase did not return the itinerary item");
    return mapItem(row);
  };

  return {
    async list(tripId) {
      const data = await query(
        client
          .from("itinerary_items")
          .select(itemColumns)
          .eq("trip_id", tripId)
          .order("local_date", { ascending: true })
          .order("local_time", { ascending: true }),
      );
      return asRows(data).map(mapItem);
    },
    async add(input) {
      // Réservation places are persisted as manual snapshots so both travellers see them.
      const placeId = input.place
        ? await savePlace(input.tripId, input.stopId, {
            id: input.place.placeId,
            provider: "manual",
            name: input.place.label,
            address: input.place.address,
            countryCode: input.place.countryCode,
            coordinates: input.place.coordinates,
            attribution: input.place.attribution,
          })
        : null;
      const item = await insertItem(input, placeId);
      return input.place ? { ...item, place: input.place } : item;
    },
    async addConfirmedPlace(input: ConfirmedPlaceInput) {
      const { place, ...rest } = input;
      const placeId = await savePlace(input.tripId, input.stopId, place);
      const item = await insertItem(rest, placeId);
      // Keep the exact provider snapshot the traveller confirmed.
      return {
        ...item,
        place: {
          kind: "venue",
          placeId: place.id,
          label: place.name,
          address: place.address,
          countryCode: place.countryCode,
          coordinates: place.coordinates,
          attribution: place.attribution,
        },
      };
    },
  };
};
