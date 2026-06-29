import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { FixedExpense } from '../../domain/finance/types'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Textarea } from '../../components/ui/Textarea'
import { formatCurrencyCLP } from '../../lib/money'
import { useFinanceStore } from '../../store/finance-store'

const fixedExpenseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  amount: z.coerce.number().min(0, 'El monto debe ser mayor o igual a 0'),
  paymentMethodId: z.string().min(1, 'El método de pago es obligatorio'),
  estimatedChargeDay: z
    .union([z.coerce.number().int().min(1).max(31), z.literal('')])
    .optional(),
  isActive: z.boolean(),
  notes: z.string().optional()
})

type FixedExpenseFormInput = z.input<typeof fixedExpenseSchema>
type FixedExpenseFormOutput = z.output<typeof fixedExpenseSchema>

type FixedExpenseFormDialogProps = {
  open: boolean
  title: string
  initialValues: FixedExpenseFormOutput
  paymentMethodOptions: Array<{ id: string; name: string }>
  onClose: () => void
  onSubmit: (values: FixedExpenseFormOutput) => void
}

const emptyFixedExpenseValues: FixedExpenseFormOutput = {
  name: '',
  amount: 0,
  paymentMethodId: '',
  estimatedChargeDay: '',
  isActive: true,
  notes: ''
}

function FixedExpenseFormDialog({
  open,
  title,
  initialValues,
  paymentMethodOptions,
  onClose,
  onSubmit
}: FixedExpenseFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FixedExpenseFormInput, undefined, FixedExpenseFormOutput>({
    resolver: zodResolver(fixedExpenseSchema),
    defaultValues: initialValues
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    }
  }, [initialValues, open, reset])

  const submitForm = (values: FixedExpenseFormOutput) => {
    onSubmit({
      ...values,
      estimatedChargeDay:
        values.estimatedChargeDay === ''
          ? undefined
          : values.estimatedChargeDay,
      notes: values.notes?.trim() || undefined
    })
    onClose()
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit(submitForm)}>
        <Input label="Nombre" {...register('name')} />
        {errors.name ? (
          <p className="text-sm text-rose-600">{errors.name.message}</p>
        ) : null}

        <Input
          label="Monto"
          type="number"
          min={0}
          step="1"
          {...register('amount')}
        />
        {errors.amount ? (
          <p className="text-sm text-rose-600">{errors.amount.message}</p>
        ) : null}

        <Select label="Método de pago" {...register('paymentMethodId')}>
          <option value="">Selecciona un método</option>
          {paymentMethodOptions.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </Select>
        {errors.paymentMethodId ? (
          <p className="text-sm text-rose-600">
            {errors.paymentMethodId.message}
          </p>
        ) : null}

        <Input
          label="Día estimado de cobro"
          type="number"
          min={1}
          max={31}
          step="1"
          {...register('estimatedChargeDay')}
        />
        {errors.estimatedChargeDay ? (
          <p className="text-sm text-rose-600">
            {errors.estimatedChargeDay.message}
          </p>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isActive')} />
          Gasto fijo activo
        </label>

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

export function FixedExpensesSection() {
  const workbook = useFinanceStore((state) => state.workbook)
  const addFixedExpense = useFinanceStore((state) => state.addFixedExpense)
  const updateFixedExpense = useFinanceStore(
    (state) => state.updateFixedExpense
  )
  const deleteFixedExpense = useFinanceStore(
    (state) => state.deleteFixedExpense
  )

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingFixedExpense, setEditingFixedExpense] =
    useState<FixedExpense | null>(null)
  const [fixedExpenseToDelete, setFixedExpenseToDelete] =
    useState<FixedExpense | null>(null)

  const activePaymentMethods = useMemo(
    () => workbook.paymentMethods.filter((method) => method.isActive),
    [workbook.paymentMethods]
  )

  const paymentMethodLabelById = useMemo(
    () =>
      workbook.paymentMethods.reduce<Record<string, string>>((acc, method) => {
        acc[method.id] = method.name
        return acc
      }, {}),
    [workbook.paymentMethods]
  )

  const fixedExpenses = useMemo(
    () =>
      [...workbook.fixedExpenses].sort((a, b) => a.name.localeCompare(b.name)),
    [workbook.fixedExpenses]
  )

  const openCreateModal = () => {
    setEditingFixedExpense(null)
    setIsFormOpen(true)
  }

  const openEditModal = (fixedExpense: FixedExpense) => {
    setEditingFixedExpense(fixedExpense)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingFixedExpense(null)
  }

  const formInitialValues = useMemo<FixedExpenseFormOutput>(
    () =>
      editingFixedExpense
        ? {
            name: editingFixedExpense.name,
            amount: editingFixedExpense.amount,
            paymentMethodId: editingFixedExpense.paymentMethodId,
            estimatedChargeDay: editingFixedExpense.estimatedChargeDay ?? '',
            isActive: editingFixedExpense.isActive,
            notes: editingFixedExpense.notes ?? ''
          }
        : {
            ...emptyFixedExpenseValues,
            paymentMethodId: activePaymentMethods[0]?.id ?? ''
          },
    [activePaymentMethods, editingFixedExpense]
  )

  const handleSave = (values: FixedExpenseFormOutput) => {
    const payload = {
      name: values.name.trim(),
      amount: values.amount,
      paymentMethodId: values.paymentMethodId,
      estimatedChargeDay:
        values.estimatedChargeDay === ''
          ? undefined
          : values.estimatedChargeDay,
      isActive: values.isActive,
      notes: values.notes?.trim() || undefined
    }

    if (editingFixedExpense) {
      updateFixedExpense(editingFixedExpense.id, payload)
      return
    }

    addFixedExpense(payload)
  }

  return (
    <Card className="p-6">
      <SectionHeader
        title="Gastos fijos"
        description="Administra los gastos fijos que se suman al dashboard cuando están activos."
        actions={<Button onClick={openCreateModal}>Agregar gasto fijo</Button>}
      />

      {fixedExpenses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No hay gastos fijos registrados.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {fixedExpenses.map((fixedExpense) => (
            <li
              key={fixedExpense.id}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {fixedExpense.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {fixedExpense.isActive ? 'Activo' : 'Inactivo'}
                    {fixedExpense.estimatedChargeDay
                      ? ` · Día ${fixedExpense.estimatedChargeDay}`
                      : ''}
                    {fixedExpense.paymentMethodId
                      ? ` · ${paymentMethodLabelById[fixedExpense.paymentMethodId] ?? fixedExpense.paymentMethodId}`
                      : ''}
                  </p>
                  {fixedExpense.notes ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {fixedExpense.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <p className="text-base font-semibold text-slate-900">
                    {formatCurrencyCLP(fixedExpense.amount)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                      onClick={() => openEditModal(fixedExpense)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      className="bg-rose-600 hover:bg-rose-700"
                      onClick={() => setFixedExpenseToDelete(fixedExpense)}
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

      <FixedExpenseFormDialog
        open={isFormOpen}
        title={editingFixedExpense ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}
        initialValues={formInitialValues}
        paymentMethodOptions={activePaymentMethods}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={fixedExpenseToDelete !== null}
        title="Eliminar gasto fijo"
        description={`¿Seguro que quieres eliminar "${fixedExpenseToDelete?.name ?? ''}"? Esta acción no afecta cargos históricos, pero la referencia quedará removida.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (fixedExpenseToDelete) {
            deleteFixedExpense(fixedExpenseToDelete.id)
          }
          setFixedExpenseToDelete(null)
        }}
        onCancel={() => setFixedExpenseToDelete(null)}
      />
    </Card>
  )
}
