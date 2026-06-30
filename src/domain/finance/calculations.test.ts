import { describe, expect, it } from 'vitest'

import {
  buildFinanceSummary,
  getExtraIncomeTotal,
  getInstallmentChargesForMonth,
  getNormalExpensesTotal,
  getRemainingMoneyForMonth,
  getTotalAvailableForMonth,
  getTotalExpensesForMonth
} from './calculations'
import type {
  FixedExpense,
  MonthFinance,
  MonthNumber,
  PaymentMethod
} from './types'

type CreateMonthInput = {
  id: string
  year: number
  month: MonthNumber
  label: string
  baseSalary: number
}

function createMonth(input: CreateMonthInput): MonthFinance {
  const now = '2026-06-01T00:00:00.000Z'

  return {
    id: input.id,
    year: input.year,
    month: input.month,
    label: input.label,
    baseSalary: input.baseSalary,
    extraIncomes: [],
    expenses: [],
    installmentExpenses: [],
    createdAt: now,
    updatedAt: now
  }
}

function createBaseData() {
  const june = createMonth({
    id: 'm_2026_06',
    year: 2026,
    month: 6,
    label: 'Junio 2026',
    baseSalary: 1_000_000
  })

  june.extraIncomes = [
    {
      id: 'inc_1',
      date: '2026-06-10T00:00:00.000Z',
      description: 'Freelance',
      amount: 200_000,
      createdAt: june.createdAt,
      updatedAt: june.updatedAt
    }
  ]

  june.expenses = [
    {
      id: 'exp_1',
      date: '2026-06-11T00:00:00.000Z',
      description: 'Supermercado',
      amount: 100_000,
      paymentMethodId: 'pm_debit',
      createdAt: june.createdAt,
      updatedAt: june.updatedAt
    }
  ]

  june.installmentExpenses = [
    {
      id: 'ins_1',
      purchaseDate: '2026-06-12T00:00:00.000Z',
      description: 'Notebook',
      totalAmount: 600_000,
      installmentsCount: 6,
      installmentAmount: 100_000,
      paymentMethodId: 'pm_cc',
      isActive: true,
      createdAt: june.createdAt,
      updatedAt: june.updatedAt
    }
  ]

  const july = createMonth({
    id: 'm_2026_07',
    year: 2026,
    month: 7,
    label: 'Julio 2026',
    baseSalary: 1_000_000
  })

  const august = createMonth({
    id: 'm_2026_08',
    year: 2026,
    month: 8,
    label: 'Agosto 2026',
    baseSalary: 1_000_000
  })

  const november = createMonth({
    id: 'm_2026_11',
    year: 2026,
    month: 11,
    label: 'Noviembre 2026',
    baseSalary: 1_000_000
  })

  const december = createMonth({
    id: 'm_2026_12',
    year: 2026,
    month: 12,
    label: 'Diciembre 2026',
    baseSalary: 1_000_000
  })

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'pm_debit',
      name: 'Debito',
      type: 'debit',
      isActive: true,
      hasMonthlyFee: false,
      monthlyFeeAmount: 0,
      createdAt: june.createdAt,
      updatedAt: june.updatedAt
    },
    {
      id: 'pm_cc',
      name: 'Tarjeta',
      type: 'credit_card',
      isActive: true,
      hasMonthlyFee: true,
      monthlyFeeAmount: 5_000,
      createdAt: june.createdAt,
      updatedAt: june.updatedAt
    },
    {
      id: 'pm_transfer',
      name: 'Transferencia',
      type: 'transfer',
      isActive: true,
      hasMonthlyFee: false,
      monthlyFeeAmount: 9_999,
      createdAt: june.createdAt,
      updatedAt: june.updatedAt
    }
  ]

  const fixedExpenses: FixedExpense[] = [
    {
      id: 'fx_active',
      name: 'Internet',
      amount: 20_000,
      paymentMethodId: 'pm_transfer',
      startYear: 2026,
      startMonth: 6,
      isActive: true,
      createdAt: june.createdAt,
      updatedAt: june.updatedAt
    },
    {
      id: 'fx_inactive',
      name: 'Gym',
      amount: 30_000,
      paymentMethodId: 'pm_cc',
      startYear: 2026,
      startMonth: 6,
      isActive: false,
      createdAt: june.createdAt,
      updatedAt: june.updatedAt
    }
  ]

  const allMonths = [december, november, august, july, june]

  return {
    june,
    july,
    august,
    november,
    december,
    paymentMethods,
    fixedExpenses,
    allMonths
  }
}

describe('financial calculations', () => {
  it('calcula ingresos, disponible, gastos, restante y summary', () => {
    const { june, paymentMethods, fixedExpenses, allMonths } = createBaseData()

    expect(getExtraIncomeTotal(june)).toBe(200_000)
    expect(getNormalExpensesTotal(june)).toBe(100_000)
    expect(getTotalAvailableForMonth(june)).toBe(1_200_000)

    // 100_000 normales + 20_000 fijo activo + 5_000 cargo mensual + 100_000 cuota activa
    expect(
      getTotalExpensesForMonth(june, fixedExpenses, paymentMethods, allMonths)
    ).toBe(225_000)

    expect(
      getRemainingMoneyForMonth(june, fixedExpenses, paymentMethods, allMonths)
    ).toBe(975_000)

    const summary = buildFinanceSummary(
      june,
      fixedExpenses,
      paymentMethods,
      allMonths
    )

    expect(summary).toEqual({
      baseSalary: 1_000_000,
      extraIncomeTotal: 200_000,
      totalAvailable: 1_200_000,
      normalExpensesTotal: 100_000,
      fixedExpensesTotal: 20_000,
      paymentMethodsMonthlyFeesTotal: 5_000,
      installmentsTotal: 100_000,
      totalExpenses: 225_000,
      remainingMoney: 975_000
    })
  })

  it('no suma gastos fijos inactivos ni metodos sin cargo mensual', () => {
    const { june, paymentMethods, fixedExpenses, allMonths } = createBaseData()

    const totalExpenses = getTotalExpensesForMonth(
      june,
      fixedExpenses,
      paymentMethods,
      allMonths
    )

    // Si sumara el fijo inactivo (30_000) o el metodo sin fee (9_999), este valor cambiaria.
    expect(totalExpenses).toBe(225_000)
  })
})

describe('installment charges', () => {
  it('compra en junio 2026 de 6 cuotas aparece de 1/6 a 6/6 y no en diciembre', () => {
    const { june, july, august, november, december, allMonths } =
      createBaseData()

    const juneCharges = getInstallmentChargesForMonth(june, allMonths)
    expect(juneCharges).toHaveLength(1)
    expect(juneCharges[0].installmentNumber).toBe(1)
    expect(juneCharges[0].installmentsCount).toBe(6)

    const julyCharges = getInstallmentChargesForMonth(july, allMonths)
    expect(julyCharges).toHaveLength(1)
    expect(julyCharges[0].installmentNumber).toBe(2)

    const augustCharges = getInstallmentChargesForMonth(august, allMonths)
    expect(augustCharges).toHaveLength(1)
    expect(augustCharges[0].installmentNumber).toBe(3)

    const novemberCharges = getInstallmentChargesForMonth(november, allMonths)
    expect(novemberCharges).toHaveLength(1)
    expect(novemberCharges[0].installmentNumber).toBe(6)

    const decemberCharges = getInstallmentChargesForMonth(december, allMonths)
    expect(decemberCharges).toHaveLength(0)
  })

  it('cuota inactiva no aparece', () => {
    const { june, allMonths } = createBaseData()
    june.installmentExpenses[0].isActive = false

    const juneCharges = getInstallmentChargesForMonth(june, allMonths)
    expect(juneCharges).toHaveLength(0)
  })

  it('installmentsCount=1 genera solo un cargo en el mes de compra y no en meses siguientes', () => {
    const { june, july, allMonths } = createBaseData()
    june.installmentExpenses[0].installmentsCount = 1

    const juneCharges = getInstallmentChargesForMonth(june, allMonths)
    expect(juneCharges).toHaveLength(1)
    expect(juneCharges[0].installmentNumber).toBe(1)

    const julyCharges = getInstallmentChargesForMonth(july, allMonths)
    expect(julyCharges).toHaveLength(0)
  })
})

describe('fixed expense validity', () => {
  it('incluye gastos fijos solo dentro de su rango de vigencia', () => {
    const { june, july, august, paymentMethods, allMonths } = createBaseData()

    const fixedExpenses: FixedExpense[] = [
      {
        id: 'fx_july_only',
        name: 'Seguro',
        amount: 15_000,
        paymentMethodId: 'pm_cc',
        startYear: 2026,
        startMonth: 7,
        endYear: 2026,
        endMonth: 7,
        isActive: true,
        createdAt: june.createdAt,
        updatedAt: june.updatedAt
      },
      {
        id: 'fx_until_july',
        name: 'Streaming',
        amount: 10_000,
        paymentMethodId: 'pm_transfer',
        startYear: 2026,
        startMonth: 6,
        endYear: 2026,
        endMonth: 7,
        isActive: true,
        createdAt: june.createdAt,
        updatedAt: june.updatedAt
      }
    ]

    const juneSummary = buildFinanceSummary(
      june,
      fixedExpenses,
      paymentMethods,
      allMonths
    )
    expect(juneSummary.fixedExpensesTotal).toBe(10_000)

    const julySummary = buildFinanceSummary(
      july,
      fixedExpenses,
      paymentMethods,
      allMonths
    )
    expect(julySummary.fixedExpensesTotal).toBe(25_000)

    const augustSummary = buildFinanceSummary(
      august,
      fixedExpenses,
      paymentMethods,
      allMonths
    )
    expect(augustSummary.fixedExpensesTotal).toBe(0)
  })
})
