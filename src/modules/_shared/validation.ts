import type {
  Coordinates,
  Expense,
  ISO4217,
  IANATimeZone,
  ISODateTime,
  ItineraryItem,
  LocalDateTime,
  Money,
  PlaceCandidate,
  PlaceReference,
  Reservation,
  ReservationDraft,
  Stop,
  TrackPoint,
  TravelDocument,
  Trip,
  TripPack,
  TripPackManifest,
  UUID,
} from "./model";

export const isUuid = (value: string): value is UUID =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export const isIsoDateTime = (value: string): value is ISODateTime =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/.test(value) &&
  !Number.isNaN(Date.parse(value));

export const isLocalDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const isIanaTimeZone = (value: string): value is IANATimeZone => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

// ISO 4217 currencies supported by the V0 contract. Keeping an explicit allowlist
// prevents arbitrary three-letter values from crossing a persistence boundary.
const ISO_4217_CURRENCIES = new Set([
  "AED",
  "ARS",
  "AUD",
  "BDT",
  "BGN",
  "BHD",
  "BND",
  "BOB",
  "BRL",
  "BWP",
  "BYN",
  "CAD",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CRC",
  "CZK",
  "DKK",
  "DOP",
  "DZD",
  "EGP",
  "EUR",
  "GBP",
  "GEL",
  "GHS",
  "GTQ",
  "HKD",
  "HNL",
  "HRK",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "IQD",
  "ISK",
  "JMD",
  "JOD",
  "JPY",
  "KES",
  "KGS",
  "KHR",
  "KRW",
  "KWD",
  "KZT",
  "LBP",
  "LKR",
  "MAD",
  "MDL",
  "MKD",
  "MMK",
  "MOP",
  "MUR",
  "MXN",
  "MYR",
  "MZN",
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  "OMR",
  "PAB",
  "PEN",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RSD",
  "RUB",
  "RWF",
  "SAR",
  "SEK",
  "SGD",
  "SHP",
  "SLE",
  "SOS",
  "SRD",
  "THB",
  "TND",
  "TRY",
  "TTD",
  "TWD",
  "TZS",
  "UAH",
  "UGX",
  "USD",
  "UYU",
  "UZS",
  "VES",
  "VND",
  "XAF",
  "XCD",
  "XOF",
  "XPF",
  "ZAR",
  "ZMW",
]);

export const isCurrency = (value: string): value is ISO4217 =>
  ISO_4217_CURRENCIES.has(value);

export const parseMoney = (value: unknown): Money => {
  if (!value || typeof value !== "object")
    throw new Error("Money must be an object");
  const candidate = value as Record<string, unknown>;
  if (
    !Number.isSafeInteger(candidate.minorUnits) ||
    (candidate.minorUnits as number) < 0 ||
    typeof candidate.currency !== "string" ||
    !isCurrency(candidate.currency)
  ) {
    throw new Error("Invalid money");
  }
  return {
    minorUnits: candidate.minorUnits as number,
    currency: candidate.currency,
  };
};

export const parseCoordinates = (value: unknown): Coordinates => {
  if (!value || typeof value !== "object")
    throw new Error("Coordinates must be an object");
  const candidate = value as Record<string, unknown>;
  const latitude = candidate.latitude;
  const longitude = candidate.longitude;
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  )
    throw new Error("Invalid coordinates");
  return { latitude, longitude };
};

export const assertStableId = (id: string): UUID => {
  if (!isUuid(id)) throw new Error("Expected a stable UUID");
  return id;
};

const record = (value: unknown, name: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${name} must be an object`);
  return value as Record<string, unknown>;
};

const stringValue = (value: unknown, name: string): string => {
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Invalid ${name}`);
  return value;
};

const uuidValue = (value: unknown, name: string): UUID => {
  if (typeof value !== "string" || !isUuid(value))
    throw new Error(`Invalid ${name}`);
  return value;
};

const dateValue = (value: unknown, name: string): string => {
  if (typeof value !== "string" || !isLocalDate(value))
    throw new Error(`Invalid ${name}`);
  return value;
};

const dateRange = (
  start: string | undefined,
  end: string | undefined,
  name: string,
): void => {
  if (start !== undefined && end !== undefined && start > end)
    throw new Error(`Invalid ${name} date range`);
};

const arrayValue = (value: unknown, name: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value;
};

const parseOptionalString = (
  value: unknown,
  name: string,
): string | undefined => {
  if (value === undefined) return undefined;
  return stringValue(value, name);
};

export const parsePlaceReference = (value: unknown): PlaceReference => {
  const candidate = record(value, "Place reference");
  const kind = candidate.kind;
  if (
    kind !== "venue" &&
    kind !== "meetingPoint" &&
    kind !== "origin" &&
    kind !== "destination"
  )
    throw new Error("Invalid place reference kind");
  const result: PlaceReference = {
    kind,
    label: stringValue(candidate.label, "place reference label"),
  };
  const placeId = candidate.placeId;
  if (placeId !== undefined)
    result.placeId = uuidValue(placeId, "place reference placeId");
  result.address = parseOptionalString(
    candidate.address,
    "place reference address",
  );
  result.countryCode = parseOptionalString(
    candidate.countryCode,
    "place reference countryCode",
  );
  if (candidate.coordinates !== undefined)
    result.coordinates = parseCoordinates(candidate.coordinates);
  return result;
};

export const parseLocalDateTime = (value: unknown): LocalDateTime => {
  const candidate = record(value, "Local date time");
  const result: LocalDateTime = {
    local: stringValue(candidate.local, "local date time"),
    timeZone: candidate.timeZone as IANATimeZone,
  };
  if (!isIanaTimeZone(result.timeZone))
    throw new Error("Invalid local date time timezone");
  if (candidate.instantUtc !== undefined) {
    if (
      typeof candidate.instantUtc !== "string" ||
      !isIsoDateTime(candidate.instantUtc)
    )
      throw new Error("Invalid local date time instant");
    result.instantUtc = candidate.instantUtc;
  }
  return result;
};

export const parseTrip = (value: unknown): Trip => {
  const candidate = record(value, "Trip");
  const members = arrayValue(candidate.members, "Trip members").map(
    (member) => {
      const item = record(member, "Trip member");
      const role = item.role;
      if (role !== "owner" && role !== "editor")
        throw new Error("Invalid trip member role");
      return {
        accountId: uuidValue(item.accountId, "trip member accountId"),
        role: role as "owner" | "editor",
      };
    },
  );
  const startsOn =
    candidate.startsOn === undefined
      ? undefined
      : dateValue(candidate.startsOn, "trip startsOn");
  const endsOn =
    candidate.endsOn === undefined
      ? undefined
      : dateValue(candidate.endsOn, "trip endsOn");
  dateRange(startsOn, endsOn, "trip");
  return {
    id: uuidValue(candidate.id, "trip id"),
    name: stringValue(candidate.name, "trip name"),
    referenceCurrency:
      typeof candidate.referenceCurrency === "string" &&
      isCurrency(candidate.referenceCurrency)
        ? candidate.referenceCurrency
        : (() => {
            throw new Error("Invalid trip reference currency");
          })(),
    startsOn,
    endsOn,
    travelers: arrayValue(candidate.travelers, "trip travelers").map((id) =>
      uuidValue(id, "traveler id"),
    ),
    members,
    stopIds: arrayValue(candidate.stopIds, "trip stop ids").map((id) =>
      uuidValue(id, "stop id"),
    ),
    createdAt:
      typeof candidate.createdAt === "string" &&
      isIsoDateTime(candidate.createdAt)
        ? candidate.createdAt
        : (() => {
            throw new Error("Invalid trip createdAt");
          })(),
  };
};

export const parseStop = (value: unknown): Stop => {
  const candidate = record(value, "Stop");
  const timeZone = candidate.timeZone;
  if (typeof timeZone !== "string" || !isIanaTimeZone(timeZone))
    throw new Error("Invalid stop timezone");
  const startDate = dateValue(candidate.startDate, "stop startDate");
  const endDate = dateValue(candidate.endDate, "stop endDate");
  dateRange(startDate, endDate, "stop");
  return {
    id: uuidValue(candidate.id, "stop id"),
    tripId: uuidValue(candidate.tripId, "stop tripId"),
    name: stringValue(candidate.name, "stop name"),
    countryCode: stringValue(candidate.countryCode, "stop countryCode"),
    timeZone,
    startDate,
    endDate,
  };
};

export const parseItineraryItem = (value: unknown): ItineraryItem => {
  const candidate = record(value, "Itinerary item");
  const result: ItineraryItem = {
    id: uuidValue(candidate.id, "itinerary item id"),
    tripId: uuidValue(candidate.tripId, "itinerary item tripId"),
    stopId: uuidValue(candidate.stopId, "itinerary item stopId"),
    title: stringValue(candidate.title, "itinerary item title"),
    date: dateValue(candidate.date, "itinerary item date"),
  };
  if (candidate.time !== undefined)
    result.time = parseLocalDateTime(candidate.time);
  if (candidate.place !== undefined)
    result.place = parsePlaceReference(candidate.place);
  result.notes = parseOptionalString(candidate.notes, "itinerary item notes");
  return result;
};

export const parseReservationDraft = (value: unknown): ReservationDraft => {
  const candidate = record(value, "Reservation draft");
  const result: ReservationDraft = {
    confidence: candidate.confidence as ReservationDraft["confidence"],
    fieldsRequiringConfirmation: arrayValue(
      candidate.fieldsRequiringConfirmation,
      "reservation draft confirmation fields",
    ).map((field) => stringValue(field, "confirmation field")),
  };
  if (
    result.confidence !== "low" &&
    result.confidence !== "medium" &&
    result.confidence !== "high"
  )
    throw new Error("Invalid reservation draft confidence");
  if (candidate.sourceDocumentId !== undefined)
    result.sourceDocumentId = uuidValue(
      candidate.sourceDocumentId,
      "reservation draft sourceDocumentId",
    );
  if (candidate.type !== undefined) {
    if (
      ![
        "accommodation",
        "flight",
        "train",
        "ferry",
        "activity",
        "other",
      ].includes(String(candidate.type))
    )
      throw new Error("Invalid reservation draft type");
    result.type = candidate.type as ReservationDraft["type"];
  }
  result.title = parseOptionalString(
    candidate.title,
    "reservation draft title",
  );
  result.provider = parseOptionalString(
    candidate.provider,
    "reservation draft provider",
  );
  result.reference = parseOptionalString(
    candidate.reference,
    "reservation draft reference",
  );
  if (candidate.start !== undefined)
    result.start = parseLocalDateTime(candidate.start);
  if (candidate.end !== undefined)
    result.end = parseLocalDateTime(candidate.end);
  if (candidate.venue !== undefined)
    result.venue = parsePlaceReference(candidate.venue);
  if (candidate.origin !== undefined)
    result.origin = parsePlaceReference(candidate.origin);
  if (candidate.destination !== undefined)
    result.destination = parsePlaceReference(candidate.destination);
  return result;
};

export const parseTrackPoint = (value: unknown): TrackPoint => {
  const candidate = record(value, "Track point");
  const recordedAt = candidate.recordedAt;
  if (typeof recordedAt !== "string" || !isIsoDateTime(recordedAt))
    throw new Error("Track point timestamp must be UTC");
  if (
    typeof candidate.accuracyMeters !== "number" ||
    !Number.isFinite(candidate.accuracyMeters) ||
    candidate.accuracyMeters < 0
  )
    throw new Error("Invalid track point accuracy");
  return {
    idempotencyKey: stringValue(
      candidate.idempotencyKey,
      "track point idempotencyKey",
    ),
    ...parseCoordinates({
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    }),
    recordedAt,
    accuracyMeters: candidate.accuracyMeters,
  };
};

export const parseTravelDocument = (value: unknown): TravelDocument => {
  const candidate = record(value, "Travel document");
  const kind = candidate.kind;
  if (!["pdf", "image", "text", "url", "ics"].includes(String(kind)))
    throw new Error("Invalid travel document kind");
  const result: TravelDocument = {
    id: uuidValue(candidate.id, "document id"),
    tripId: uuidValue(candidate.tripId, "document tripId"),
    kind: kind as TravelDocument["kind"],
    persistentUri: stringValue(
      candidate.persistentUri,
      "document persistentUri",
    ),
    checksum: stringValue(candidate.checksum, "document checksum"),
    createdAt:
      typeof candidate.createdAt === "string" &&
      isIsoDateTime(candidate.createdAt)
        ? candidate.createdAt
        : (() => {
            throw new Error("Invalid document createdAt");
          })(),
  };
  result.fileName = parseOptionalString(
    candidate.fileName,
    "document fileName",
  );
  if (candidate.reservationId !== undefined)
    result.reservationId = uuidValue(
      candidate.reservationId,
      "document reservationId",
    );
  return result;
};

export const parseReservation = (value: unknown): Reservation => {
  const candidate = record(value, "Reservation");
  const type = candidate.type;
  if (
    ![
      "accommodation",
      "flight",
      "train",
      "ferry",
      "activity",
      "other",
    ].includes(String(type))
  )
    throw new Error("Invalid reservation type");
  const result: Reservation = {
    id: uuidValue(candidate.id, "reservation id"),
    tripId: uuidValue(candidate.tripId, "reservation tripId"),
    type: type as Reservation["type"],
    title: stringValue(candidate.title, "reservation title"),
    confirmedAt:
      typeof candidate.confirmedAt === "string" &&
      isIsoDateTime(candidate.confirmedAt)
        ? candidate.confirmedAt
        : (() => {
            throw new Error("Invalid reservation confirmedAt");
          })(),
  };
  result.provider = parseOptionalString(
    candidate.provider,
    "reservation provider",
  );
  result.reference = parseOptionalString(
    candidate.reference,
    "reservation reference",
  );
  if (candidate.start !== undefined)
    result.start = parseLocalDateTime(candidate.start);
  if (candidate.end !== undefined)
    result.end = parseLocalDateTime(candidate.end);
  if (candidate.venue !== undefined)
    result.venue = parsePlaceReference(candidate.venue);
  if (candidate.origin !== undefined)
    result.origin = parsePlaceReference(candidate.origin);
  if (candidate.destination !== undefined)
    result.destination = parsePlaceReference(candidate.destination);
  return result;
};

export const parsePlaceCandidate = (value: unknown): PlaceCandidate => {
  const candidate = record(value, "Place candidate");
  if (candidate.provider !== "geoapify" && candidate.provider !== "manual")
    throw new Error("Invalid place provider");
  const result: PlaceCandidate = {
    id: uuidValue(candidate.id, "place id"),
    provider: candidate.provider,
    name: stringValue(candidate.name, "place name"),
    coordinates: parseCoordinates(candidate.coordinates),
  };
  result.category = parseOptionalString(candidate.category, "place category");
  result.address = parseOptionalString(candidate.address, "place address");
  result.countryCode = parseOptionalString(
    candidate.countryCode,
    "place countryCode",
  );
  return result;
};

const parseUniqueIds = (values: unknown[], name: string): UUID[] => {
  const ids = values.map((value) => uuidValue(value, name));
  if (new Set(ids).size !== ids.length)
    throw new Error(`${name} contains duplicates`);
  return ids;
};

export const parseTripPackManifest = (value: unknown): TripPackManifest => {
  const candidate = record(value, "Trip pack manifest");
  const files = arrayValue(candidate.files, "trip pack files").map((file) => {
    const item = record(file, "trip pack file");
    const state = item.state;
    if (state !== "pending" && state !== "ready")
      throw new Error("Invalid trip pack file state");
    return {
      path: stringValue(item.path, "trip pack file path"),
      checksum: stringValue(item.checksum, "trip pack file checksum"),
      state: state as "pending" | "ready",
    };
  });
  return {
    tripId: uuidValue(candidate.tripId, "trip pack tripId"),
    schemaVersion:
      typeof candidate.schemaVersion === "number" &&
      Number.isSafeInteger(candidate.schemaVersion) &&
      candidate.schemaVersion > 0
        ? candidate.schemaVersion
        : (() => {
            throw new Error("Invalid trip pack schemaVersion");
          })(),
    generatedAt:
      typeof candidate.generatedAt === "string" &&
      isIsoDateTime(candidate.generatedAt)
        ? candidate.generatedAt
        : (() => {
            throw new Error("Invalid trip pack generatedAt");
          })(),
    serverRevision: stringValue(
      candidate.serverRevision,
      "trip pack serverRevision",
    ),
    files,
  };
};

export const parseTripPack = (value: unknown): TripPack => {
  const candidate = record(value, "Trip pack");
  const parsedTrip = parseTrip(candidate.trip);
  const stops = arrayValue(candidate.stops, "trip pack stops").map(parseStop);
  const places = arrayValue(candidate.places, "trip pack places").map(
    parsePlaceCandidate,
  );
  const itinerary = arrayValue(candidate.itinerary, "trip pack itinerary").map(
    parseItineraryItem,
  );
  const reservations = arrayValue(
    candidate.reservations,
    "trip pack reservations",
  ).map(parseReservation);
  const documents = arrayValue(candidate.documents, "trip pack documents").map(
    parseTravelDocument,
  );
  const expenses = arrayValue(candidate.expenses, "trip pack expenses").map(
    parseExpense,
  );
  const manifest = parseTripPackManifest(candidate.manifest);
  parseUniqueIds(
    stops.map((item) => item.id),
    "trip pack stop ids",
  );
  parseUniqueIds(
    places.map((item) => item.id),
    "trip pack place ids",
  );
  parseUniqueIds(
    itinerary.map((item) => item.id),
    "trip pack itinerary ids",
  );
  parseUniqueIds(
    reservations.map((item) => item.id),
    "trip pack reservation ids",
  );
  parseUniqueIds(
    documents.map((item) => item.id),
    "trip pack document ids",
  );
  parseUniqueIds(
    expenses.map((item) => item.id),
    "trip pack expense ids",
  );
  if (
    manifest.tripId !== parsedTrip.id ||
    stops.some((stop) => stop.tripId !== parsedTrip.id) ||
    itinerary.some((item) => item.tripId !== parsedTrip.id) ||
    reservations.some((item) => item.tripId !== parsedTrip.id) ||
    documents.some((item) => item.tripId !== parsedTrip.id) ||
    expenses.some((item) => item.tripId !== parsedTrip.id)
  )
    throw new Error("Trip pack contains data from another trip");
  return {
    manifest,
    trip: parsedTrip,
    stops,
    places,
    itinerary,
    reservations,
    documents,
    expenses,
  };
};

export const parseExpense = (value: unknown): Expense => {
  const candidate = record(value, "Expense");
  const source = candidate.exchangeRateSource;
  if (
    source !== "manual" &&
    source !== "provider" &&
    source !== "not-applicable"
  )
    throw new Error("Invalid exchange rate source");
  const result: Expense = {
    id: uuidValue(candidate.id, "expense id"),
    tripId: uuidValue(candidate.tripId, "expense tripId"),
    label: stringValue(candidate.label, "expense label"),
    original: parseMoney(candidate.original),
    reference: parseMoney(candidate.reference),
    exchangeRateSource: source,
    occurredOn: dateValue(candidate.occurredOn, "expense occurredOn"),
    paidBy: uuidValue(candidate.paidBy, "expense paidBy"),
  };
  if (source !== "not-applicable")
    result.exchangeRateDate = dateValue(
      candidate.exchangeRateDate,
      "expense exchangeRateDate",
    );
  else if (candidate.exchangeRateDate !== undefined)
    throw new Error(
      "Not-applicable expenses cannot have an exchange rate date",
    );
  return result;
};
