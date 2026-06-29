const CURRENCY_FORMATTER = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
})

export function formatCurrencyCLP(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  return CURRENCY_FORMATTER.format(safeAmount)
}

export function normalizeAmount(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value !== 'string') {
    return 0
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return 0
  }

  const cleaned = trimmed.replace(/[^\d,.-]/g, '')

  let normalized = cleaned
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Caso tipico es-CL: 1.234,56 -> 1234.56
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round((value + Number.EPSILON) * 100) / 100
}
