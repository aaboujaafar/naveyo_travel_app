import { describe, expect, it } from "vitest";
import { createSupabaseExpensesStore } from ".";
import type { SupabaseQuery, SupabaseResponse } from "../identity/client";
import type { UUID } from "../../../modules/_shared/model";

const tripId = "10000000-0000-4000-8000-000000000001" as UUID;
const expenseId = "30000000-0000-4000-8000-000000000003" as UUID;

type Call = { table: string; op: string; values?: unknown };

function fakeClient(respond: (call: Call) => SupabaseResponse) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, op: "select" };
    calls.push(call);
    const chain: SupabaseQuery = {
      then: (resolve, reject) => Promise.resolve(respond(call)).then(resolve, reject),
      select: () => chain,
      insert: (values) => { call.op = "insert"; call.values = values; return chain; },
      update: (values) => { call.op = "update"; call.values = values; return chain; },
      eq: () => chain,
      order: () => chain,
      single: () => chain,
    };
    return chain;
  };
  return { client: { auth: {}, from, rpc: () => undefined } as never, calls };
}

describe("Supabase expenses store", () => {
  it("inserts a budget when no row exists yet", async () => {
    const { client, calls } = fakeClient((call) =>
      call.op === "update" ? { data: [], error: null } : { data: [{ trip_id: tripId }], error: null },
    );
    await createSupabaseExpensesStore(client).saveBudget({
      tripId,
      planned: { minorUnits: 150_000, currency: "EUR" as never },
    });
    expect(calls.map((call) => call.op)).toEqual(["update", "insert"]);
    expect(calls[1]?.values).toMatchObject({ trip_id: tripId, amount_minor: 150_000, currency: "EUR" });
  });

  it("round-trips expenses through the table columns", async () => {
    const row = {
      id: expenseId,
      trip_id: tripId,
      label: "Dîner",
      category: "food",
      note: null,
      amount_minor: 4_500,
      currency: "EUR",
      reference_amount_minor: 4_500,
      reference_currency: "EUR",
      exchange_rate_source: "not-applicable",
      exchange_rate_date: "2026-09-05",
      spent_on: "2026-09-05",
      paid_by_account_id: null,
    };
    const { client, calls } = fakeClient((call) =>
      call.op === "insert" ? { data: [{ id: expenseId }], error: null } : { data: [row], error: null },
    );
    const store = createSupabaseExpensesStore(client);
    const [expense] = await store.listExpenses(tripId);
    expect(expense).toMatchObject({ id: expenseId, label: "Dîner", category: "food", original: { minorUnits: 4_500 }, occurredOn: "2026-09-05" });

    await store.saveExpense(expense!);
    expect(calls.at(-1)?.values).toMatchObject({ label: "Dîner", amount_minor: 4_500, spent_on: "2026-09-05", exchange_rate: null });
  });
});
