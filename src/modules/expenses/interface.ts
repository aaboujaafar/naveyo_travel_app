import type { ISO4217, Money, UUID } from "../_shared/model";
import type { AddExpenseInput, Budget, BudgetSummary, Expense } from "./model";

export interface ExchangeRateProvider {
  convert(input: {
    amount: Money;
    targetCurrency: ISO4217;
    on: string;
  }): Promise<MoneyConversion>;
}

export interface MoneyConversion {
  original: Money;
  converted: Money;
  source: string;
  rateDate: string;
}

export interface ExpensesStore {
  getBudget(tripId: UUID): Promise<Budget | null>;
  saveBudget(budget: Budget): Promise<void>;
  listExpenses(tripId: UUID): Promise<Expense[]>;
  saveExpense(expense: Expense): Promise<void>;
}

export interface ExpensesModule {
  getBudget(tripId: UUID): Promise<Budget | null>;
  setBudget(tripId: UUID, money: Money): Promise<Budget>;
  list(tripId: UUID): Promise<Expense[]>;
  add(input: AddExpenseInput): Promise<Expense>;
  summarize(tripId: UUID): Promise<BudgetSummary | null>;
}

export type { AddExpenseInput, Budget, BudgetSummary, Expense, Money };
