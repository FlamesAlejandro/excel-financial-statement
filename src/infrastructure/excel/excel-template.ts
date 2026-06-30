import type { FinanceWorkbook } from '../../domain/finance/types'
import { createEmptyFinanceWorkbook } from '../../domain/finance/factories'

export function createDefaultFinanceWorkbook(): FinanceWorkbook {
  return createEmptyFinanceWorkbook()
}
