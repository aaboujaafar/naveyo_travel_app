import type { BudgetSummary, Expense } from "../modules/expenses";
import type { UUID } from "../modules/_shared/model";

export interface MemberBalance {
  accountId: UUID;
  paidMinorUnits: number;
  shareMinorUnits: number;
  /** Positive: the others owe this member. Negative: this member owes. */
  balanceMinorUnits: number;
}

export interface Settlement {
  from: UUID;
  to: UUID;
  minorUnits: number;
}

/** Money a member already handed to another to settle the Voyage. */
export interface Repayment {
  from: UUID;
  to: UUID;
  minorUnits: number;
}

export interface SharingSummary {
  balances: MemberBalance[];
  settlements: Settlement[];
  /** Expenses without a payer cannot be shared and are left out. */
  unassignedCount: number;
}

/**
 * Splits every expense with a known payer equally between the members, in the
 * reference currency, takes the repayments already made into account, then
 * proposes the fewest transfers that settle everyone.
 */
export function computeSharing(expenses: readonly Expense[], memberIds: readonly UUID[], repayments: readonly Repayment[] = []): SharingSummary {
  const members = Array.from(new Set(memberIds));
  const paid = new Map(members.map((id) => [id, 0]));
  const share = new Map(members.map((id) => [id, 0]));
  let unassignedCount = 0;

  for (const expense of expenses) {
    if (!expense.paidBy || !paid.has(expense.paidBy) || members.length === 0) {
      unassignedCount += 1;
      continue;
    }
    const amount = expense.reference.minorUnits;
    paid.set(expense.paidBy, (paid.get(expense.paidBy) ?? 0) + amount);
    // Cents that do not divide evenly go to the first members, so the shares always add up.
    const base = Math.floor(amount / members.length);
    const remainder = amount - base * members.length;
    members.forEach((id, index) => share.set(id, (share.get(id) ?? 0) + base + (index < remainder ? 1 : 0)));
  }

  // Handing money over settles part of a debt: the payer's balance rises, the receiver's falls.
  const repaid = new Map(members.map((id) => [id, 0]));
  for (const repayment of repayments) {
    if (!repaid.has(repayment.from) || !repaid.has(repayment.to) || repayment.minorUnits <= 0) continue;
    repaid.set(repayment.from, (repaid.get(repayment.from) ?? 0) + repayment.minorUnits);
    repaid.set(repayment.to, (repaid.get(repayment.to) ?? 0) - repayment.minorUnits);
  }

  const balances = members.map((accountId) => {
    const paidMinorUnits = paid.get(accountId) ?? 0;
    const shareMinorUnits = share.get(accountId) ?? 0;
    return { accountId, paidMinorUnits, shareMinorUnits, balanceMinorUnits: paidMinorUnits - shareMinorUnits + (repaid.get(accountId) ?? 0) };
  });

  const creditors = balances.filter((item) => item.balanceMinorUnits > 0).map((item) => ({ id: item.accountId, left: item.balanceMinorUnits }));
  const debtors = balances.filter((item) => item.balanceMinorUnits < 0).map((item) => ({ id: item.accountId, left: -item.balanceMinorUnits }));
  creditors.sort((left, right) => right.left - left.left);
  debtors.sort((left, right) => right.left - left.left);

  const settlements: Settlement[] = [];
  let creditor = 0;
  let debtor = 0;
  while (creditor < creditors.length && debtor < debtors.length) {
    const amount = Math.min(creditors[creditor]!.left, debtors[debtor]!.left);
    if (amount > 0) settlements.push({ from: debtors[debtor]!.id, to: creditors[creditor]!.id, minorUnits: amount });
    creditors[creditor]!.left -= amount;
    debtors[debtor]!.left -= amount;
    if (creditors[creditor]!.left === 0) creditor += 1;
    if (debtors[debtor]!.left === 0) debtor += 1;
  }

  return { balances, settlements, unassignedCount };
}

export interface BudgetAlert {
  level: "danger" | "warning";
  title: string;
  message: string;
}

/** Plain-language alerts on the global budget, including a projection while the Voyage runs. */
export function budgetAlerts(input: {
  summary: BudgetSummary | null;
  startsOn?: string;
  endsOn?: string;
  today: string;
}): BudgetAlert[] {
  const summary = input.summary;
  if (!summary || summary.planned.minorUnits <= 0) return [];
  const spent = summary.spent.minorUnits;
  const planned = summary.planned.minorUnits;
  if (spent > planned) {
    return [{ level: "danger", title: "Budget dépassé", message: `Dépassement de ${percent((spent - planned) / planned)} par rapport au budget prévu.` }];
  }

  const alerts: BudgetAlert[] = [];
  if (spent >= planned * 0.8) {
    alerts.push({ level: "warning", title: "Budget presque atteint", message: `${percent(spent / planned)} du budget est déjà dépensé.` });
  }
  if (input.startsOn && input.endsOn && input.startsOn <= input.today && input.today <= input.endsOn) {
    const elapsed = days(input.startsOn, input.today) + 1;
    const total = days(input.startsOn, input.endsOn) + 1;
    const projected = Math.round((spent / elapsed) * total);
    if (elapsed < total && projected > planned) {
      alerts.push({ level: "warning", title: "Rythme de dépenses élevé", message: `À ce rythme, le Voyage coûtera environ ${percent(projected / planned)} du budget prévu.` });
    }
  }
  return alerts;
}

function days(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function percent(value: number): string {
  return `${Math.round(value * 100)} %`;
}
