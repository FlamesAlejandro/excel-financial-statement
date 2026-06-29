import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { MonthFinance } from '../../../domain/finance/types'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { Select } from '../../../components/ui/Select'

const createMonthSchema = z.object({
  year: z.coerce.number().int().min(1970).max(9999),
  month: z.coerce.number().int().min(1).max(12)
})

type CreateMonthInput = z.input<typeof createMonthSchema>
type CreateMonthOutput = z.output<typeof createMonthSchema>

const monthOptions = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
] as const

type MonthSelectorProps = {
  months: MonthFinance[]
  selectedMonthId: string | null
  onSelectMonth: (monthId: string) => void
  onCreateMonth: (year: number, month: number) => void
}

export function MonthSelector({
  months,
  selectedMonthId,
  onSelectMonth,
  onCreateMonth
}: MonthSelectorProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateMonthInput, undefined, CreateMonthOutput>({
    resolver: zodResolver(createMonthSchema),
    defaultValues: {
      year: currentYear,
      month: currentMonth
    }
  })

  useEffect(() => {
    if (isCreateModalOpen) {
      reset({ year: currentYear, month: currentMonth })
      setCreateError(null)
    }
  }, [currentMonth, currentYear, isCreateModalOpen, reset])

  const submitCreateMonth = (values: CreateMonthOutput) => {
    const duplicate = months.some(
      (month) => month.year === values.year && month.month === values.month
    )

    if (duplicate) {
      setCreateError('Ese mes ya existe. Elige otro año o mes.')
      return
    }

    onCreateMonth(values.year, values.month)
    setIsCreateModalOpen(false)
    setCreateError(null)
  }

  return (
    <section className="rounded-3xl border border-white/50 bg-white/60 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:max-w-sm">
          {months.length === 0 ? (
            <p className="text-sm text-slate-600">
              No hay meses todavía. Crea uno para comenzar.
            </p>
          ) : (
            <Select
              label="Mes activo"
              id="month-selector"
              value={selectedMonthId ?? ''}
              onChange={(event) => onSelectMonth(event.target.value)}
            >
              {months.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.label}
                </option>
              ))}
            </Select>
          )}
        </div>

        <Button type="button" onClick={() => setIsCreateModalOpen(true)}>
          Crear mes
        </Button>
      </div>

      <Modal
        open={isCreateModalOpen}
        title="Crear nuevo mes"
        onClose={() => setIsCreateModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSubmit(submitCreateMonth)}>
          <Input
            label="Año"
            type="number"
            min={1970}
            max={9999}
            {...register('year')}
          />
          {errors.year ? (
            <p className="text-sm text-rose-600">Año inválido.</p>
          ) : null}

          <Select label="Mes" {...register('month')}>
            {monthOptions.map((monthOption) => (
              <option key={monthOption.value} value={monthOption.value}>
                {monthOption.label}
              </option>
            ))}
          </Select>
          {errors.month ? (
            <p className="text-sm text-rose-600">Mes inválido.</p>
          ) : null}

          {createError ? (
            <p className="text-sm text-rose-600">{createError}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button
              type="button"
              className="bg-slate-200 text-slate-800 hover:bg-slate-300"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Crear mes</Button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
