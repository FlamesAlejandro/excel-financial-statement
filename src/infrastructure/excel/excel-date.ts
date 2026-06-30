function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  return `${year}-${month}-${day}`
}

export function formatLocalDateTimeForFileName(date: Date): string {
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hours = pad2(date.getHours())
  const minutes = pad2(date.getMinutes())
  const seconds = pad2(date.getSeconds())

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
}

export function formatLocalDateFromIso(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) {
    return value
  }

  return formatLocalDate(date)
}
