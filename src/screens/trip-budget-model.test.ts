import { describe, expect, it } from "vitest";
import type { Expense } from "../modules/expenses";
import type { ISO4217 } from "../modules/_shared/model";
import { formatExpenseDate, formatMoney, parseMoneyInput, summarizeExpenseCategories } from "./trip-budget-model";

const currency = "EUR" as ISO4217;

describe("trip budget model", () => {
  it("reads amounts typed in euros as minor units", () => {
    expect(parseMoneyInput("1 000")).toBe(100000);
    expect(parseMoneyInput("12,5")).toBe(1250);
    expect(parseMoneyInput("12.05 €")).toBe(1205);
    expect(parseMoneyInput("0")).toBeNull();
    expect(parseMoneyInput("12,345")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
  });

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
