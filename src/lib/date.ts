const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
] as const

const MONTH_INDEX_BY_NAME = MONTHS_ES.reduce<Record<string, number>>(
  (acc, monthName, index) => {
    const normalized = normalizeMonthName(monthName)
    acc[normalized] = index + 1
    return acc
  },
  {}
)

function normalizeMonthName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function getMonthLabel(year: number, month: number): string {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('month must be an integer between 1 and 12')
  }

  return `${MONTHS_ES[month - 1]} ${year}`
}

export function parseMonthLabel(
  label: string
): { year: number; month: number } | null {
  const match = label.trim().match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s+(\d{4})$/)
  if (!match) {
    return null
  }

  const [, monthName, yearText] = match
  const month = MONTH_INDEX_BY_NAME[normalizeMonthName(monthName)]
  const year = Number(yearText)

  if (!month || !Number.isInteger(year)) {
    return null
  }

  return { year, month }
}

export function sortYearMonthsDesc<T extends { year: number; month: number }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const aKey = a.year * 12 + (a.month - 1)
    const bKey = b.year * 12 + (b.month - 1)
    return bKey - aKey
  })
}

export function addMonthsToYearMonth(
  year: number,
  month: number,
  amount: number
): { year: number; month: number } {
  const totalMonths = year * 12 + (month - 1) + amount
  const nextYear = Math.floor(totalMonths / 12)
  const nextMonth = ((totalMonths % 12) + 12) % 12

  return {
    year: nextYear,
    month: nextMonth + 1
  }
}

export function isSameYearMonth(
  aYear: number,
  aMonth: number,
  bYear: number,
  bMonth: number
): boolean {
  return aYear === bYear && aMonth === bMonth
}
