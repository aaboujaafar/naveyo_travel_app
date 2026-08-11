import { describe, expect, it } from "vitest";
import type { Expense } from "../modules/expenses";
import type { ISO4217 } from "../modules/_shared/model";
import { formatExpenseDate, formatMoney, summarizeExpenseCategories } from "./trip-budget-model";

const currency = "EUR" as ISO4217;

describe("trip budget model", () => {
  it("formats integer minor units", () => {
    expect(formatMoney({ minorUnits: 123456, currency })).toContain("1 234,56");
  });

  it("summarizes reference amounts without deriving debts", () => {
    const expenses = [
      { category: "food", reference: { minorUnits: 3000, currency } },
      { category: "transport", reference: { minorUnits: 1000, currency } },
    ] as Expense[];
    const summaries = summarizeExpenseCategories(expenses);
    expect(summaries.find((item) => item.category === "food")?.share).toBe(0.75);
    expect(summaries.find((item) => item.category === "transport")?.minorUnits).toBe(1000);
  });

  it("formats local dates independently from the device timezone", () => {
    expect(formatExpenseDate("2026-08-10")).toBe("10 août");
  });
});
