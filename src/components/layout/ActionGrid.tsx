import { ActionButton } from '../ui/ActionButton'
import {
  downloadDefaultWorkbookExcel,
  downloadWorkbookExcel
} from '../../infrastructure/excel/workbookExcel'
import { useFinanceStore } from '../../store/finance-store'

const actions = [
  'Cargar Excel',
  'Descargar Excel base',
  'Exportar Excel actualizado',
  'Agregar gasto',
  'Agregar ingreso',
  'Administrar metodos de pago',
  'Administrar gastos fijos'
]

export function ActionGrid() {
  const workbook = useFinanceStore((state) => state.workbook)
  const markWorkbookAsExported = useFinanceStore(
    (state) => state.markWorkbookAsExported
  )

  const handleActionClick = (action: string) => {
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
      <h2 className="text-lg font-semibold text-slate-900">Acciones rapidas</h2>
      <p className="mt-1 text-sm text-slate-700">
        Botones visuales iniciales para preparar los siguientes pasos de la app.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <ActionButton
            key={action}
            label={action}
            onClick={() => handleActionClick(action)}
          />
        ))}
      </div>
    </section>
  )
}
