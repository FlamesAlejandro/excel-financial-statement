import { useState } from 'react'

import { ActionGrid } from '../components/layout/ActionGrid'
import { PageHeader } from '../components/layout/PageHeader'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { SalarySection } from '../features/salary/SalarySection'
import { ExtraIncomesSection } from '../features/incomes/ExtraIncomesSection'
import { ExpensesSection } from '../features/expenses/ExpensesSection'
import { PaymentMethodsSection } from '../features/payment-methods/PaymentMethodsSection'
import { FixedExpensesSection } from '../features/fixed-expenses/FixedExpensesSection'
import { InstallmentsSection } from '../features/installments/InstallmentsSection'

type CrudTabKey = 'movements' | 'payments'

export function AppShell() {
  const [activeTab, setActiveTab] = useState<CrudTabKey>('movements')

  return (
    <div className="app-bg min-h-screen px-4 py-8 md:px-8">
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader />
        <ActionGrid />
        <DashboardPage />

        <section className="rounded-3xl border border-white/50 bg-white/60 p-4 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={[
                'rounded-xl px-4 py-2 text-sm font-semibold transition',
                activeTab === 'movements'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              ].join(' ')}
              onClick={() => setActiveTab('movements')}
            >
              Movimientos
            </button>
            <button
              type="button"
              className={[
                'rounded-xl px-4 py-2 text-sm font-semibold transition',
                activeTab === 'payments'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              ].join(' ')}
              onClick={() => setActiveTab('payments')}
            >
              Pagos y recurrentes
            </button>
          </div>

          <div
            className={
              activeTab === 'movements' ? 'mt-4 grid gap-6' : 'mt-4 hidden'
            }
            aria-hidden={activeTab !== 'movements'}
          >
            <SalarySection />
            <ExtraIncomesSection />
            <ExpensesSection />
          </div>

          <div
            className={
              activeTab === 'payments' ? 'mt-4 grid gap-6' : 'mt-4 hidden'
            }
            aria-hidden={activeTab !== 'payments'}
          >
            <PaymentMethodsSection />
            <FixedExpensesSection />
            <InstallmentsSection />
          </div>
        </section>
      </main>
    </div>
  )
}
