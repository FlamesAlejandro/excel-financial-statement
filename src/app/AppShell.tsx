import { ActionGrid } from '../components/layout/ActionGrid'
import { PageHeader } from '../components/layout/PageHeader'

export function AppShell() {
  return (
    <div className="app-bg min-h-screen px-4 py-8 md:px-8">
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader />
        <ActionGrid />
      </main>
    </div>
  )
}
