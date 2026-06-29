import { describe, expect, it } from 'vitest'

import { buildExportFileName } from './workbookExcel'

describe('buildExportFileName', () => {
  it('genera nombre con formato estado-financiero-YYYY-MM-DD_HH-mm-ss.xlsx', () => {
    const date = new Date(2026, 5, 29, 2, 43, 0)
    expect(buildExportFileName(date)).toBe(
      'estado-financiero-2026-06-29_02-43-00.xlsx'
    )
  })
})
