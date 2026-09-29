import type { UUID } from "../../../modules/_shared/model";
import { isUuid } from "../../../modules/_shared/validation";
import type {
  PackingCategory,
  PackingItem,
  PackingListModule,
  PackingListStore,
} from "../../../modules/packing-list";
import { PackingList } from "../../../modules/packing-list/module";
import { AuthorizationError } from "../../../modules/trips";
import type { SupabaseClientLike, SupabaseQuery } from "../identity/client";

type Row = Record<string, unknown>;
type DatabaseError = { message: string; code?: string };

const columns =
  "id,trip_id,stop_id,label,category,quantity,packed,assigned_to,created_at,updated_at";
const categories: readonly PackingCategory[] = [
  "documents",
  "clothing",
  "toiletries",
  "electronics",
  "health",
  "other",
];
const authErrorCodes = new Set(["42501", "PGRST301", "PGRST116"]);

const asRows = (value: unknown): Row[] =>
  Array.isArray(value)
    ? value.filter(
        (row): row is Row => Boolean(row) && typeof row === "object",
      )
    : [];

const asRow = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};

const text = (row: Row, key: string): string => {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Invalid Supabase field: ${key}`);
  return value;
};

const optionalUuid = (row: Row, key: string): UUID | undefined => {
  const value = row[key];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string" || !isUuid(value))
    throw new Error(`Invalid Supabase field: ${key}`);
  return value;
};

const integer = (row: Row, key: string): number => {
  const value = row[key];
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 99)
    throw new Error(`Invalid Supabase field: ${key}`);
  return value as number;
};

const mapItem = (row: Row): PackingItem => {
  const category = text(row, "category");
  if (!categories.includes(category as PackingCategory))
    throw new Error("Invalid Supabase field: category");
  const packed = row.packed;
  if (typeof packed !== "boolean")
    throw new Error("Invalid Supabase field: packed");
  return {
    id: text(row, "id") as UUID,
    tripId: text(row, "trip_id") as UUID,
    stopId: optionalUuid(row, "stop_id"),
    label: text(row, "label"),
    category: category as PackingCategory,
    quantity: integer(row, "quantity"),
    packed,
    assignedTo: optionalUuid(row, "assigned_to"),
    createdAt: text(row, "created_at") as PackingItem["createdAt"],
    updatedAt: text(row, "updated_at") as PackingItem["updatedAt"],
  };
};

const throwDatabaseError = (error: DatabaseError | null): void => {
  if (!error) return;
  if (error.code && authErrorCodes.has(error.code))
    throw new AuthorizationError("Packing item is not available for this trip");
  throw new Error(error.message);
};

const query = async <T>(request: SupabaseQuery<T>): Promise<T | null> => {
  const response = await request;
  throwDatabaseError(response.error);
  return response.data;
};

const createStore = (client: SupabaseClientLike): PackingListStore => ({
  async list(tripId) {
    const data = await query(
      client
        .from("packing_items")
        .select(columns)
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true }),
    );
    return asRows(data).map(mapItem);
  },
  async save(item) {
    const data = await query(
      client
        .from("packing_items")
        .insert({
          id: item.id,
          trip_id: item.tripId,
          stop_id: item.stopId ?? null,
          label: item.label,
          category: item.category,
          quantity: item.quantity,
          packed: item.packed,
          assigned_to: item.assignedTo ?? null,
        })
        .select(columns)
        .single(),
    );
    if (!data) throw new Error("Supabase did not return the created packing item");
    return mapItem(asRow(data));
  },
  async update(item) {
    const data = await query(
      client
        .from("packing_items")
        .update({
          stop_id: item.stopId ?? null,
          label: item.label,
          category: item.category,
          quantity: item.quantity,
          packed: item.packed,
          assigned_to: item.assignedTo ?? null,
        })
        .eq("trip_id", item.tripId)
        .eq("id", item.id)
        .select(columns)
        .single(),
    );
    if (!data) throw new Error("Supabase did not return the updated packing item");
    return mapItem(asRow(data));
  },
  async remove(tripId, itemId) {
    const table = client.from("packing_items");
    if (!table.delete)
      throw new Error("Supabase packing item removal is unavailable");
    await query(table.delete().eq("trip_id", tripId).eq("id", itemId));
  },
  async hasStop(tripId, stopId) {
    // A list query returns [] for a missing Étape instead of a PGRST116 error.
    const data = await query(
      client.from("stops").select("id").eq("trip_id", tripId).eq("id", stopId),
    );
    return asRows(data).length > 0;
  },
});

export const createSupabasePackingListModule = (
  client: SupabaseClientLike,
): PackingListModule => new PackingList(createStore(client));

export type { SupabaseClientLike } from "../identity/client";
