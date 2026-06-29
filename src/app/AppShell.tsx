import { ActionGrid } from '../components/layout/ActionGrid'
import { PageHeader } from '../components/layout/PageHeader'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { SalarySection } from '../features/salary/SalarySection'
import { ExtraIncomesSection } from '../features/incomes/ExtraIncomesSection'
import { ExpensesSection } from '../features/expenses/ExpensesSection'
import { PaymentMethodsSection } from '../features/payment-methods/PaymentMethodsSection'
import { FixedExpensesSection } from '../features/fixed-expenses/FixedExpensesSection'

export function AppShell() {
  return (
    <div className="app-bg min-h-screen px-4 py-8 md:px-8">
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader />
        <ActionGrid />
        <DashboardPage />
        <div className="grid gap-6">
          <SalarySection />
          <ExtraIncomesSection />
          <ExpensesSection />
          <PaymentMethodsSection />
          <FixedExpensesSection />
        </div>
      </main>
    </div>
  )
}
