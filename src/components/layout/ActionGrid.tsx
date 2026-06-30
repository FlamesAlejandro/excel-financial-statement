import { useRef } from 'react'
import type { ChangeEvent } from 'react'

import { ActionButton } from '../ui/ActionButton'
import {
  downloadDefaultWorkbookExcel,
  downloadWorkbookExcel,
  importWorkbookFromExcel
} from '../../infrastructure/excel/workbookExcel'
import { useFinanceStore } from '../../store/finance-store'

const actions = [
  'Cargar Excel',
  'Descargar Excel base',
  'Exportar Excel actualizado'
]

export function ActionGrid() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const workbook = useFinanceStore((state) => state.workbook)
  const isLoading = useFinanceStore((state) => state.isLoading)
  const importErrors = useFinanceStore((state) => state.importErrors)
  const importWarnings = useFinanceStore((state) => state.importWarnings)
  const fileName = useFinanceStore((state) => state.fileName)
  const hasUnsavedChanges = useFinanceStore((state) => state.hasUnsavedChanges)
  const markWorkbookAsExported = useFinanceStore(
    (state) => state.markWorkbookAsExported
  )
  const startWorkbookImport = useFinanceStore(
    (state) => state.startWorkbookImport
  )
  const finishWorkbookImportSuccess = useFinanceStore(
    (state) => state.finishWorkbookImportSuccess
  )
  const finishWorkbookImportFailure = useFinanceStore(
    (state) => state.finishWorkbookImportFailure
  )

  const handleExcelFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    startWorkbookImport()

    try {
      const result = await importWorkbookFromExcel(file)

      if (!result.ok) {
        finishWorkbookImportFailure({
          errors: result.errors,
          warnings: result.warnings
        })
        return
      }

      finishWorkbookImportSuccess({
        workbook: result.workbook,
        fileName: result.fileName,
        warnings: result.warnings
      })
    } catch {
      finishWorkbookImportFailure({
        errors: ['No se pudo cargar el archivo Excel seleccionado.'],
        warnings: []
      })
    } finally {
      event.target.value = ''
    }
  }

  const handleActionClick = (action: string) => {
    if (action === 'Cargar Excel') {
      fileInputRef.current?.click()
      return
    }

    if (action === 'Descargar Excel base') {
      downloadDefaultWorkbookExcel()
      return
    }

    if (action === 'Exportar Excel actualizado') {
      downloadWorkbookExcel(workbook)
      markWorkbookAsExported()
    }
  }

  return (
    <section className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleExcelFileChange}
      />

      <h2 className="text-lg font-semibold text-slate-900">
        Archivo financiero
      </h2>
      <p className="mt-1 text-sm text-slate-700">
        Carga, descarga y exportación del archivo financiero.
      </p>
      {fileName ? (
        <p className="mt-1 text-xs text-slate-600">
          Archivo cargado: {fileName}
        </p>
      ) : null}
      {hasUnsavedChanges ? (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Hay cambios sin exportar. Recuerda generar un Excel actualizado.
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <ActionButton
            key={action}
            label={action}
            onClick={() => handleActionClick(action)}
            disabled={isLoading}
          />
        ))}
      </div>

      {importErrors.length > 0 ? (
        <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3">
          <p className="text-sm font-semibold text-rose-700">
            Error al importar Excel
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-700">
            {importErrors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {importWarnings.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-700">
            Advertencias de importación
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
            {importWarnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
