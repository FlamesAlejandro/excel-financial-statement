import { describe, expect, it } from 'vitest'

import { createEmptyFinanceWorkbook } from './factories'

describe('createEmptyFinanceWorkbook', () => {
  it('crea workbook limpio con un mes inicial vacío', () => {
    const workbook = createEmptyFinanceWorkbook({
      initialYear: 2026,
      initialMonth: 6
    })

    expect(workbook.metadata.appName).toBe('Estado Financiero')
    expect(workbook.metadata.formatVersion).toBe('1.0.0')
    expect(workbook.settings.currency).toBe('CLP')
    expect(workbook.settings.locale).toBe('es-CL')
    expect(workbook.settings.defaultBaseSalary).toBe(0)

    expect(workbook.paymentMethods).toEqual([])
    expect(workbook.fixedExpenses).toEqual([])
    expect(workbook.months).toHaveLength(1)

    const [month] = workbook.months
    expect(month.year).toBe(2026)
    expect(month.month).toBe(6)
    expect(month.label).toBe('Junio 2026')
    expect(month.baseSalary).toBe(0)
    expect(month.extraIncomes).toEqual([])
    expect(month.expenses).toEqual([])
    expect(month.installmentExpenses).toEqual([])
  })
})
