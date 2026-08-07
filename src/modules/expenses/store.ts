import type { UUID } from "../_shared/model";
import type { Budget, Expense } from "./model";
import type { ExpensesStore } from "./interface";

export class InMemoryExpensesStore implements ExpensesStore {
  private budget: Budget | null = null;
  private expenses: Expense[] = [];

  async getBudget(tripId: UUID): Promise<Budget | null> {
    return this.budget?.tripId === tripId ? structuredClone(this.budget) : null;
  }

  async saveBudget(budget: Budget): Promise<void> {
    this.budget = structuredClone(budget);
  }

  async listExpenses(tripId: UUID): Promise<Expense[]> {
    return structuredClone(
      this.expenses.filter((expense) => expense.tripId === tripId),
    );
  }

  async saveExpense(expense: Expense): Promise<void> {
    if (this.expenses.some((existing) => existing.id === expense.id))
      throw new Error("Expense already exists");
    this.expenses = [...this.expenses, structuredClone(expense)];
  }
}
