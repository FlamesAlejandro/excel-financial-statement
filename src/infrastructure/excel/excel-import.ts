import * as XLSX from 'xlsx'

import type {
  FinanceWorkbook,
  FixedExpense,
  InstallmentExpense,
  MonthNumber,
  MonthFinance,
  PaymentMethod,
  PaymentMethodType
} from '../../domain/finance/types'
import {
  getMonthLabel,
  parseMonthLabel,
  sortYearMonthsDesc
} from '../../lib/date'
import { createId } from '../../lib/ids'
import { EXCEL_FORMAT_VERSION } from './excel-version'

type SheetRecord = Record<string, unknown>

type ImportOkResult = {
  ok: true
  workbook: FinanceWorkbook
  errors: string[]
  warnings: string[]
  fileName: string | null
}

type ImportErrorResult = {
  ok: false
  workbook: null
  errors: string[]
  warnings: string[]
  fileName: string | null
}

export type ImportWorkbookResult = ImportOkResult | ImportErrorResult

type ParseConfigResult = {
  metadata: FinanceWorkbook['metadata']
  settings: FinanceWorkbook['settings']
  errors: string[]
  warnings: string[]
}

type ParsePaymentMethodsResult = {
  paymentMethods: PaymentMethod[]
  errors: string[]
  warnings: string[]
}

type ParseFixedExpensesResult = {
  fixedExpenses: FixedExpense[]
  errors: string[]
  warnings: string[]
}

type YearMonth = {
  year: number
  month: number
}

type ParseMonthSheetResult = {
  month: MonthFinance | null
  errors: string[]
  warnings: string[]
}

type ParseMonthSheetsResult = {
  months: MonthFinance[]
  errors: string[]
  warnings: string[]
}

const FIXED_SHEETS = [
  'Resumen',
  'Config',
  'MetodosPago',
  'GastosFijos'
] as const
const MONTH_SECTION_TITLES = [
  'Sueldo base',
  'Ingresos adicionales',
  'Gastos normales',
  'Gastos en cuotas'
] as const

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function findSheetName(
  sheetNames: string[],
  expectedName: string
): string | null {
  const expected = normalizeText(expectedName)
  return (
    sheetNames.find((sheetName) => normalizeText(sheetName) === expected) ??
    null
  )
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

function parseBooleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  const normalized = toStringValue(value).toLowerCase()
  if (['true', '1', 'si', 'sí', 'yes'].includes(normalized)) {
    return true
  }

  if (['false', '0', 'no'].includes(normalized)) {
    return false
  }

  return fallback
}

function parseNumberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const text = toStringValue(value)
  if (!text) {
    return Number.NaN
  }

  const compact = text.replace(/\s+/g, '').replace(/[^\d,.-]/g, '')
  if (!compact || compact === '-' || compact === ',' || compact === '.') {
    return Number.NaN
  }

  const hasDot = compact.includes('.')
  const hasComma = compact.includes(',')

  let normalized = compact
  if (hasDot && hasComma) {
    const lastDot = compact.lastIndexOf('.')
    const lastComma = compact.lastIndexOf(',')
    const decimalSeparator = lastDot > lastComma ? '.' : ','
    const thousandSeparator = decimalSeparator === '.' ? ',' : '.'
    normalized = compact.split(thousandSeparator).join('')
    if (decimalSeparator === ',') {
      normalized = normalized.replace(',', '.')
    }
  } else if (hasComma || hasDot) {
    const separator = hasComma ? ',' : '.'
    const firstIndex = compact.indexOf(separator)
    const lastIndex = compact.lastIndexOf(separator)
    const isSingleSeparator = firstIndex === lastIndex
    const decimalsCount = compact.length - lastIndex - 1

    const shouldTreatAsThousandsSeparator =
      isSingleSeparator && decimalsCount === 3

    if (shouldTreatAsThousandsSeparator) {
      normalized = compact.replace(separator, '')
    } else {
      normalized = compact
      if (separator === ',') {
        normalized = normalized.replace(',', '.')
      }
    }
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function isValidDateValue(value: string): boolean {
  if (!value) {
    return false
  }

  return !Number.isNaN(new Date(value).valueOf())
}

function readSheetAsRecords(worksheet: XLSX.WorkSheet): SheetRecord[] {
  return XLSX.utils.sheet_to_json<SheetRecord>(worksheet, {
    defval: '',
    raw: false
  })
}

function readSheetAsMatrix(worksheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false
  }) as unknown[][]
}

function rowToStringArray(row: unknown[] | undefined): string[] {
  if (!row) {
    return []
  }

  return row.map((cell) => toStringValue(cell))
}

function isEmptyRow(row: string[]): boolean {
  return row.every((cell) => cell.trim() === '')
}

function getHeaderMap(headers: string[]): Record<string, number> {
  return headers.reduce<Record<string, number>>((acc, header, index) => {
    acc[normalizeText(header)] = index
    return acc
  }, {})
}

function getRowValue(
  row: string[],
  headerMap: Record<string, number>,
  headerName: string
): string {
  const index = headerMap[normalizeText(headerName)]
  if (index === undefined) {
    return ''
  }

  return row[index] ?? ''
}

function isSectionTitle(text: string): boolean {
  const normalized = normalizeText(text)
  return MONTH_SECTION_TITLES.some(
    (sectionTitle) => normalizeText(sectionTitle) === normalized
  )
}

function extractSectionRows(
  matrix: string[][],
  sectionTitle: string
): { headers: string[]; rows: string[][] } | null {
  const sectionIndex = matrix.findIndex(
    (row) => normalizeText(row[0] ?? '') === normalizeText(sectionTitle)
  )

  if (sectionIndex < 0) {
    return null
  }

  const headers = matrix[sectionIndex + 1] ?? []
  const rows: string[][] = []

  for (let index = sectionIndex + 2; index < matrix.length; index += 1) {
    const row = matrix[index] ?? []
    const firstCell = row[0] ?? ''

    if (isEmptyRow(row)) {
      break
    }

    if (
      isSectionTitle(firstCell) &&
      row.slice(1).every((cell) => cell === '')
    ) {
      break
    }

    rows.push(row)
  }

  return { headers, rows }
}

function parsePaymentMethodType(value: string): PaymentMethodType {
  if (
    value === 'debit' ||
    value === 'credit_card' ||
    value === 'cash' ||
    value === 'transfer' ||
    value === 'other'
  ) {
    return value
  }

  return 'other'
}

export function parseConfigSheet(worksheet: XLSX.WorkSheet): ParseConfigResult {
  const nowIso = new Date().toISOString()
  const errors: string[] = []
  const warnings: string[] = []
  const records = readSheetAsRecords(worksheet)
  const firstRow = records[0]

  if (!firstRow) {
    errors.push('La hoja Config está vacía.')

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
        defaultBaseSalary: 0
      },
      errors,
      warnings
    }
  }

  const appName = toStringValue(firstRow.appName) || 'Estado Financiero'
  const formatVersion =
    toStringValue(firstRow.formatVersion) || EXCEL_FORMAT_VERSION
  const exportedAt = toStringValue(firstRow.exportedAt)
  const locale = toStringValue(firstRow.locale)
  const currency = toStringValue(firstRow.currency)
  const defaultBaseSalary = parseNumberValue(firstRow.defaultBaseSalary)

  if (formatVersion !== EXCEL_FORMAT_VERSION) {
    errors.push(
      `Versión de formato no soportada (${formatVersion}). Se esperaba ${EXCEL_FORMAT_VERSION}.`
    )
  }

  if (locale && locale !== 'es-CL') {
    warnings.push('Locale distinto a es-CL. Se usará es-CL.')
  }

  if (currency && currency !== 'CLP') {
    warnings.push('Moneda distinta a CLP. Se usará CLP.')
  }

  if (Number.isNaN(defaultBaseSalary) || defaultBaseSalary < 0) {
    warnings.push('defaultBaseSalary inválido en Config. Se usará 0.')
  }

  return {
    metadata: {
      appName,
      formatVersion,
      createdAt: nowIso,
      updatedAt: nowIso,
      exportedAt: isValidDateValue(exportedAt) ? exportedAt : undefined
    },
    settings: {
      locale: 'es-CL',
      currency: 'CLP',
      defaultBaseSalary:
        Number.isNaN(defaultBaseSalary) || defaultBaseSalary < 0
          ? 0
          : defaultBaseSalary
    },
    errors,
    warnings
  }
}

export function parsePaymentMethodsSheet(
  worksheet: XLSX.WorkSheet
): ParsePaymentMethodsResult {
  const nowIso = new Date().toISOString()
  const errors: string[] = []
  const warnings: string[] = []

  const paymentMethods = readSheetAsRecords(worksheet).map((row, index) => {
    const id = toStringValue(row.id)
    const name = toStringValue(row.name)
    const typeValue = toStringValue(row.type)
    const type = parsePaymentMethodType(typeValue)

    if (!id) {
      errors.push(`Método de pago sin id en fila ${index + 2}.`)
    }

    if (!name) {
      errors.push(`Método de pago sin name en fila ${index + 2}.`)
    }

    if (type !== typeValue && typeValue) {
      warnings.push(
        `Tipo de método no reconocido en fila ${index + 2} (${typeValue}). Se usó "other".`
      )
    }

    const monthlyFeeAmount = parseNumberValue(row.monthlyFeeAmount)
    if (Number.isNaN(monthlyFeeAmount) || monthlyFeeAmount < 0) {
      errors.push(
        `monthlyFeeAmount inválido en método de pago fila ${index + 2}.`
      )
    }

    const hasMonthlyFee = parseBooleanValue(row.hasMonthlyFee)

    return {
      id,
      name,
      type,
      isActive: parseBooleanValue(row.isActive, true),
      hasMonthlyFee,
      monthlyFeeAmount:
        Number.isNaN(monthlyFeeAmount) || monthlyFeeAmount < 0
          ? 0
          : hasMonthlyFee
            ? monthlyFeeAmount
            : 0,
      notes: toStringValue(row.notes) || undefined,
      createdAt: toStringValue(row.createdAt) || nowIso,
      updatedAt: toStringValue(row.updatedAt) || nowIso
    } satisfies PaymentMethod
  })

  return {
    paymentMethods,
    errors,
    warnings
  }
}

export function parseFixedExpensesSheet(
  worksheet: XLSX.WorkSheet,
  fallbackStartMonth: YearMonth
): ParseFixedExpensesResult {
  const nowIso = new Date().toISOString()
  const errors: string[] = []
  const warnings: string[] = []

  const fixedExpenses = readSheetAsRecords(worksheet).map((row, index) => {
    const id = toStringValue(row.id)
    const name = toStringValue(row.name)

    if (!id) {
      errors.push(`Gasto fijo sin id en fila ${index + 2}.`)
    }

    if (!name) {
      errors.push(`Gasto fijo sin name en fila ${index + 2}.`)
    }

    const amount = parseNumberValue(row.amount)
    if (Number.isNaN(amount) || amount < 0) {
      errors.push(`Monto inválido en gasto fijo fila ${index + 2}.`)
    }

    const startYearRaw = parseNumberValue(row.startYear)
    const startMonthRaw = parseNumberValue(row.startMonth)
    const hasStartYear = !Number.isNaN(startYearRaw)
    const hasStartMonth = !Number.isNaN(startMonthRaw)
    const hasValidStartYear = hasStartYear && startYearRaw >= 1970
    const hasValidStartMonth =
      hasStartMonth && startMonthRaw >= 1 && startMonthRaw <= 12

    let startYear = fallbackStartMonth.year
    let startMonth = fallbackStartMonth.month

    if (hasValidStartYear && hasValidStartMonth) {
      startYear = startYearRaw
      startMonth = startMonthRaw
    } else if (!hasStartYear && !hasStartMonth) {
      warnings.push(
        `Falta inicio de vigencia en gasto fijo fila ${index + 2}. Se usó ${fallbackStartMonth.month}/${fallbackStartMonth.year}.`
      )
    } else {
      warnings.push(
        `Inicio de vigencia inválido en gasto fijo fila ${index + 2}. Se usó ${fallbackStartMonth.month}/${fallbackStartMonth.year}.`
      )
    }

    const endYearRaw = parseNumberValue(row.endYear)
    const endMonthRaw = parseNumberValue(row.endMonth)
    const hasEndYear = !Number.isNaN(endYearRaw)
    const hasEndMonth = !Number.isNaN(endMonthRaw)

    let endYear: number | undefined
    let endMonth: number | undefined

    if (hasEndYear && hasEndMonth) {
      const isValidEndYear = endYearRaw >= 1970
      const isValidEndMonth = endMonthRaw >= 1 && endMonthRaw <= 12
      if (isValidEndYear && isValidEndMonth) {
        const startKey = startYear * 12 + (startMonth - 1)
        const endKey = endYearRaw * 12 + (endMonthRaw - 1)
        if (endKey < startKey) {
          warnings.push(
            `Término anterior al inicio en gasto fijo fila ${index + 2}. Se ignoró término.`
          )
        } else {
          endYear = endYearRaw
          endMonth = endMonthRaw
        }
      } else {
        warnings.push(
          `Término de vigencia inválido en gasto fijo fila ${index + 2}. Se ignoró término.`
        )
      }
    } else if (hasEndYear || hasEndMonth) {
      warnings.push(
        `Término incompleto en gasto fijo fila ${index + 2}. Se ignoró término.`
      )
    }

    const estimatedChargeDay = parseNumberValue(row.estimatedChargeDay)
    if (
      !Number.isNaN(estimatedChargeDay) &&
      (estimatedChargeDay < 1 || estimatedChargeDay > 31)
    ) {
      warnings.push(
        `estimatedChargeDay fuera de rango en gasto fijo fila ${index + 2}. Se ignoró.`
      )
    }

    return {
      id,
      name,
      amount: Number.isNaN(amount) || amount < 0 ? 0 : amount,
      paymentMethodId: toStringValue(row.paymentMethodId),
      startYear,
      startMonth,
      endYear,
      endMonth,
      estimatedChargeDay:
        Number.isNaN(estimatedChargeDay) ||
        estimatedChargeDay < 1 ||
        estimatedChargeDay > 31
          ? undefined
          : estimatedChargeDay,
      isActive: parseBooleanValue(row.isActive, true),
      notes: toStringValue(row.notes) || undefined,
      createdAt: toStringValue(row.createdAt) || nowIso,
      updatedAt: toStringValue(row.updatedAt) || nowIso
    } satisfies FixedExpense
  })

  return {
    fixedExpenses,
    errors,
    warnings
  }
}

export function parseMonthSheet(
  sheetName: string,
  worksheet: XLSX.WorkSheet
): ParseMonthSheetResult {
  const errors: string[] = []
  const warnings: string[] = []
  const nowIso = new Date().toISOString()

  const parsedLabel = parseMonthLabel(sheetName)
  if (!parsedLabel) {
    errors.push(`Nombre de mes no reconocido: ${sheetName}.`)
    return { month: null, errors, warnings }
  }

  const matrix = readSheetAsMatrix(worksheet).map((row) =>
    rowToStringArray(row)
  )

  const salarySection = extractSectionRows(matrix, 'Sueldo base')
  if (!salarySection) {
    errors.push(`Falta sección "Sueldo base" en hoja ${sheetName}.`)
  }

  const salaryHeaderMap = getHeaderMap(salarySection?.headers ?? [])
  const salaryRaw = getRowValue(
    salarySection?.rows[0] ?? [],
    salaryHeaderMap,
    'baseSalary'
  )
  const baseSalary = parseNumberValue(salaryRaw)
  if (Number.isNaN(baseSalary) || baseSalary < 0) {
    errors.push(`Sueldo base inválido en hoja ${sheetName}.`)
  }

  const incomesSection = extractSectionRows(matrix, 'Ingresos adicionales')
  const incomesHeaderMap = getHeaderMap(incomesSection?.headers ?? [])
  const extraIncomes = (incomesSection?.rows ?? []).map((row, index) => {
    const id = getRowValue(row, incomesHeaderMap, 'id')
    const date = getRowValue(row, incomesHeaderMap, 'date')
    const amount = parseNumberValue(
      getRowValue(row, incomesHeaderMap, 'amount')
    )

    if (!id) {
      errors.push(`Ingreso sin id en hoja ${sheetName}, fila ${index + 1}.`)
    }

    if (!isValidDateValue(date)) {
      errors.push(
        `Fecha inválida en ingreso de hoja ${sheetName}, fila ${index + 1}.`
      )
    }

    if (Number.isNaN(amount) || amount <= 0) {
      errors.push(
        `Monto inválido en ingreso de hoja ${sheetName}, fila ${index + 1}.`
      )
    }

    return {
      id,
      date,
      description: getRowValue(row, incomesHeaderMap, 'description'),
      amount: Number.isNaN(amount) ? 0 : amount,
      source: getRowValue(row, incomesHeaderMap, 'source') || undefined,
      notes: getRowValue(row, incomesHeaderMap, 'notes') || undefined,
      createdAt: getRowValue(row, incomesHeaderMap, 'createdAt') || nowIso,
      updatedAt: getRowValue(row, incomesHeaderMap, 'updatedAt') || nowIso
    }
  })

  const expensesSection = extractSectionRows(matrix, 'Gastos normales')
  const expensesHeaderMap = getHeaderMap(expensesSection?.headers ?? [])
  const expenses = (expensesSection?.rows ?? []).map((row, index) => {
    const id = getRowValue(row, expensesHeaderMap, 'id')
    const date = getRowValue(row, expensesHeaderMap, 'date')
    const amount = parseNumberValue(
      getRowValue(row, expensesHeaderMap, 'amount')
    )

    if (!id) {
      errors.push(`Gasto sin id en hoja ${sheetName}, fila ${index + 1}.`)
    }

    if (!isValidDateValue(date)) {
      errors.push(
        `Fecha inválida en gasto de hoja ${sheetName}, fila ${index + 1}.`
      )
    }

    if (Number.isNaN(amount) || amount <= 0) {
      errors.push(
        `Monto inválido en gasto de hoja ${sheetName}, fila ${index + 1}.`
      )
    }

    return {
      id,
      date,
      description: getRowValue(row, expensesHeaderMap, 'description'),
      amount: Number.isNaN(amount) ? 0 : amount,
      paymentMethodId: getRowValue(row, expensesHeaderMap, 'paymentMethodId'),
      category: getRowValue(row, expensesHeaderMap, 'category') || undefined,
      notes: getRowValue(row, expensesHeaderMap, 'notes') || undefined,
      createdAt: getRowValue(row, expensesHeaderMap, 'createdAt') || nowIso,
      updatedAt: getRowValue(row, expensesHeaderMap, 'updatedAt') || nowIso
    }
  })

  const installmentsSection = extractSectionRows(matrix, 'Gastos en cuotas')
  const installmentsHeaderMap = getHeaderMap(installmentsSection?.headers ?? [])
  const installmentExpenses = (installmentsSection?.rows ?? []).map(
    (row, index) => {
      const id = getRowValue(row, installmentsHeaderMap, 'id')
      const purchaseDate = getRowValue(
        row,
        installmentsHeaderMap,
        'purchaseDate'
      )
      const totalAmount = parseNumberValue(
        getRowValue(row, installmentsHeaderMap, 'totalAmount')
      )
      const installmentsCount = parseNumberValue(
        getRowValue(row, installmentsHeaderMap, 'installmentsCount')
      )
      const installmentAmount = parseNumberValue(
        getRowValue(row, installmentsHeaderMap, 'installmentAmount')
      )

      if (!id) {
        errors.push(`Cuota sin id en hoja ${sheetName}, fila ${index + 1}.`)
      }

      if (!isValidDateValue(purchaseDate)) {
        errors.push(
          `Fecha inválida en gasto en cuotas de hoja ${sheetName}, fila ${index + 1}.`
        )
      }

      if (Number.isNaN(totalAmount) || totalAmount <= 0) {
        errors.push(
          `totalAmount inválido en gasto en cuotas de hoja ${sheetName}, fila ${index + 1}.`
        )
      }

      if (Number.isNaN(installmentsCount) || installmentsCount <= 1) {
        errors.push(
          `installmentsCount inválido en gasto en cuotas de hoja ${sheetName}, fila ${index + 1}.`
        )
      }

      const hasInvalidInstallmentAmount =
        Number.isNaN(installmentAmount) || installmentAmount <= 0
      const canRecalculateInstallmentAmount =
        !Number.isNaN(totalAmount) &&
        !Number.isNaN(installmentsCount) &&
        installmentsCount > 0

      let safeInstallmentAmount = installmentAmount
      if (hasInvalidInstallmentAmount) {
        safeInstallmentAmount = canRecalculateInstallmentAmount
          ? totalAmount / installmentsCount
          : 0
      }

      if (hasInvalidInstallmentAmount) {
        warnings.push(
          `installmentAmount inválido en hoja ${sheetName}, fila ${index + 1}. Se recalculó automáticamente.`
        )
      }

      return {
        id,
        purchaseDate,
        description: getRowValue(row, installmentsHeaderMap, 'description'),
        totalAmount: Number.isNaN(totalAmount) ? 0 : totalAmount,
        installmentsCount: Number.isNaN(installmentsCount)
          ? 0
          : installmentsCount,
        installmentAmount: safeInstallmentAmount,
        paymentMethodId: getRowValue(
          row,
          installmentsHeaderMap,
          'paymentMethodId'
        ),
        category:
          getRowValue(row, installmentsHeaderMap, 'category') || undefined,
        notes: getRowValue(row, installmentsHeaderMap, 'notes') || undefined,
        isActive: parseBooleanValue(
          getRowValue(row, installmentsHeaderMap, 'isActive'),
          true
        ),
        createdAt:
          getRowValue(row, installmentsHeaderMap, 'createdAt') || nowIso,
        updatedAt:
          getRowValue(row, installmentsHeaderMap, 'updatedAt') || nowIso
      } satisfies InstallmentExpense
    }
  )

  const month: MonthFinance = {
    id: createId('month'),
    year: parsedLabel.year,
    month: parsedLabel.month as MonthNumber,
    label: getMonthLabel(parsedLabel.year, parsedLabel.month),
    baseSalary: Number.isNaN(baseSalary) ? 0 : baseSalary,
    extraIncomes,
    expenses,
    installmentExpenses,
    createdAt: nowIso,
    updatedAt: nowIso
  }

  return {
    month,
    errors,
    warnings
  }
}

export function parseMonthSheets(params: {
  sheetNames: string[]
  sheets: Record<string, XLSX.WorkSheet>
}): ParseMonthSheetsResult {
  const errors: string[] = []
  const warnings: string[] = []
  const months: MonthFinance[] = []

  const fixedNames = new Set(FIXED_SHEETS.map((sheet) => normalizeText(sheet)))

  params.sheetNames.forEach((sheetName) => {
    const normalized = normalizeText(sheetName)
    if (fixedNames.has(normalized)) {
      return
    }

    const isMonthSheet = parseMonthLabel(sheetName) !== null
    if (!isMonthSheet) {
      errors.push(`Nombre de mes no reconocido: ${sheetName}.`)
      return
    }

    const worksheet = params.sheets[sheetName]
    if (!worksheet) {
      errors.push(`No se pudo leer la hoja mensual ${sheetName}.`)
      return
    }

    const parsed = parseMonthSheet(sheetName, worksheet)
    errors.push(...parsed.errors)
    warnings.push(...parsed.warnings)

    if (parsed.month) {
      months.push(parsed.month)
    }
  })

  return {
    months: sortYearMonthsDesc(months),
    errors,
    warnings
  }
}

function findDuplicateIds(values: string[]): string[] {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    if (!value) {
      return acc
    }

    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
}

export function validateImportedWorkbook(workbook: FinanceWorkbook): {
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!workbook.months.length) {
    errors.push('El archivo no contiene hojas mensuales válidas.')
  }

  const paymentMethodIds = workbook.paymentMethods.map((method) => method.id)
  const paymentMethodIdSet = new Set(paymentMethodIds)

  workbook.paymentMethods.forEach((method) => {
    if (!method.id) {
      errors.push('Existe un método de pago sin id.')
    }

    if (!method.name) {
      errors.push(
        `Existe un método de pago sin name (id: ${method.id || 'sin-id'}).`
      )
    }

    if (method.monthlyFeeAmount < 0 || Number.isNaN(method.monthlyFeeAmount)) {
      errors.push(`monthlyFeeAmount inválido en método ${method.id}.`)
    }
  })

  findDuplicateIds(paymentMethodIds).forEach((id) => {
    errors.push(`ID duplicado en métodos de pago: ${id}.`)
  })

  const fixedExpenseIds = workbook.fixedExpenses.map((item) => item.id)
  findDuplicateIds(fixedExpenseIds).forEach((id) => {
    errors.push(`ID duplicado en gastos fijos: ${id}.`)
  })

  workbook.fixedExpenses.forEach((fixedExpense) => {
    if (fixedExpense.amount < 0 || Number.isNaN(fixedExpense.amount)) {
      errors.push(`Monto inválido en gasto fijo ${fixedExpense.id}.`)
    }

    if (fixedExpense.startYear < 1970) {
      errors.push(`startYear inválido en gasto fijo ${fixedExpense.id}.`)
    }

    if (fixedExpense.startMonth < 1 || fixedExpense.startMonth > 12) {
      errors.push(`startMonth inválido en gasto fijo ${fixedExpense.id}.`)
    }

    const hasEndYear = fixedExpense.endYear !== undefined
    const hasEndMonth = fixedExpense.endMonth !== undefined
    if (hasEndYear !== hasEndMonth) {
      errors.push(`Término incompleto en gasto fijo ${fixedExpense.id}.`)
    }

    if (hasEndYear && hasEndMonth) {
      if ((fixedExpense.endYear as number) < 1970) {
        errors.push(`endYear inválido en gasto fijo ${fixedExpense.id}.`)
      }

      if (
        (fixedExpense.endMonth as number) < 1 ||
        (fixedExpense.endMonth as number) > 12
      ) {
        errors.push(`endMonth inválido en gasto fijo ${fixedExpense.id}.`)
      }

      const startKey =
        fixedExpense.startYear * 12 + (fixedExpense.startMonth - 1)
      const endKey =
        (fixedExpense.endYear as number) * 12 +
        ((fixedExpense.endMonth as number) - 1)
      if (endKey < startKey) {
        errors.push(
          `Término anterior al inicio en gasto fijo ${fixedExpense.id}.`
        )
      }
    }

    if (!paymentMethodIdSet.has(fixedExpense.paymentMethodId)) {
      errors.push(
        `paymentMethodId inexistente en gasto fijo ${fixedExpense.id}: ${fixedExpense.paymentMethodId}.`
      )
    }
  })

  workbook.months.forEach((month) => {
    const parsedLabel = parseMonthLabel(month.label)
    if (!parsedLabel) {
      errors.push(`Nombre de mes no reconocido en label: ${month.label}.`)
    }

    const expenseIds = month.expenses.map((expense) => expense.id)
    findDuplicateIds(expenseIds).forEach((id) => {
      errors.push(`ID duplicado en gastos normales (${month.label}): ${id}.`)
    })

    const incomeIds = month.extraIncomes.map((income) => income.id)
    findDuplicateIds(incomeIds).forEach((id) => {
      errors.push(
        `ID duplicado en ingresos adicionales (${month.label}): ${id}.`
      )
    })

    const installmentIds = month.installmentExpenses.map((item) => item.id)
    findDuplicateIds(installmentIds).forEach((id) => {
      errors.push(`ID duplicado en cuotas (${month.label}): ${id}.`)
    })

    if (month.baseSalary < 0 || Number.isNaN(month.baseSalary)) {
      errors.push(`Sueldo base inválido en mes ${month.label}.`)
    }

    month.extraIncomes.forEach((income) => {
      if (!isValidDateValue(income.date)) {
        errors.push(`Fecha inválida en ingreso ${income.id} (${month.label}).`)
      }

      if (income.amount <= 0 || Number.isNaN(income.amount)) {
        errors.push(`Monto inválido en ingreso ${income.id} (${month.label}).`)
      }
    })

    month.expenses.forEach((expense) => {
      if (!isValidDateValue(expense.date)) {
        errors.push(`Fecha inválida en gasto ${expense.id} (${month.label}).`)
      }

      if (expense.amount <= 0 || Number.isNaN(expense.amount)) {
        errors.push(`Monto inválido en gasto ${expense.id} (${month.label}).`)
      }

      if (!paymentMethodIdSet.has(expense.paymentMethodId)) {
        errors.push(
          `paymentMethodId inexistente en gasto ${expense.id}: ${expense.paymentMethodId}.`
        )
      }
    })

    month.installmentExpenses.forEach((installment) => {
      if (!isValidDateValue(installment.purchaseDate)) {
        errors.push(
          `Fecha inválida en gasto en cuotas ${installment.id} (${month.label}).`
        )
      }

      if (
        installment.totalAmount <= 0 ||
        Number.isNaN(installment.totalAmount)
      ) {
        errors.push(
          `totalAmount inválido en gasto en cuotas ${installment.id} (${month.label}).`
        )
      }

      if (
        installment.installmentsCount <= 1 ||
        Number.isNaN(installment.installmentsCount)
      ) {
        errors.push(
          `installmentsCount inválido en gasto en cuotas ${installment.id} (${month.label}).`
        )
      }

      if (
        installment.installmentAmount <= 0 ||
        Number.isNaN(installment.installmentAmount)
      ) {
        errors.push(
          `installmentAmount inválido en gasto en cuotas ${installment.id} (${month.label}).`
        )
      }

      if (!paymentMethodIdSet.has(installment.paymentMethodId)) {
        errors.push(
          `paymentMethodId inexistente en cuota ${installment.id}: ${installment.paymentMethodId}.`
        )
      }
    })
  })

  if (!workbook.paymentMethods.length) {
    warnings.push('No se encontraron métodos de pago en el archivo importado.')
  }

  return { errors, warnings }
}

export async function importWorkbookFromExcel(
  file: File
): Promise<ImportWorkbookResult> {
  const errors: string[] = []
  const warnings: string[] = []

  if (!file || file.size === 0) {
    return {
      ok: false,
      workbook: null,
      errors: ['Archivo vacío o inválido.'],
      warnings,
      fileName: file?.name ?? null
    }
  }

  let xlsxWorkbook: XLSX.WorkBook
  try {
    const buffer = await file.arrayBuffer()
    xlsxWorkbook = XLSX.read(buffer, { type: 'array' })
  } catch {
    return {
      ok: false,
      workbook: null,
      errors: ['No se pudo leer el archivo Excel.'],
      warnings,
      fileName: file.name
    }
  }

  const sheetNames = xlsxWorkbook.SheetNames
  if (!sheetNames.length) {
    return {
      ok: false,
      workbook: null,
      errors: ['El archivo no contiene hojas.'],
      warnings,
      fileName: file.name
    }
  }

  const configSheetName = findSheetName(sheetNames, 'Config')
  const paymentMethodsSheetName = findSheetName(sheetNames, 'MetodosPago')
  const fixedExpensesSheetName = findSheetName(sheetNames, 'GastosFijos')

  if (!configSheetName) {
    errors.push('Falta hoja Config.')
  }

  if (!paymentMethodsSheetName) {
    errors.push('Falta hoja MetodosPago.')
  }

  if (!fixedExpensesSheetName) {
    errors.push('Falta hoja GastosFijos.')
  }

  if (!configSheetName || !paymentMethodsSheetName || !fixedExpensesSheetName) {
    return {
      ok: false,
      workbook: null,
      errors,
      warnings,
      fileName: file.name
    }
  }

  const configSheet = xlsxWorkbook.Sheets[configSheetName]
  const paymentMethodsSheet = xlsxWorkbook.Sheets[paymentMethodsSheetName]
  const fixedExpensesSheet = xlsxWorkbook.Sheets[fixedExpensesSheetName]

  const configParse = parseConfigSheet(configSheet)
  const paymentMethodsParse = parsePaymentMethodsSheet(paymentMethodsSheet)
  const monthsParse = parseMonthSheets({
    sheetNames,
    sheets: xlsxWorkbook.Sheets
  })

  const fallbackStartMonth = monthsParse.months.length
    ? monthsParse.months[monthsParse.months.length - 1]
    : {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      }

  const fixedExpensesParse = parseFixedExpensesSheet(fixedExpensesSheet, {
    year: fallbackStartMonth.year,
    month: fallbackStartMonth.month
  })

  errors.push(
    ...configParse.errors,
    ...paymentMethodsParse.errors,
    ...fixedExpensesParse.errors,
    ...monthsParse.errors
  )
  warnings.push(
    ...configParse.warnings,
    ...paymentMethodsParse.warnings,
    ...fixedExpensesParse.warnings,
    ...monthsParse.warnings
  )

  if (!monthsParse.months.length) {
    errors.push('Falta al menos una hoja mensual válida.')
  }

  const workbook: FinanceWorkbook = {
    metadata: configParse.metadata,
    settings: configParse.settings,
    paymentMethods: paymentMethodsParse.paymentMethods,
    fixedExpenses: fixedExpensesParse.fixedExpenses,
    months: sortYearMonthsDesc(monthsParse.months)
  }

  const validation = validateImportedWorkbook(workbook)
  errors.push(...validation.errors)
  warnings.push(...validation.warnings)

  if (errors.length > 0) {
    return {
      ok: false,
      workbook: null,
      errors,
      warnings,
      fileName: file.name
    }
  }

  return {
    ok: true,
    workbook,
    errors: [],
    warnings,
    fileName: file.name
  }
}
