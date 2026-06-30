import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'

import { createMockFinanceWorkbook } from '../../domain/finance/mock'
import { buildExcelWorkbook } from './excel-export'
import { importWorkbookFromExcel } from './excel-import'
import { buildExportFileName } from './workbookExcel'

describe('buildExportFileName', () => {
  it('genera nombre con formato estado-financiero-YYYY-MM-DD_HH-mm-ss.xlsx', () => {
    const date = new Date(2026, 5, 29, 2, 43, 0)
    expect(buildExportFileName(date)).toBe(
      'estado-financiero-2026-06-29_02-43-00.xlsx'
    )
  })
})

describe('excel export design and compatibility', () => {
  it('ordena hojas como Resumen, meses desc y configuracion al final', () => {
    const workbook = createMockFinanceWorkbook()
    const excelWorkbook = buildExcelWorkbook(workbook)

    expect(excelWorkbook.SheetNames).toEqual([
      'Resumen',
      'Julio 2026',
      'Junio 2026',
      'Config',
      'MetodosPago',
      'GastosFijos'
    ])
  })

  it('mantiene compatibilidad de importacion al reimportar un export de la app', async () => {
    const workbook = createMockFinanceWorkbook()
    const excelWorkbook = buildExcelWorkbook(workbook)
    const arrayBuffer = XLSX.write(excelWorkbook, {
      bookType: 'xlsx',
      type: 'array'
    })

    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const file = blob as Blob & { name: string }
    file.name = 'test-export.xlsx'

    const result = await importWorkbookFromExcel(file as unknown as File)
    expect(
      result.ok,
      JSON.stringify({ errors: result.errors, warnings: result.warnings })
    ).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.workbook.months).toHaveLength(2)
    expect(result.workbook.fixedExpenses.length).toBe(
      workbook.fixedExpenses.length
    )
    expect(result.workbook.paymentMethods.length).toBe(
      workbook.paymentMethods.length
    )
  })
})
