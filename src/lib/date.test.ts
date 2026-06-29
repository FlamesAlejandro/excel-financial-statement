import { describe, expect, it } from 'vitest'

import {
  addMonthsToYearMonth,
  getMonthLabel,
  isSameYearMonth,
  parseMonthLabel,
  sortYearMonthsDesc
} from './date'

describe('date helpers', () => {
  it('getMonthLabel genera Junio 2026', () => {
    expect(getMonthLabel(2026, 6)).toBe('Junio 2026')
  })

  it('parseMonthLabel parsea Julio 2026', () => {
    expect(parseMonthLabel('Julio 2026')).toEqual({ year: 2026, month: 7 })
  })

  it('sortYearMonthsDesc ordena julio antes que junio', () => {
    const sorted = sortYearMonthsDesc([
      { year: 2026, month: 6, id: 'junio' },
      { year: 2026, month: 7, id: 'julio' }
    ])

    expect(sorted.map((item) => item.id)).toEqual(['julio', 'junio'])
  })

  it('addMonthsToYearMonth suma 1 mes a diciembre 2026 => enero 2027', () => {
    expect(addMonthsToYearMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
  })

  it('addMonthsToYearMonth resta 1 mes a enero 2027 => diciembre 2026', () => {
    expect(addMonthsToYearMonth(2027, 1, -1)).toEqual({ year: 2026, month: 12 })
  })

  it('isSameYearMonth compara correctamente', () => {
    expect(isSameYearMonth(2026, 7, 2026, 7)).toBe(true)
    expect(isSameYearMonth(2026, 7, 2026, 6)).toBe(false)
  })
})
