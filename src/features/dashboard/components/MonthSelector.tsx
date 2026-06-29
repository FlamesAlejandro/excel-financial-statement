import type { MonthFinance } from '../../../domain/finance/types'

type MonthSelectorProps = {
  months: MonthFinance[]
  selectedMonthId: string | null
  onSelectMonth: (monthId: string) => void
}

export function MonthSelector({
  months,
  selectedMonthId,
  onSelectMonth
}: MonthSelectorProps) {
  if (months.length === 0) {
    return null
  }

  return (
    <section className="rounded-3xl border border-white/50 bg-white/60 p-5 shadow-sm backdrop-blur">
      <label
        htmlFor="month-selector"
        className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
      >
        Mes activo
      </label>
      <select
        id="month-selector"
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-emerald-300 focus:ring"
        value={selectedMonthId ?? ''}
        onChange={(event) => onSelectMonth(event.target.value)}
      >
        {months.map((month) => (
          <option key={month.id} value={month.id}>
            {month.label}
          </option>
        ))}
      </select>
    </section>
  )
}
