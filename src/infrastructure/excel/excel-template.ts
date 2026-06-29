import type { FinanceWorkbook } from '../../domain/finance/types'
import { EXCEL_FORMAT_VERSION } from './excel-version'

export function createDefaultFinanceWorkbook(): FinanceWorkbook {
  const nowIso = new Date().toISOString()

  return {
    metadata: {
      appName: 'Estado Financiero',
      formatVersion: EXCEL_FORMAT_VERSION,
      createdAt: nowIso,
      updatedAt: nowIso
    },
    settings: {
      currency: 'CLP',
      locale: 'es-CL',
      defaultBaseSalary: 1200000
    },
    paymentMethods: [],
    fixedExpenses: [],
    months: []
  }
}
