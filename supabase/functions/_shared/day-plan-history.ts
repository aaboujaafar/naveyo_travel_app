import type { UsedPlaceIdentity } from "./day-place-exclusions.ts";

const MAX_ENTRIES = 500;
const MAX_STRING_LENGTH = 256;

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : undefined;

const boundedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  return result.length > 0 ? result.slice(0, MAX_STRING_LENGTH) : undefined;
};

const coordinate = (value: unknown, minimum: number, maximum: number): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : undefined;

const readCoordinates = (value: unknown): { latitude: number; longitude: number } | undefined => {
  const record = asRecord(value);
  if (!record) return undefined;
  const latitude = coordinate(record.latitude ?? record.lat, -90, 90);
  const longitude = coordinate(record.longitude ?? record.lng ?? record.lon, -180, 180);
  return latitude === undefined || longitude === undefined ? undefined : { latitude, longitude };
};

const firstRelation = (value: unknown): RecordValue | undefined => {
  if (Array.isArray(value)) return value.map(asRecord).find((entry): entry is RecordValue => Boolean(entry));
  return asRecord(value);
};

const identityKey = (identity: RecordValue): string => JSON.stringify([
  identity.candidateId ?? null,
  identity.provider ?? null,
  identity.providerPlaceId ?? null,
  identity.name ?? null,
  identity.coordinates ?? null,
]);

const normalizeRow = (row: unknown, mobile: boolean): UsedPlaceIdentity | undefined => {
  const record = asRecord(row);
  if (!record) return undefined;

  const relation = mobile ? firstRelation(record.place) : firstRelation(record.place ?? record.places);
  const coordinates = readCoordinates(
    record.coordinates ?? relation?.coordinates ?? (relation && {
      latitude: relation.latitude,
      longitude: relation.longitude,
    }),
  );
  const candidateId = boundedString(
    mobile
      ? record.candidateId ?? record.placeId ?? relation?.placeId ?? relation?.place_id ?? relation?.id
      : record.place_id ?? relation?.id,
  );
  const rawProvider = boundedString(record.provider ?? relation?.provider);
  const provider = rawProvider === "google" || rawProvider === "geoapify" ? rawProvider : undefined;
  const providerPlaceId = boundedString(
    record.providerPlaceId ?? relation?.provider_place_id ?? relation?.providerPlaceId,
  );
  const name = boundedString(
    mobile
      ? relation?.name ?? relation?.label ?? record.name ?? record.label ?? record.title ?? relation?.title
      : relation?.name ?? record.name,
  );

  const identity: RecordValue = {
    ...(candidateId ? { candidateId } : {}),
    ...(provider ? { provider } : {}),
    ...(providerPlaceId ? { providerPlaceId } : {}),
    ...(name ? { name } : {}),
    ...(coordinates ? { coordinates } : {}),
  };
  return Object.keys(identity).length === 0 ? undefined : identity as UsedPlaceIdentity;
};

const rows = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export function collectUsedPlaceHistory(databaseRows: unknown, clientRows: unknown): UsedPlaceIdentity[] {
  const result: UsedPlaceIdentity[] = [];
  const seen = new Set<string>();
  for (const [input, mobile] of [[databaseRows, false], [clientRows, true]] as const) {
    for (const row of rows(input)) {
      if (result.length >= MAX_ENTRIES) return result;
      const identity = normalizeRow(row, mobile);
      if (!identity) continue;
      const key = identityKey(identity as RecordValue);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(identity);
    }
  }
  return result;
}
