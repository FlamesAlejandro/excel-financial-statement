import type { PaymentMethod } from '../../../domain/finance/types'
import { formatCurrencyCLP } from '../../../lib/money'

type PaymentMethodBreakdownProps = {
  groupedTotals: Record<string, number>
  paymentMethods: PaymentMethod[]
}

type BreakdownRow = {
  id: string
  name: string
  total: number
}

export function PaymentMethodBreakdown({
  groupedTotals,
  paymentMethods
}: PaymentMethodBreakdownProps) {
  const rows: BreakdownRow[] = Object.entries(groupedTotals)
    .map(([id, total]) => ({
      id,
      name: paymentMethods.find((method) => method.id === id)?.name ?? id,
      total
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <section className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur">
      <h2 className="text-lg font-semibold text-slate-900">
        Desglose por metodo de pago
      </h2>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          No hay movimientos para este mes.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className="text-sm font-medium text-slate-800">
                {row.name}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {formatCurrencyCLP(row.total)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
