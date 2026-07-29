import type { Budget, Expense, Money, UUID } from '../_shared/model'
export interface ExpensesModule { getBudget(tripId: UUID): Promise<Budget | null>; setBudget(tripId: UUID, money: Money): Promise<Budget>; list(tripId: UUID): Promise<Expense[]>; add(input: Omit<Expense, 'id'>): Promise<Expense> }
export interface ExchangeRateProvider { convert(input: { amount: Money; targetCurrency: string; on: string }): Promise<MoneyConversion> }
export interface MoneyConversion { original: Money; converted: Money; source: string; rateDate: string }
