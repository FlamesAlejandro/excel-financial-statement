import * as XLSX from 'xlsx'

import { buildFinanceSummary } from '../../domain/finance/calculations'
import type { FinanceWorkbook, MonthFinance } from '../../domain/finance/types'
import { sortYearMonthsDesc } from '../../lib/date'
import { EXCEL_FORMAT_VERSION } from './excel-version'

function toCellValue(value: unknown): string | number | boolean {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return value
  }

  return ''
}

function sanitizeSheetName(name: string): string {
  const sanitized = name.replace(/[[\]\\/?*:]/g, ' ').trim()
  return (sanitized || 'Mes').slice(0, 31)
}

function createUniqueSheetName(name: string, usedNames: Set<string>): string {
  const base = sanitizeSheetName(name)
  if (!usedNames.has(base)) {
    usedNames.add(base)
    return base
  }

  let counter = 2
  while (counter < 1000) {
    const suffix = ` (${counter})`
    const candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate)
      return candidate
    }

    counter += 1
  }

  const fallback = `Hoja ${usedNames.size + 1}`
  usedNames.add(fallback)
  return fallback
}

function buildSummaryRows(workbook: FinanceWorkbook) {
  const months = sortYearMonthsDesc(workbook.months)

  return months.map((month) => {
    const summary = buildFinanceSummary(
      month,
      workbook.fixedExpenses,
      workbook.paymentMethods,
      workbook.months
    )

    return {
      Mes: month.label,
      Año: month.year,
      'Número Mes': month.month,
      'Sueldo base': summary.baseSalary,
      'Ingresos adicionales': summary.extraIncomeTotal,
      'Total disponible': summary.totalAvailable,
      'Gastos normales': summary.normalExpensesTotal,
      'Gastos fijos': summary.fixedExpensesTotal,
      'Cargos fijos métodos de pago': summary.paymentMethodsMonthlyFeesTotal,
      'Cuotas activas': summary.installmentsTotal,
      'Total gastado': summary.totalExpenses,
      'Dinero restante': summary.remainingMoney
    }
  })
}

function buildMonthSheetRows(
  month: MonthFinance
): Array<Array<string | number | boolean>> {
  const extraIncomeRows = month.extraIncomes.map((income) => [
    toCellValue(income.id),
    toCellValue(income.date),
    toCellValue(income.description),
    toCellValue(income.amount),
    toCellValue(income.source),
    toCellValue(income.notes),
    toCellValue(income.createdAt),
    toCellValue(income.updatedAt)
  ])

  const expenseRows = month.expenses.map((expense) => [
    toCellValue(expense.id),
    toCellValue(expense.date),
    toCellValue(expense.description),
    toCellValue(expense.amount),
    toCellValue(expense.paymentMethodId),
    toCellValue(expense.category),
    toCellValue(expense.notes),
    toCellValue(expense.createdAt),
    toCellValue(expense.updatedAt)
  ])

  const installmentRows = month.installmentExpenses.map((installment) => [
    toCellValue(installment.id),
    toCellValue(installment.purchaseDate),
    toCellValue(installment.description),
    toCellValue(installment.totalAmount),
    toCellValue(installment.installmentsCount),
    toCellValue(installment.installmentAmount),
    toCellValue(installment.paymentMethodId),
    toCellValue(installment.category),
    toCellValue(installment.notes),
    toCellValue(installment.isActive),
    toCellValue(installment.createdAt),
    toCellValue(installment.updatedAt)
  ])

  return [
    ['Sueldo base'],
    ['baseSalary'],
    [toCellValue(month.baseSalary)],
    [],
    ['Ingresos adicionales'],
    [
      'id',
      'date',
      'description',
      'amount',
      'source',
      'notes',
      'createdAt',
      'updatedAt'
    ],
    ...extraIncomeRows,
    [],
    ['Gastos normales'],
    [
      'id',
      'date',
      'description',
      'amount',
      'paymentMethodId',
      'category',
      'notes',
      'createdAt',
      'updatedAt'
    ],
    ...expenseRows,
    [],
    ['Gastos en cuotas'],
    [
      'id',
      'purchaseDate',
      'description',
      'totalAmount',
      'installmentsCount',
      'installmentAmount',
      'paymentMethodId',
      'category',
      'notes',
      'isActive',
      'createdAt',
      'updatedAt'
    ],
    ...installmentRows
  ]
}

export function buildExcelWorkbook(workbook: FinanceWorkbook): XLSX.WorkBook {
  const xlsxWorkbook = XLSX.utils.book_new()
  const sheetNames = new Set<string>()
  const exportedAt = new Date().toISOString()

  const summarySheet = XLSX.utils.json_to_sheet(buildSummaryRows(workbook))
  XLSX.utils.book_append_sheet(
    xlsxWorkbook,
    summarySheet,
    createUniqueSheetName('Resumen', sheetNames)
  )

  const configSheet = XLSX.utils.json_to_sheet([
    {
      appName: workbook.metadata.appName,
      formatVersion: workbook.metadata.formatVersion || EXCEL_FORMAT_VERSION,
      exportedAt,
      locale: workbook.settings.locale,
      currency: workbook.settings.currency,
      defaultBaseSalary: workbook.settings.defaultBaseSalary
    }
  ])
  XLSX.utils.book_append_sheet(
    xlsxWorkbook,
    configSheet,
    createUniqueSheetName('Config', sheetNames)
  )

  const paymentMethodsSheet = XLSX.utils.json_to_sheet(
    workbook.paymentMethods.map((method) => ({
      id: method.id,
      name: method.name,
      type: method.type,
      isActive: method.isActive,
      hasMonthlyFee: method.hasMonthlyFee,
      monthlyFeeAmount: method.monthlyFeeAmount,
      notes: method.notes || '',
      createdAt: method.createdAt,
      updatedAt: method.updatedAt
    }))
  )
  XLSX.utils.book_append_sheet(
    xlsxWorkbook,
    paymentMethodsSheet,
    createUniqueSheetName('MetodosPago', sheetNames)
  )

  const fixedExpensesSheet = XLSX.utils.json_to_sheet(
    workbook.fixedExpenses.map((fixedExpense) => ({
      id: fixedExpense.id,
      name: fixedExpense.name,
      amount: fixedExpense.amount,
      paymentMethodId: fixedExpense.paymentMethodId,
      estimatedChargeDay: fixedExpense.estimatedChargeDay ?? '',
      isActive: fixedExpense.isActive,
      notes: fixedExpense.notes || '',
      createdAt: fixedExpense.createdAt,
      updatedAt: fixedExpense.updatedAt
    }))
  )
  XLSX.utils.book_append_sheet(
    xlsxWorkbook,
    fixedExpensesSheet,
    createUniqueSheetName('GastosFijos', sheetNames)
  )

  sortYearMonthsDesc(workbook.months).forEach((month) => {
    const monthSheet = XLSX.utils.aoa_to_sheet(buildMonthSheetRows(month))
    XLSX.utils.book_append_sheet(
      xlsxWorkbook,
      monthSheet,
      createUniqueSheetName(month.label, sheetNames)
    )
  })

  return xlsxWorkbook
}
