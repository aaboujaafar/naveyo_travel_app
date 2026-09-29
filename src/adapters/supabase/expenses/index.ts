import type { ISO4217, UUID } from "../../../modules/_shared/model";
import type { ExpensesStore } from "../../../modules/expenses/interface";
import type { Budget, Expense, ExpenseCategory } from "../../../modules/expenses/model";
import { AuthorizationError } from "../../../modules/trips";
import type { SupabaseClientLike, SupabaseQuery } from "../identity/client";

type Row = Record<string, unknown>;

const expenseColumns =
  "id,trip_id,label,category,note,amount_minor,currency,reference_amount_minor,reference_currency,exchange_rate_source,exchange_rate_date,spent_on,paid_by_account_id";
const categories: readonly ExpenseCategory[] = [
  "transport",
  "accommodation",
  "food",
  "activity",
  "shopping",
  "other",
];
const authErrorCodes = new Set(["42501", "PGRST301"]);

const asRows = (value: unknown): Row[] =>
  Array.isArray(value)
    ? value.filter((row): row is Row => Boolean(row) && typeof row === "object")
    : [];

const query = async <T>(request: SupabaseQuery<T>): Promise<T | null> => {
  const { data, error } = await request;
  if (error) {
    if (error.code && authErrorCodes.has(error.code))
      throw new AuthorizationError("Budget is not available for this trip");
    throw new Error(error.message);
  }
  return data;
};

const text = (row: Row, key: string): string => {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Invalid Supabase field: ${key}`);
  return value;
};

const minor = (row: Row, key: string): number => {
  const value = typeof row[key] === "string" ? Number(row[key]) : row[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value))
    throw new Error(`Invalid Supabase field: ${key}`);
  return value;
};

const mapExpense = (row: Row): Expense => {
  const category = text(row, "category") as ExpenseCategory;
  if (!categories.includes(category)) throw new Error("Invalid Supabase field: category");
  const original = { minorUnits: minor(row, "amount_minor"), currency: text(row, "currency") as ISO4217 };
  const hasReference = row.reference_amount_minor !== null && row.reference_amount_minor !== undefined;
  const source = row.exchange_rate_source;
  return {
    id: text(row, "id") as UUID,
    tripId: text(row, "trip_id") as UUID,
    label: typeof row.label === "string" && row.label ? row.label : typeof row.note === "string" ? row.note : "",
    category,
    note: typeof row.note === "string" && row.note ? row.note : undefined,
    original,
    reference: hasReference
      ? { minorUnits: minor(row, "reference_amount_minor"), currency: text(row, "reference_currency") as ISO4217 }
      : original,
    exchangeRateSource: source === "manual" || source === "provider" ? source : "not-applicable",
    exchangeRateDate: typeof row.exchange_rate_date === "string" ? row.exchange_rate_date : undefined,
    occurredOn: text(row, "spent_on"),
    paidBy: typeof row.paid_by_account_id === "string" ? (row.paid_by_account_id as UUID) : undefined,
  };
};

const createStore = (client: SupabaseClientLike): ExpensesStore => ({
  async getBudget(tripId) {
    const row = asRows(
      await query(client.from("budgets").select("trip_id,amount_minor,currency").eq("trip_id", tripId)),
    )[0];
    if (!row) return null;
    return {
      tripId: text(row, "trip_id") as UUID,
      planned: { minorUnits: minor(row, "amount_minor"), currency: text(row, "currency") as ISO4217 },
    };
  },
  async saveBudget(budget: Budget) {
    const values = {
      amount_minor: budget.planned.minorUnits,
      currency: budget.planned.currency,
      updated_at: new Date().toISOString(),
    };
    const updated = asRows(
      await query(client.from("budgets").update(values).eq("trip_id", budget.tripId).select("trip_id")),
    );
    if (updated.length > 0) return;
    await query(client.from("budgets").insert({ trip_id: budget.tripId, ...values }).select("trip_id"));
  },
  async listExpenses(tripId) {
    const data = await query(
      client
        .from("expenses")
        .select(expenseColumns)
        .eq("trip_id", tripId)
        .order("spent_on", { ascending: true }),
    );
    return asRows(data).map(mapExpense);
  },
  async saveExpense(expense) {
    const converted = expense.exchangeRateSource !== "not-applicable";
    await query(
      client
        .from("expenses")
        .insert({
          id: expense.id,
          trip_id: expense.tripId,
          label: expense.label,
          category: expense.category,
          note: expense.note ?? null,
          amount_minor: expense.original.minorUnits,
          currency: expense.original.currency,
          reference_amount_minor: expense.reference.minorUnits,
          reference_currency: expense.reference.currency,
          exchange_rate_source: expense.exchangeRateSource,
          exchange_rate_date: expense.exchangeRateDate ?? expense.occurredOn,
          exchange_rate:
            converted && expense.original.minorUnits > 0
              ? expense.reference.minorUnits / expense.original.minorUnits
              : null,
          spent_on: expense.occurredOn,
          paid_by_account_id: expense.paidBy ?? null,
        })
        .select("id"),
    );
  },
});

/** Supabase-backed budget store shared by every member of the Voyage. */
export const createSupabaseExpensesStore = (client: SupabaseClientLike): ExpensesStore =>
  createStore(client);
