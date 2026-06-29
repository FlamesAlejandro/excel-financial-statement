import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { ExtraIncome } from '../../domain/finance/types'
import { useFinanceStore } from '../../store/finance-store'
import { formatCurrencyCLP } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Textarea } from '../../components/ui/Textarea'

const incomeSchema = z.object({
  date: z.string().min(1, 'La fecha es obligatoria'),
  description: z.string().trim().min(1, 'La descripción es obligatoria'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  source: z.string().optional(),
  notes: z.string().optional()
})

type IncomeFormValues = z.infer<typeof incomeSchema>
type IncomeFormInput = z.input<typeof incomeSchema>
type IncomeFormOutput = z.output<typeof incomeSchema>

type IncomeFormDialogProps = {
  open: boolean
  title: string
  initialValues: IncomeFormOutput
  onClose: () => void
  onSubmit: (values: IncomeFormOutput) => void
}

const emptyIncomeValues: IncomeFormValues = {
  date: '',
  description: '',
  amount: 0,
  source: '',
  notes: ''
}

function toDateInputValue(value: string): string {
  return value.slice(0, 10)
}

function toIsoDate(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function IncomeFormDialog({
  open,
  title,
  initialValues,
  onClose,
  onSubmit
}: IncomeFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<IncomeFormInput, undefined, IncomeFormOutput>({
    resolver: zodResolver(incomeSchema),
    defaultValues: initialValues
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    }
  }, [initialValues, open, reset])

  const submitForm = (values: IncomeFormOutput) => {
    onSubmit(values)
    onClose()
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit(submitForm)}>
        <Input label="Fecha" type="date" {...register('date')} />
        {errors.date ? (
          <p className="text-sm text-rose-600">{errors.date.message}</p>
        ) : null}

        <Input label="Descripción" {...register('description')} />
        {errors.description ? (
          <p className="text-sm text-rose-600">{errors.description.message}</p>
        ) : null}

        <Input
          label="Monto"
          type="number"
          min={1}
          step="1"
          {...register('amount')}
        />
        {errors.amount ? (
          <p className="text-sm text-rose-600">{errors.amount.message}</p>
        ) : null}

        <Input label="Origen" {...register('source')} />
        <Textarea label="Notas" rows={3} {...register('notes')} />

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button
            type="button"
            className="bg-slate-200 text-slate-800 hover:bg-slate-300"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

export function ExtraIncomesSection() {
  const workbook = useFinanceStore((state) => state.workbook)
  const selectedMonthId = useFinanceStore((state) => state.selectedMonthId)
  const addExtraIncome = useFinanceStore((state) => state.addExtraIncome)
  const updateExtraIncome = useFinanceStore((state) => state.updateExtraIncome)
  const deleteExtraIncome = useFinanceStore((state) => state.deleteExtraIncome)

  const selectedMonth = workbook.months.find(
    (month) => month.id === selectedMonthId
  )
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<ExtraIncome | null>(null)
  const [incomeToDelete, setIncomeToDelete] = useState<ExtraIncome | null>(null)

  const incomes = useMemo(
    () =>
      selectedMonth
        ? [...selectedMonth.extraIncomes].sort((a, b) =>
            b.date.localeCompare(a.date)
          )
        : [],
    [selectedMonth]
  )

  const formInitialValues: IncomeFormOutput = editingIncome
    ? {
        date: toDateInputValue(editingIncome.date),
        description: editingIncome.description,
        amount: editingIncome.amount,
        source: editingIncome.source ?? '',
        notes: editingIncome.notes ?? ''
      }
    : emptyIncomeValues

  if (!selectedMonth) {
    return (
      <Card className="p-6">
        <SectionHeader
          title="Ingresos adicionales"
          description="Selecciona un mes para administrar ingresos adicionales."
        />
      </Card>
    )
  }

  const openCreateModal = () => {
    setEditingIncome(null)
    setIsFormOpen(true)
  }

  const openEditModal = (income: ExtraIncome) => {
    setEditingIncome(income)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingIncome(null)
  }

  const handleSave = (values: IncomeFormValues) => {
    const payload = {
      date: toIsoDate(values.date),
      description: values.description.trim(),
      amount: values.amount,
      source: values.source?.trim() || undefined,
      notes: values.notes?.trim() || undefined
    }

    if (editingIncome) {
      updateExtraIncome(selectedMonth.id, editingIncome.id, payload)
      return
    }

    addExtraIncome(selectedMonth.id, payload)
  }

  return (
    <Card className="p-6">
      <SectionHeader
        title="Ingresos adicionales"
        description={`Mes seleccionado: ${selectedMonth.label}`}
        actions={<Button onClick={openCreateModal}>Agregar ingreso</Button>}
      />

      {incomes.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No hay ingresos adicionales registrados para este mes.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {incomes.map((income) => (
            <li
              key={income.id}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {income.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Intl.DateTimeFormat('es-CL').format(
                      new Date(income.date)
                    )}
                    {income.source ? ` · ${income.source}` : ''}
                  </p>
                  {income.notes ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {income.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <p className="text-base font-semibold text-slate-900">
                    {formatCurrencyCLP(income.amount)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                      onClick={() => openEditModal(income)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      className="bg-rose-600 hover:bg-rose-700"
                      onClick={() => setIncomeToDelete(income)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <IncomeFormDialog
        open={isFormOpen}
        title={
          editingIncome ? 'Editar ingreso adicional' : 'Nuevo ingreso adicional'
        }
        initialValues={formInitialValues}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={incomeToDelete !== null}
        title="Eliminar ingreso adicional"
        description={`¿Seguro que quieres eliminar "${incomeToDelete?.description ?? ''}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (incomeToDelete) {
            deleteExtraIncome(selectedMonth.id, incomeToDelete.id)
          }
          setIncomeToDelete(null)
        }}
        onCancel={() => setIncomeToDelete(null)}
      />
    </Card>
  )
}
