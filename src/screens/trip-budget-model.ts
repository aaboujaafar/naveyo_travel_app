import type { Expense, ExpenseCategory, Money } from "../modules/expenses";

export const expenseCategories: readonly ExpenseCategory[] = [
  "accommodation",
  "food",
  "activity",
  "transport",
  "shopping",
  "other",
];

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  accommodation: "Hébergement",
  food: "Restaurants",
  activity: "Activités",
  transport: "Transport",
  shopping: "Achats",
  other: "Divers",
};

export interface ExpenseCategorySummary {
  category: ExpenseCategory;
  minorUnits: number;
  share: number;
}

export function summarizeExpenseCategories(
  expenses: readonly Expense[],
): ExpenseCategorySummary[] {
  const total = expenses.reduce(
    (sum, expense) => sum + expense.reference.minorUnits,
    0,
  );
  return expenseCategories.map((category) => {
    const minorUnits = expenses
      .filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + expense.reference.minorUnits, 0);
    return { category, minorUnits, share: total > 0 ? minorUnits / total : 0 };
  });
}

export function formatMoney(money: Money): string {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(money.minorUnits / 100)} ${money.currency}`;
}

export function formatExpenseDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}
