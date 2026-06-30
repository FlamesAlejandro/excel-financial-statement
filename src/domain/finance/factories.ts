import { getMonthLabel } from '../../lib/date'
import { createId } from '../../lib/ids'
import type { FinanceWorkbook, MonthFinance, MonthNumber } from './types'

const APP_NAME = 'Estado Financiero'
const FORMAT_VERSION = '1.0.0'

type CreateEmptyFinanceWorkbookOptions = {
  initialYear?: number
  initialMonth?: number
}

function isValidMonthNumber(month: number): month is MonthNumber {
  return Number.isInteger(month) && month >= 1 && month <= 12
}

function createInitialMonth(params: {
  nowIso: string
  initialYear?: number
  initialMonth?: number
}): MonthFinance {
  const now = new Date()
  const safeYear =
    Number.isInteger(params.initialYear) && params.initialYear
      ? params.initialYear
      : now.getFullYear()
  const fallbackMonth = (now.getMonth() + 1) as MonthNumber
  const initialMonthCandidate = params.initialMonth ?? Number.NaN
  const safeMonth = isValidMonthNumber(initialMonthCandidate)
    ? initialMonthCandidate
    : fallbackMonth

  return {
    id: createId('month'),
    year: safeYear,
    month: safeMonth,
    label: getMonthLabel(safeYear, safeMonth),
    baseSalary: 0,
    extraIncomes: [],
    expenses: [],
    installmentExpenses: [],
    createdAt: params.nowIso,
    updatedAt: params.nowIso
  }
}

export function createEmptyFinanceWorkbook(
  options: CreateEmptyFinanceWorkbookOptions = {}
): FinanceWorkbook {
  const nowIso = new Date().toISOString()
  const initialMonth = createInitialMonth({
    nowIso,
    initialYear: options.initialYear,
    initialMonth: options.initialMonth
  })

  return {
    metadata: {
      appName: APP_NAME,
      formatVersion: FORMAT_VERSION,
      createdAt: nowIso,
      updatedAt: nowIso
    },
    settings: {
      currency: 'CLP',
      locale: 'es-CL',
      defaultBaseSalary: 0
    },
    paymentMethods: [],
    fixedExpenses: [],
    months: [initialMonth]
  }
}
