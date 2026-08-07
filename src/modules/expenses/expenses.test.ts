import { describe, expect, it } from "vitest";
import { FakeExchangeRateProvider } from "../../adapters/exchange-rates/fake";
import { uuid } from "../_shared/fake";
import type { ISO4217 } from "../_shared/model";
import { Expenses, InMemoryExpensesStore } from "./index";

const tripId = uuid("00000000-0000-4000-8000-000000000001");
const payerId = uuid("00000000-0000-4000-8000-000000000002");

const expenseInput = {
  tripId,
  label: "Train tickets",
  category: "transport" as const,
  original: { minorUnits: 2500, currency: "EUR" as ISO4217 },
  occurredOn: "2026-08-04",
  paidBy: payerId,
};

describe("Expenses module", () => {
  it("stores a reference-currency budget and calculates progress", async () => {
    const module = new Expenses(
      new InMemoryExpensesStore(),
      new FakeExchangeRateProvider(),
    );
    await module.setBudget(tripId, {
      minorUnits: 10000,
      currency: "EUR" as ISO4217,
    });
    const expense = await module.add(expenseInput);
    const summary = await module.summarize(tripId);

    expect(expense.reference).toEqual({ minorUnits: 2500, currency: "EUR" });
    expect(expense.exchangeRateSource).toBe("not-applicable");
    expect(summary).toEqual({
      planned: { minorUnits: 10000, currency: "EUR" },
      spent: { minorUnits: 2500, currency: "EUR" },
      remaining: { minorUnits: 7500, currency: "EUR" },
      progress: 0.25,
    });
  });

  it("converts using the provider and preserves source and rate date", async () => {
    const provider = new FakeExchangeRateProvider({
      original: { minorUnits: 1000, currency: "USD" as ISO4217 },
      converted: { minorUnits: 920, currency: "EUR" as ISO4217 },
      source: "ecb",
      rateDate: "2026-08-03",
    });
    const module = new Expenses(new InMemoryExpensesStore(), provider);
    await module.setBudget(tripId, {
      minorUnits: 10000,
      currency: "EUR" as ISO4217,
    });
    const expense = await module.add({
      ...expenseInput,
      original: { minorUnits: 1000, currency: "USD" as ISO4217 },
    });

    expect(expense.reference).toEqual({ minorUnits: 920, currency: "EUR" });
    expect(expense.exchangeRateSource).toBe("provider");
    expect(expense.exchangeRateDate).toBe("2026-08-03");
    expect(provider.requests[0]).toEqual({
      amount: { minorUnits: 1000, currency: "USD" },
      targetCurrency: "EUR",
      on: "2026-08-04",
    });
  });

  it("accepts an explicit manual conversion without calling the provider", async () => {
    const provider = new FakeExchangeRateProvider(
      new Error("provider unavailable"),
    );
    const module = new Expenses(new InMemoryExpensesStore(), provider);
    await module.setBudget(tripId, {
      minorUnits: 10000,
      currency: "EUR" as ISO4217,
    });
    const expense = await module.add({
      ...expenseInput,
      original: { minorUnits: 1000, currency: "USD" as ISO4217 },
      manualConversion: {
        reference: { minorUnits: 930, currency: "EUR" as ISO4217 },
        rateDate: "2026-08-04",
      },
    });

    expect(expense.exchangeRateSource).toBe("manual");
    expect(expense.reference.minorUnits).toBe(930);
    expect(provider.requests).toHaveLength(0);
  });

  it("surfaces a missing rate instead of inventing a conversion", async () => {
    const module = new Expenses(
      new InMemoryExpensesStore(),
      new FakeExchangeRateProvider(),
    );
    await module.setBudget(tripId, {
      minorUnits: 10000,
      currency: "EUR" as ISO4217,
    });

    await expect(
      module.add({
        ...expenseInput,
        original: { minorUnits: 1000, currency: "USD" as ISO4217 },
      }),
    ).rejects.toThrow("No exchange rate available");
    expect(await module.list(tripId)).toEqual([]);
  });

  it("rejects invalid amounts and invalid dates", async () => {
    const module = new Expenses(
      new InMemoryExpensesStore(),
      new FakeExchangeRateProvider(),
    );
    await expect(
      module.setBudget(tripId, { minorUnits: -1, currency: "EUR" as ISO4217 }),
    ).rejects.toThrow("Invalid money");
    await expect(
      module.setBudget(tripId, {
        minorUnits: 10000,
        currency: "EUR" as ISO4217,
      }),
    ).resolves.toBeTruthy();
    await expect(
      module.add({ ...expenseInput, occurredOn: "04/08/2026" }),
    ).rejects.toThrow("Invalid expense date");
    await expect(
      module.add({
        ...expenseInput,
        original: { minorUnits: 0, currency: "EUR" as ISO4217 },
      }),
    ).rejects.toThrow("Expense amount must be positive");
  });
});
