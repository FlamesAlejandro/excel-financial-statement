import type {
  MonthlyInstallmentCharge,
  PaymentMethod
} from '../../../domain/finance/types'
import { formatCurrencyCLP } from '../../../lib/money'

type InstallmentsPreviewProps = {
  charges: MonthlyInstallmentCharge[]
  paymentMethods: PaymentMethod[]
}

export function InstallmentsPreview({
  charges,
  paymentMethods
}: InstallmentsPreviewProps) {
  const paymentMethodLabelById = paymentMethods.reduce<Record<string, string>>(
    (acc, method) => {
      acc[method.id] = method.name
      return acc
    },
    {}
  )

  return (
    <section className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur">
      <h2 className="text-lg font-semibold text-slate-900">Cuotas activas</h2>

      {charges.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          No hay cuotas activas para el mes seleccionado.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {charges.map((charge) => (
            <li
              key={`${charge.installmentExpenseId}-${charge.installmentNumber}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <p className="text-sm font-semibold text-slate-900">
                {charge.description}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Cuota {charge.installmentNumber}/{charge.installmentsCount}
                {charge.paymentMethodId
                  ? ` · ${paymentMethodLabelById[charge.paymentMethodId] ?? charge.paymentMethodId}`
                  : ''}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {formatCurrencyCLP(charge.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
