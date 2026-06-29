import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { buildFinanceSummary } from '../../domain/finance/calculations'
import { useFinanceStore } from '../../store/finance-store'
import { formatCurrencyCLP } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'

const salarySchema = z.object({
  baseSalary: z.coerce.number().min(0, 'El sueldo debe ser mayor o igual a 0')
})

type SalaryFormInput = z.input<typeof salarySchema>
type SalaryFormOutput = z.output<typeof salarySchema>

export function SalarySection() {
  const workbook = useFinanceStore((state) => state.workbook)
  const selectedMonthId = useFinanceStore((state) => state.selectedMonthId)
  const updateMonthBaseSalary = useFinanceStore(
    (state) => state.updateMonthBaseSalary
  )

  const selectedMonth = workbook.months.find(
    (month) => month.id === selectedMonthId
  )

  const { register, handleSubmit, reset, formState } = useForm<
    SalaryFormInput,
    undefined,
    SalaryFormOutput
  >({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      baseSalary: selectedMonth?.baseSalary ?? 0
    }
  })

  useEffect(() => {
    reset({ baseSalary: selectedMonth?.baseSalary ?? 0 })
  }, [reset, selectedMonth?.baseSalary, selectedMonth?.id])

  if (!selectedMonth) {
    return (
      <Card className="p-6">
        <SectionHeader
          title="Sueldo base"
          description="Selecciona un mes para editar el sueldo base mensual."
        />
      </Card>
    )
  }

  const summary = buildFinanceSummary(
    selectedMonth,
    workbook.fixedExpenses,
    workbook.paymentMethods,
    workbook.months
  )

  const onSubmit = (values: SalaryFormOutput) => {
    updateMonthBaseSalary(selectedMonth.id, values.baseSalary)
  }

  return (
    <Card className="p-6">
      <SectionHeader
        title="Sueldo base mensual"
        description={`Mes seleccionado: ${selectedMonth.label}`}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Sueldo base"
            type="number"
            min={0}
            step="1"
            {...register('baseSalary')}
          />
          {formState.errors.baseSalary ? (
            <p className="text-sm text-rose-600">
              {formState.errors.baseSalary.message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit">Guardar sueldo</Button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Sueldo actual
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrencyCLP(summary.baseSalary)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            El valor se usa para recalcular el resumen mensual en el dashboard.
          </p>
        </div>
      </div>
    </Card>
  )
}
