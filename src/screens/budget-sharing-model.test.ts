import { describe, expect, it } from "vitest";
import type { BudgetSummary, Expense } from "../modules/expenses";
import type { ISO4217, UUID } from "../modules/_shared/model";
import { budgetAlerts, computeSharing } from "./budget-sharing-model";

const currency = "EUR" as ISO4217;
const alice = "00000000-0000-4000-8000-00000000000a" as UUID;
const bob = "00000000-0000-4000-8000-00000000000b" as UUID;
const carol = "00000000-0000-4000-8000-00000000000c" as UUID;
const expense = (minorUnits: number, paidBy?: UUID) => ({ reference: { minorUnits, currency }, paidBy }) as Expense;
const summary = (spent: number, planned: number) => ({ spent: { minorUnits: spent, currency }, planned: { minorUnits: planned, currency } }) as BudgetSummary;

describe("budget sharing", () => {
  it("splits equally and settles with the fewest transfers", () => {
    const result = computeSharing([expense(9000, alice), expense(3000, bob)], [alice, bob, carol]);
    expect(result.balances.map((item) => item.balanceMinorUnits)).toEqual([5000, -1000, -4000]);
    expect(result.settlements).toEqual([
      { from: carol, to: alice, minorUnits: 4000 },
      { from: bob, to: alice, minorUnits: 1000 },
    ]);
  });

  it("keeps cents exact and ignores expenses without a payer", () => {
    const result = computeSharing([expense(1000, alice), expense(500)], [alice, bob, carol]);
    expect(result.balances.reduce((sum, item) => sum + item.shareMinorUnits, 0)).toBe(1000);
    expect(result.balances.reduce((sum, item) => sum + item.balanceMinorUnits, 0)).toBe(0);
    expect(result.unassignedCount).toBe(1);
  });

  it("counts repayments already made", () => {
    const expenses = [expense(9000, alice), expense(3000, bob)];
    const partly = computeSharing(expenses, [alice, bob, carol], [{ from: carol, to: alice, minorUnits: 4000 }]);
    expect(partly.balances.map((item) => item.balanceMinorUnits)).toEqual([1000, -1000, 0]);
    expect(partly.settlements).toEqual([{ from: bob, to: alice, minorUnits: 1000 }]);
    const settled = computeSharing(expenses, [alice, bob, carol], [{ from: carol, to: alice, minorUnits: 4000 }, { from: bob, to: alice, minorUnits: 1000 }]);
    expect(settled.settlements).toEqual([]);
  });
});

describe("budget alerts", () => {
  it("warns near the limit and when the budget is exceeded", () => {
    expect(budgetAlerts({ summary: summary(500, 1000), today: "2026-10-02" })).toEqual([]);
    expect(budgetAlerts({ summary: summary(850, 1000), today: "2026-10-02" })[0]?.title).toBe("Budget presque atteint");
    expect(budgetAlerts({ summary: summary(1200, 1000), today: "2026-10-02" })).toEqual([
      { level: "danger", title: "Budget dépassé", message: "Dépassement de 20 % par rapport au budget prévu." },
    ]);
  });

  it("projects the spending pace during the Voyage", () => {
    const alerts = budgetAlerts({ summary: summary(500, 1000), startsOn: "2026-11-16", endsOn: "2026-11-20", today: "2026-11-17" });
    expect(alerts).toEqual([{ level: "warning", title: "Rythme de dépenses élevé", message: "À ce rythme, le Voyage coûtera environ 125 % du budget prévu." }]);
  });
});
