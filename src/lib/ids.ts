export function createId(prefix?: string): string {
  const hasPrefix = typeof prefix === 'string' && prefix.trim().length > 0
  const normalizedPrefix = hasPrefix ? prefix.trim() : ''

  const baseId =
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  return normalizedPrefix ? `${normalizedPrefix}_${baseId}` : baseId
}
