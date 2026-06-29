export function PageHeader() {
  return (
    <header className="rounded-3xl border border-white/40 bg-white/65 p-6 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
        Estado Financiero
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">
        Estado Financiero
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-700 md:text-base">
        Gestion financiera mensual desde Excel
      </p>
    </header>
  )
}
