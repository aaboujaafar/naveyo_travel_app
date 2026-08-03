import { parseMoney, isCurrency, isLocalDate, isUuid } from '../_shared/validation'
import type { ISO4217, Money, UUID } from '../_shared/model'
import type { ExchangeRateProvider, ExpensesModule, ExpensesStore } from './interface'
import type { AddExpenseInput, Budget, BudgetSummary, Expense, ExpenseCategory } from './model'

const categories: readonly ExpenseCategory[] = ['transport', 'accommodation', 'food', 'activity', 'shopping', 'other']

const assertTripId = (tripId: UUID): void => {
  if (!isUuid(tripId)) throw new Error('Invalid trip id')
}

const assertMoney = (money: Money, name: string): void => {
  parseMoney(money)
  if (money.minorUnits <= 0 && name === 'expense') throw new Error('Expense amount must be positive')
}

const assertDate = (value: string, name: string): void => {
  if (!isLocalDate(value)) throw new Error(`Invalid ${name}`)
}

const makeId = (): UUID => {
  const random = globalThis.crypto?.randomUUID?.()
  if (random !== undefined && isUuid(random)) return random
  return '00000000-0000-4000-8000-000000000001' as UUID
}

export class Expenses implements ExpensesModule {
  constructor(
    private readonly store: ExpensesStore,
    private readonly exchangeRates: ExchangeRateProvider,
  ) {}

  async getBudget(tripId: UUID): Promise<Budget | null> {
    assertTripId(tripId)
    return this.store.getBudget(tripId)
  }

  async setBudget(tripId: UUID, money: Money): Promise<Budget> {
    assertTripId(tripId)
    assertMoney(money, 'budget')
    const budget = { tripId, planned: money }
    await this.store.saveBudget(budget)
    return budget
  }

  async list(tripId: UUID): Promise<Expense[]> {
    assertTripId(tripId)
    return this.store.listExpenses(tripId)
  }

  async add(input: AddExpenseInput): Promise<Expense> {
    this.assertInput(input)
    const budget = await this.store.getBudget(input.tripId)
    if (budget === null) throw new Error('Budget is required before adding an expense')

    const conversion = await this.resolveConversion(input.original, budget.planned.currency, input)
    const expense: Expense = {
      id: makeId(),
      tripId: input.tripId,
      label: input.label.trim(),
      category: input.category,
      note: input.note?.trim() || undefined,
      original: input.original,
      reference: conversion.converted,
      exchangeRateSource: conversion.source === 'not-applicable' ? 'not-applicable' : conversion.source === 'manual' ? 'manual' : 'provider',
      exchangeRateDate: conversion.rateDate,
      occurredOn: input.occurredOn,
      paidBy: input.paidBy,
    }
    await this.store.saveExpense(expense)
    return expense
  }

  async summarize(tripId: UUID): Promise<BudgetSummary | null> {
    const budget = await this.getBudget(tripId)
    if (budget === null) return null
    const expenses = await this.list(tripId)
    const spentMinorUnits = expenses.reduce((total, expense) => total + expense.reference.minorUnits, 0)
    const spent = { minorUnits: spentMinorUnits, currency: budget.planned.currency }
    return {
      planned: budget.planned,
      spent,
      remaining: { minorUnits: budget.planned.minorUnits - spentMinorUnits, currency: budget.planned.currency },
      progress: budget.planned.minorUnits === 0 ? 0 : spentMinorUnits / budget.planned.minorUnits,
    }
  }

  private assertInput(input: AddExpenseInput): void {
    assertTripId(input.tripId)
    if (input.label.trim().length === 0) throw new Error('Expense label is required')
    if (!categories.includes(input.category)) throw new Error('Invalid expense category')
    assertMoney(input.original, 'expense')
    assertDate(input.occurredOn, 'expense date')
    if (input.paidBy !== undefined && !isUuid(input.paidBy)) throw new Error('Invalid payer')
    if (input.manualConversion !== undefined) {
      assertMoney(input.manualConversion.reference, 'converted expense')
      assertDate(input.manualConversion.rateDate, 'exchange rate date')
    }
  }

  private async resolveConversion(amount: Money, targetCurrency: ISO4217, input: AddExpenseInput) {
    if (!isCurrency(targetCurrency)) throw new Error('Invalid budget currency')
    if (amount.currency === targetCurrency) {
      return { converted: amount, source: 'not-applicable', rateDate: undefined }
    }
    if (input.manualConversion !== undefined) {
      if (input.manualConversion.reference.currency !== targetCurrency) throw new Error('Manual conversion must use the budget currency')
      return { converted: input.manualConversion.reference, source: 'manual', rateDate: input.manualConversion.rateDate }
    }
    const conversion = await this.exchangeRates.convert({ amount, targetCurrency, on: input.occurredOn })
    if (conversion.original.currency !== amount.currency || conversion.original.minorUnits !== amount.minorUnits) throw new Error('Exchange provider returned a mismatched amount')
    if (conversion.converted.currency !== targetCurrency || conversion.converted.minorUnits < 0) throw new Error('Exchange provider returned an invalid conversion')
    assertDate(conversion.rateDate, 'exchange rate date')
    return conversion
  }
}
