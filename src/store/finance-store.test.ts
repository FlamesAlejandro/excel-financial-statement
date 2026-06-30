import { beforeEach, describe, expect, it } from 'vitest'

import { useFinanceStore } from './finance-store'

function addMonths(
  year: number,
  month: number,
  offset: number
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + offset
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1
  }
}

describe('finance store salary updates', () => {
  beforeEach(() => {
    useFinanceStore.getState().resetToEmptyWorkbook()
  })

  it('actualiza sueldo solo en el mes seleccionado', () => {
    const state = useFinanceStore.getState()
    const baseMonth = state.workbook.months[0]
    const nextMonth = addMonths(baseMonth.year, baseMonth.month, 1)

    state.createMonth(nextMonth.year, nextMonth.month)

    const months = useFinanceStore.getState().workbook.months
    const base = months.find(
      (month) =>
        month.year === baseMonth.year && month.month === baseMonth.month
    )
    const next = months.find(
      (month) =>
        month.year === nextMonth.year && month.month === nextMonth.month
    )

    expect(base).toBeDefined()
    expect(next).toBeDefined()

    useFinanceStore.getState().updateMonthBaseSalary(base!.id, 900_000)

    const updatedMonths = useFinanceStore.getState().workbook.months
    const updatedBase = updatedMonths.find((month) => month.id === base!.id)
    const updatedNext = updatedMonths.find((month) => month.id === next!.id)

    expect(updatedBase?.baseSalary).toBe(900_000)
    expect(updatedNext?.baseSalary).toBe(next?.baseSalary)
  })

  it('actualiza sueldo desde un mes hacia adelante', () => {
    const state = useFinanceStore.getState()
    const baseMonth = state.workbook.months[0]
    const nextMonth = addMonths(baseMonth.year, baseMonth.month, 1)
    const nextNextMonth = addMonths(baseMonth.year, baseMonth.month, 2)

    state.createMonth(nextMonth.year, nextMonth.month)
    state.createMonth(nextNextMonth.year, nextNextMonth.month)

    const months = useFinanceStore.getState().workbook.months
    const base = months.find(
      (month) =>
        month.year === baseMonth.year && month.month === baseMonth.month
    )
    const next = months.find(
      (month) =>
        month.year === nextMonth.year && month.month === nextMonth.month
    )
    const nextNext = months.find(
      (month) =>
        month.year === nextNextMonth.year && month.month === nextNextMonth.month
    )

    expect(base).toBeDefined()
    expect(next).toBeDefined()
    expect(nextNext).toBeDefined()

    useFinanceStore.getState().updateMonthBaseSalary(base!.id, 700_000)
    useFinanceStore.getState().updateMonthBaseSalary(next!.id, 800_000)
    useFinanceStore.getState().updateMonthBaseSalary(nextNext!.id, 900_000)

    useFinanceStore
      .getState()
      .updateMonthBaseSalaryFromMonthForward(next!.id, 1_100_000)

    const updatedMonths = useFinanceStore.getState().workbook.months
    const updatedBase = updatedMonths.find((month) => month.id === base!.id)
    const updatedNext = updatedMonths.find((month) => month.id === next!.id)
    const updatedNextNext = updatedMonths.find(
      (month) => month.id === nextNext!.id
    )

    expect(updatedBase?.baseSalary).toBe(700_000)
    expect(updatedNext?.baseSalary).toBe(1_100_000)
    expect(updatedNextNext?.baseSalary).toBe(1_100_000)
  })
})
