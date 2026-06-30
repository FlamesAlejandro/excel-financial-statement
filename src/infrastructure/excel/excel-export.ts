import * as XLSX from 'xlsx'

import { buildFinanceSummary } from '../../domain/finance/calculations'
import type { FinanceWorkbook, MonthFinance } from '../../domain/finance/types'
import { sortYearMonthsDesc } from '../../lib/date'
import { formatLocalDate, formatLocalDateFromIso } from './excel-date'
import { EXCEL_FORMAT_VERSION } from './excel-version'

const CLP_FORMAT = '$ #,##0'
const CLP_NEGATIVE_HIGHLIGHT_FORMAT = '$ #,##0;[Red]-$ #,##0'
type ExcelCell = XLSX.CellObject & {
  s?: Record<string, unknown>
}

function toCellValue(value: unknown): string | number | boolean {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return value
  }

  return ''
}

function getPaymentMethodNameById(
  workbook: FinanceWorkbook
): Record<string, string> {
  return workbook.paymentMethods.reduce<Record<string, string>>(
    (acc, paymentMethod) => {
      acc[paymentMethod.id] = paymentMethod.name
      return acc
    },
    {}
  )
}

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]): void {
  sheet['!cols'] = widths.map((width) => ({ wch: width }))
}

function setFreezeRows(sheet: XLSX.WorkSheet, rows: number): void {
  ;(sheet as XLSX.WorkSheet & { '!freeze'?: Record<string, unknown> })[
    '!freeze'
  ] = {
    xSplit: 0,
    ySplit: rows,
    topLeftCell: `A${rows + 1}`,
    activePane: 'bottomLeft',
    state: 'frozen'
  }
}

function getOrCreateCell(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number
): ExcelCell {
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
  const existing = sheet[cellAddress] as ExcelCell | undefined
  if (existing) {
    return existing
  }

  const cell: ExcelCell = { t: 's', v: '' }
  sheet[cellAddress] = cell
  return cell
}

function applyStyleToRange(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range,
  style: Record<string, unknown>
): void {
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cell = getOrCreateCell(sheet, row, col)
      cell.s = {
        ...(cell.s ?? {}),
        ...style
      }
    }
  }
}

function applyHeaderRowStyle(
  sheet: XLSX.WorkSheet,
  row: number,
  fromCol: number,
  toCol: number
): void {
  applyStyleToRange(
    sheet,
    { s: { r: row, c: fromCol }, e: { r: row, c: toCol } },
    {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F4E78' } },
      border: {
        top: { style: 'thin', color: { rgb: 'D9D9D9' } },
        left: { style: 'thin', color: { rgb: 'D9D9D9' } },
        right: { style: 'thin', color: { rgb: 'D9D9D9' } },
        bottom: { style: 'thin', color: { rgb: 'D9D9D9' } }
      }
    }
  )
}

function applySoftBorders(sheet: XLSX.WorkSheet): void {
  const reference = sheet['!ref']
  if (!reference) {
    return
  }

  const range = XLSX.utils.decode_range(reference)
  applyStyleToRange(sheet, range, {
    border: {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } }
    }
  })
}

function applyNumberFormatByColumn(
  sheet: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  col: number,
  format: string
): void {
  for (let row = startRow; row <= endRow; row += 1) {
    const cell = getOrCreateCell(sheet, row, col)
    cell.z = format
  }
}

const formatDateDisplay = (isoDate: string): string =>
  formatLocalDateFromIso(isoDate)

type SummaryDataRow = {
  label: string
  year: number
  month: number
  baseSalary: number
  extraIncomeTotal: number
  totalAvailable: number
  normalExpensesTotal: number
  fixedExpensesTotal: number
  paymentMethodsMonthlyFeesTotal: number
  installmentsTotal: number
  totalExpenses: number
  remainingMoney: number
}

function buildSummaryRows(workbook: FinanceWorkbook): SummaryDataRow[] {
  const months = sortYearMonthsDesc(workbook.months)

  return months.map((month) => {
    const summary = buildFinanceSummary(
      month,
      workbook.fixedExpenses,
      workbook.paymentMethods,
      workbook.months
    )

    return {
      label: month.label,
      year: month.year,
      month: month.month,
      baseSalary: summary.baseSalary,
      extraIncomeTotal: summary.extraIncomeTotal,
      totalAvailable: summary.totalAvailable,
      normalExpensesTotal: summary.normalExpensesTotal,
      fixedExpensesTotal: summary.fixedExpensesTotal,
      paymentMethodsMonthlyFeesTotal: summary.paymentMethodsMonthlyFeesTotal,
      installmentsTotal: summary.installmentsTotal,
      totalExpenses: summary.totalExpenses,
      remainingMoney: summary.remainingMoney
    }
  })
}

function buildSummarySheet(
  workbook: FinanceWorkbook,
  exportedAt: string
): XLSX.WorkSheet {
  const rows = buildSummaryRows(workbook)
  const headerRow = [
    'Mes',
    'Año',
    'Número Mes',
    'Sueldo base',
    'Ingresos adicionales',
    'Total disponible',
    'Gastos normales',
    'Gastos fijos',
    'Cargos fijos métodos de pago',
    'Cuotas activas',
    'Total gastado',
    'Dinero restante'
  ]

  const matrix: Array<Array<string | number>> = [
    ['Estado Financiero'],
    [`Fecha de exportación: ${formatDateDisplay(exportedAt)}`],
    [],
    headerRow,
    ...rows.map((row) => [
      row.label,
      row.year,
      row.month,
      row.baseSalary,
      row.extraIncomeTotal,
      row.totalAvailable,
      row.normalExpensesTotal,
      row.fixedExpensesTotal,
      row.paymentMethodsMonthlyFeesTotal,
      row.installmentsTotal,
      row.totalExpenses,
      row.remainingMoney
    ])
  ]

  const sheet = XLSX.utils.aoa_to_sheet(matrix)
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }]

  const titleCell = getOrCreateCell(sheet, 0, 0)
  titleCell.s = {
    font: { bold: true, sz: 18, color: { rgb: '1F2937' } }
  }

  const metadataCell = getOrCreateCell(sheet, 1, 0)
  metadataCell.s = {
    font: { italic: true, color: { rgb: '4B5563' } }
  }

  applyHeaderRowStyle(sheet, 3, 0, 11)
  applySoftBorders(sheet)
  setColumnWidths(sheet, [18, 8, 12, 14, 18, 16, 15, 12, 24, 14, 14, 16])
  setFreezeRows(sheet, 4)

  const firstDataRow = 4
  const lastDataRow = firstDataRow + rows.length - 1
  if (lastDataRow >= firstDataRow) {
    for (let col = 3; col <= 10; col += 1) {
      applyNumberFormatByColumn(
        sheet,
        firstDataRow,
        lastDataRow,
        col,
        CLP_FORMAT
      )
    }
    applyNumberFormatByColumn(
      sheet,
      firstDataRow,
      lastDataRow,
      11,
      CLP_NEGATIVE_HIGHLIGHT_FORMAT
    )
  }

  ;(sheet as XLSX.WorkSheet & { '!autofilter'?: { ref: string } })[
    '!autofilter'
  ] = { ref: `A4:L${Math.max(4, lastDataRow + 1)}` }

  return sheet
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

function buildMonthSheet(
  workbook: FinanceWorkbook,
  month: MonthFinance,
  exportedAt: string
): XLSX.WorkSheet {
  const summary = buildFinanceSummary(
    month,
    workbook.fixedExpenses,
    workbook.paymentMethods,
    workbook.months
  )
  const paymentMethodNameById = getPaymentMethodNameById(workbook)

  const extraIncomeRows = month.extraIncomes.map((income) => [
    toCellValue(income.id),
    toCellValue(formatDateDisplay(income.date)),
    toCellValue(income.description),
    toCellValue(income.amount),
    toCellValue(income.source),
    toCellValue(income.notes),
    toCellValue(income.createdAt),
    toCellValue(income.updatedAt)
  ])

  const expenseRows = month.expenses.map((expense) => [
    toCellValue(expense.id),
    toCellValue(formatDateDisplay(expense.date)),
    toCellValue(expense.description),
    toCellValue(expense.amount),
    toCellValue(expense.paymentMethodId),
    toCellValue(paymentMethodNameById[expense.paymentMethodId] ?? ''),
    toCellValue(expense.category),
    toCellValue(expense.notes),
    toCellValue(expense.createdAt),
    toCellValue(expense.updatedAt)
  ])

  const installmentRows = month.installmentExpenses.map((installment) => [
    toCellValue(installment.id),
    toCellValue(formatDateDisplay(installment.purchaseDate)),
    toCellValue(installment.description),
    toCellValue(installment.totalAmount),
    toCellValue(installment.installmentsCount),
    toCellValue(installment.installmentAmount),
    toCellValue(installment.paymentMethodId),
    toCellValue(paymentMethodNameById[installment.paymentMethodId] ?? ''),
    toCellValue(installment.category),
    toCellValue(installment.notes),
    toCellValue(installment.isActive),
    toCellValue(installment.createdAt),
    toCellValue(installment.updatedAt)
  ])

  const matrix: Array<Array<string | number | boolean>> = [
    [month.label],
    [`Fecha de exportación: ${formatDateDisplay(exportedAt)}`],
    [],
    ['Resumen del mes'],
    ['Concepto', 'Monto'],
    ['Sueldo base (resumen)', summary.baseSalary],
    ['Ingresos adicionales (total)', summary.extraIncomeTotal],
    ['Gastos normales (total)', summary.normalExpensesTotal],
    ['Gastos fijos (total)', summary.fixedExpensesTotal],
    [
      'Cargos fijos metodos de pago (total)',
      summary.paymentMethodsMonthlyFeesTotal
    ],
    ['Cuotas activas (total)', summary.installmentsTotal],
    ['Total gastado (resumen)', summary.totalExpenses],
    ['Dinero restante (resumen)', summary.remainingMoney],
    [],
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
      'paymentMethodName',
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
      'paymentMethodName',
      'category',
      'notes',
      'isActive',
      'createdAt',
      'updatedAt'
    ],
    ...installmentRows
  ]

  const sheet = XLSX.utils.aoa_to_sheet(matrix)
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }]

  const titleCell = getOrCreateCell(sheet, 0, 0)
  titleCell.s = {
    font: { bold: true, sz: 16, color: { rgb: '1F2937' } }
  }
  const subtitleCell = getOrCreateCell(sheet, 1, 0)
  subtitleCell.s = {
    font: { italic: true, color: { rgb: '4B5563' } }
  }

  applyHeaderRowStyle(sheet, 4, 0, 1)
  applyHeaderRowStyle(sheet, 15, 0, 0)
  applyHeaderRowStyle(sheet, 19, 0, 7)

  const expenseSectionHeaderRow = 22 + extraIncomeRows.length
  applyHeaderRowStyle(sheet, expenseSectionHeaderRow, 0, 9)

  const installmentSectionHeaderRow =
    expenseSectionHeaderRow + 3 + expenseRows.length
  applyHeaderRowStyle(sheet, installmentSectionHeaderRow, 0, 12)

  applySoftBorders(sheet)
  setColumnWidths(sheet, [22, 14, 28, 14, 16, 18, 16, 26, 22, 22, 14, 20, 22])
  setFreezeRows(sheet, 14)

  applyNumberFormatByColumn(sheet, 5, 11, 1, CLP_FORMAT)
  applyNumberFormatByColumn(sheet, 12, 12, 1, CLP_NEGATIVE_HIGHLIGHT_FORMAT)

  const incomeDataStart = 20
  const incomeDataEnd = incomeDataStart + extraIncomeRows.length - 1
  if (incomeDataEnd >= incomeDataStart) {
    applyNumberFormatByColumn(
      sheet,
      incomeDataStart,
      incomeDataEnd,
      3,
      CLP_FORMAT
    )
  }

  const expenseDataStart = expenseSectionHeaderRow + 1
  const expenseDataEnd = expenseDataStart + expenseRows.length - 1
  if (expenseDataEnd >= expenseDataStart) {
    applyNumberFormatByColumn(
      sheet,
      expenseDataStart,
      expenseDataEnd,
      3,
      CLP_FORMAT
    )
  }

  const installmentDataStart = installmentSectionHeaderRow + 1
  const installmentDataEnd = installmentDataStart + installmentRows.length - 1
  if (installmentDataEnd >= installmentDataStart) {
    applyNumberFormatByColumn(
      sheet,
      installmentDataStart,
      installmentDataEnd,
      3,
      CLP_FORMAT
    )
    applyNumberFormatByColumn(
      sheet,
      installmentDataStart,
      installmentDataEnd,
      5,
      CLP_FORMAT
    )
  }

  return sheet
}

function buildConfigSheet(
  workbook: FinanceWorkbook,
  exportedAt: string
): XLSX.WorkSheet {
  const matrix: Array<Array<string | number>> = [
    [
      'appName',
      'formatVersion',
      'exportedAt',
      'locale',
      'currency',
      'defaultBaseSalary'
    ],
    [
      workbook.metadata.appName,
      workbook.metadata.formatVersion || EXCEL_FORMAT_VERSION,
      formatDateDisplay(exportedAt),
      workbook.settings.locale,
      workbook.settings.currency,
      workbook.settings.defaultBaseSalary
    ]
  ]

  const sheet = XLSX.utils.aoa_to_sheet(matrix)
  applyHeaderRowStyle(sheet, 0, 0, 5)
  applySoftBorders(sheet)
  setColumnWidths(sheet, [24, 14, 16, 10, 10, 18])
  setFreezeRows(sheet, 1)
  applyNumberFormatByColumn(sheet, 1, 1, 5, CLP_FORMAT)
  return sheet
}

function buildPaymentMethodsSheet(workbook: FinanceWorkbook): XLSX.WorkSheet {
  const matrix: Array<Array<string | number | boolean>> = [
    [
      'id',
      'name',
      'type',
      'isActive',
      'hasMonthlyFee',
      'monthlyFeeAmount',
      'notes',
      'createdAt',
      'updatedAt'
    ],
    ...workbook.paymentMethods.map((method) => {
      const hasMonthlyFee = method.hasMonthlyFee && method.monthlyFeeAmount > 0
      const monthlyFeeAmount = hasMonthlyFee ? method.monthlyFeeAmount : 0

      return [
        method.id,
        method.name,
        method.type,
        method.isActive,
        hasMonthlyFee,
        monthlyFeeAmount,
        method.notes || '',
        formatDateDisplay(method.createdAt),
        formatDateDisplay(method.updatedAt)
      ]
    })
  ]

  const sheet = XLSX.utils.aoa_to_sheet(matrix)
  applyHeaderRowStyle(sheet, 0, 0, 8)
  applySoftBorders(sheet)
  setColumnWidths(sheet, [16, 20, 14, 10, 14, 18, 24, 14, 14])
  setFreezeRows(sheet, 1)

  if (workbook.paymentMethods.length > 0) {
    applyNumberFormatByColumn(
      sheet,
      1,
      workbook.paymentMethods.length,
      5,
      CLP_FORMAT
    )
  }

  return sheet
}

function buildFixedExpensesSheet(workbook: FinanceWorkbook): XLSX.WorkSheet {
  const paymentMethodNameById = getPaymentMethodNameById(workbook)
  const matrix: Array<Array<string | number | boolean>> = [
    [
      'id',
      'name',
      'amount',
      'paymentMethodId',
      'paymentMethodName',
      'startYear',
      'startMonth',
      'endYear',
      'endMonth',
      'estimatedChargeDay',
      'isActive',
      'notes',
      'createdAt',
      'updatedAt'
    ],
    ...workbook.fixedExpenses.map((fixedExpense) => [
      fixedExpense.id,
      fixedExpense.name,
      fixedExpense.amount,
      fixedExpense.paymentMethodId,
      paymentMethodNameById[fixedExpense.paymentMethodId] ?? '',
      fixedExpense.startYear,
      fixedExpense.startMonth,
      fixedExpense.endYear ?? '',
      fixedExpense.endMonth ?? '',
      fixedExpense.estimatedChargeDay ?? '',
      fixedExpense.isActive,
      fixedExpense.notes || '',
      formatDateDisplay(fixedExpense.createdAt),
      formatDateDisplay(fixedExpense.updatedAt)
    ])
  ]

  const sheet = XLSX.utils.aoa_to_sheet(matrix)
  applyHeaderRowStyle(sheet, 0, 0, 13)
  applySoftBorders(sheet)
  setColumnWidths(
    sheet,
    [16, 22, 14, 16, 18, 10, 10, 10, 10, 14, 10, 24, 14, 14]
  )
  setFreezeRows(sheet, 1)

  if (workbook.fixedExpenses.length > 0) {
    applyNumberFormatByColumn(
      sheet,
      1,
      workbook.fixedExpenses.length,
      2,
      CLP_FORMAT
    )
  }

  return sheet
}

export function buildExcelWorkbook(workbook: FinanceWorkbook): XLSX.WorkBook {
  const xlsxWorkbook = XLSX.utils.book_new()
  const sheetNames = new Set<string>()
  const exportedAt = formatLocalDate(new Date())

  const summarySheet = buildSummarySheet(workbook, exportedAt)
  XLSX.utils.book_append_sheet(
    xlsxWorkbook,
    summarySheet,
    createUniqueSheetName('Resumen', sheetNames)
  )

  sortYearMonthsDesc(workbook.months).forEach((month) => {
    const monthSheet = buildMonthSheet(workbook, month, exportedAt)
    XLSX.utils.book_append_sheet(
      xlsxWorkbook,
      monthSheet,
      createUniqueSheetName(month.label, sheetNames)
    )
  })

  const configSheet = buildConfigSheet(workbook, exportedAt)
  XLSX.utils.book_append_sheet(
    xlsxWorkbook,
    configSheet,
    createUniqueSheetName('Config', sheetNames)
  )

  const paymentMethodsSheet = buildPaymentMethodsSheet(workbook)
  XLSX.utils.book_append_sheet(
    xlsxWorkbook,
    paymentMethodsSheet,
    createUniqueSheetName('MetodosPago', sheetNames)
  )

  const fixedExpensesSheet = buildFixedExpensesSheet(workbook)
  XLSX.utils.book_append_sheet(
    xlsxWorkbook,
    fixedExpensesSheet,
    createUniqueSheetName('GastosFijos', sheetNames)
  )

  return xlsxWorkbook
}
