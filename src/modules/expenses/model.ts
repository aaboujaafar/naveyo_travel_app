import type { ISO4217, Money, UUID } from '../_shared/model'

export type ExpenseCategory = 'transport' | 'accommodation' | 'food' | 'activity' | 'shopping' | 'other'

export interface Budget {
  tripId: UUID
  planned: Money
}

export interface Expense {
  id: UUID
  tripId: UUID
  label: string
  category: ExpenseCategory
  note?: string
  original: Money
  reference: Money
  exchangeRateSource: 'manual' | 'provider' | 'not-applicable'
  exchangeRateDate?: string
  occurredOn: string
  paidBy?: UUID
}

export interface AddExpenseInput {
  tripId: UUID
  label: string
  category: ExpenseCategory
  note?: string
  original: Money
  occurredOn: string
  paidBy?: UUID
  manualConversion?: {
    reference: Money
    rateDate: string
  }
}

export interface BudgetSummary {
  planned: Money
  spent: Money
  remaining: Money
  progress: number
}

export type { ISO4217, Money, UUID }
