import {
  buildFinanceSummary,
  getExpensesGroupedByPaymentMethod,
  getInstallmentChargesForMonth
} from '../../domain/finance/calculations'
import { useFinanceStore } from '../../store/finance-store'
import { InstallmentsPreview } from './components/InstallmentsPreview'
import { MonthSelector } from './components/MonthSelector'
import { PaymentMethodBreakdown } from './components/PaymentMethodBreakdown'
import { SummaryCards } from './components/SummaryCards'

export function DashboardPage() {
  const workbook = useFinanceStore((state) => state.workbook)
  const selectedMonthId = useFinanceStore((state) => state.selectedMonthId)
  const selectMonth = useFinanceStore((state) => state.selectMonth)

  const selectedMonth = workbook.months.find(
    (month) => month.id === selectedMonthId
  )

  if (!selectedMonth) {
    return (
      <section className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">
          Dashboard mensual
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          No hay un mes seleccionado. Crea o selecciona un mes para ver el
          resumen.
        </p>
      </section>
    )
  }

  const summary = buildFinanceSummary(
    selectedMonth,
    workbook.fixedExpenses,
    workbook.paymentMethods,
    workbook.months
  )

  const groupedByPaymentMethod = getExpensesGroupedByPaymentMethod(
    selectedMonth,
    workbook.fixedExpenses,
    workbook.paymentMethods,
    workbook.months
  )

  const activeInstallments = getInstallmentChargesForMonth(
    selectedMonth,
    workbook.months
  )

  return (
    <section className="space-y-4">
      <MonthSelector
        months={workbook.months}
        selectedMonthId={selectedMonthId}
        onSelectMonth={selectMonth}
      />

      <SummaryCards summary={summary} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PaymentMethodBreakdown
          groupedTotals={groupedByPaymentMethod}
          paymentMethods={workbook.paymentMethods}
        />
        <InstallmentsPreview charges={activeInstallments} />
      </div>
    </section>
  )
}
