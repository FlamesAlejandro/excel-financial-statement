import type { FinanceSummary } from '../../../domain/finance/types'
import { formatCurrencyCLP } from '../../../lib/money'

type SummaryCardsProps = {
  summary: FinanceSummary
}

type MetricItem = {
  label: string
  value: number
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const metrics: MetricItem[] = [
    { label: 'Sueldo base del mes', value: summary.baseSalary },
    { label: 'Total ingresos adicionales', value: summary.extraIncomeTotal },
    { label: 'Total disponible', value: summary.totalAvailable },
    { label: 'Gastos normales', value: summary.normalExpensesTotal },
    { label: 'Gastos fijos activos', value: summary.fixedExpensesTotal },
    {
      label: 'Cargos fijos mensuales de metodos de pago',
      value: summary.paymentMethodsMonthlyFeesTotal
    },
    { label: 'Cuotas activas del mes', value: summary.installmentsTotal },
    { label: 'Total gastado', value: summary.totalExpenses },
    { label: 'Dinero restante', value: summary.remainingMoney }
  ]

  return (
    <section className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur">
      <h2 className="text-lg font-semibold text-slate-900">Resumen mensual</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              {metric.label}
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatCurrencyCLP(metric.value)}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
