import * as XLSX from 'xlsx'

import type { FinanceWorkbook } from '../../domain/finance/types'
import { buildExcelWorkbook } from './excel-export'
import { formatLocalDateTimeForFileName } from './excel-date'
import { importWorkbookFromExcel } from './excel-import'
import { createDefaultFinanceWorkbook } from './excel-template'
import { EXCEL_MIME_TYPE } from './excel-version'

function triggerDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(objectUrl)
}

export function buildExportFileName(date: Date = new Date()): string {
  return `estado-financiero-${formatLocalDateTimeForFileName(date)}.xlsx`
}

export function exportWorkbookToExcel(workbook: FinanceWorkbook): Blob {
  const excelWorkbook = buildExcelWorkbook(workbook)
  const arrayBuffer = XLSX.write(excelWorkbook, {
    bookType: 'xlsx',
    type: 'array'
  })

  return new Blob([arrayBuffer], { type: EXCEL_MIME_TYPE })
}

export function downloadWorkbookExcel(workbook: FinanceWorkbook): void {
  const blob = exportWorkbookToExcel(workbook)
  triggerDownload(blob, buildExportFileName())
}

export { createDefaultFinanceWorkbook }

export function downloadDefaultWorkbookExcel(): void {
  const workbook = createDefaultFinanceWorkbook()
  downloadWorkbookExcel(workbook)
}

export { importWorkbookFromExcel }
