import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

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
import type {
  PaymentMethod,
  PaymentMethodType
} from '../../domain/finance/types'

const paymentMethodTypes: Array<{ value: PaymentMethodType; label: string }> = [
  { value: 'debit', label: 'Débito' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' }
]

const paymentMethodSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  type: z.enum(['debit', 'credit_card', 'cash', 'transfer', 'other']),
  isActive: z.boolean(),
  hasMonthlyFee: z.boolean(),
  monthlyFeeAmount: z.coerce
    .number()
    .min(0, 'El cargo mensual debe ser mayor o igual a 0'),
  notes: z.string().optional()
})

type PaymentMethodFormInput = z.input<typeof paymentMethodSchema>
type PaymentMethodFormOutput = z.output<typeof paymentMethodSchema>

type PaymentMethodFormDialogProps = {
  open: boolean
  title: string
  initialValues: PaymentMethodFormOutput
  onClose: () => void
  onSubmit: (values: PaymentMethodFormOutput) => void
}

const emptyPaymentMethodValues: PaymentMethodFormOutput = {
  name: '',
  type: 'debit',
  isActive: true,
  hasMonthlyFee: false,
  monthlyFeeAmount: 0,
  notes: ''
}

function PaymentMethodFormDialog({
  open,
  title,
  initialValues,
  onClose,
  onSubmit
}: PaymentMethodFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors }
  } = useForm<PaymentMethodFormInput, undefined, PaymentMethodFormOutput>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: initialValues
  })

  const hasMonthlyFee = useWatch({ control, name: 'hasMonthlyFee' })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    }
  }, [initialValues, open, reset])

  useEffect(() => {
    if (!hasMonthlyFee) {
      setValue('monthlyFeeAmount', 0, { shouldDirty: true })
    }
  }, [hasMonthlyFee, setValue])

  const submitForm = (values: PaymentMethodFormOutput) => {
    onSubmit({
      ...values,
      monthlyFeeAmount: values.hasMonthlyFee ? values.monthlyFeeAmount : 0,
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

        <Select label="Tipo" {...register('type')}>
          {paymentMethodTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        {errors.type ? (
          <p className="text-sm text-rose-600">{errors.type.message}</p>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isActive')} />
          Método activo
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('hasMonthlyFee')} />
          Tiene cargo mensual
        </label>

        <Input
          label="Cargo mensual"
          type="number"
          min={0}
          step="1"
          {...register('monthlyFeeAmount')}
          disabled={!hasMonthlyFee}
        />
        {errors.monthlyFeeAmount ? (
          <p className="text-sm text-rose-600">
            {errors.monthlyFeeAmount.message}
          </p>
        ) : null}

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

function countPaymentMethodReferences(
  workbook: ReturnType<typeof useFinanceStore.getState>['workbook'],
  paymentMethodId: string
): { expenses: number; fixedExpenses: number; installments: number } {
  const expenses = workbook.months.reduce(
    (acc, month) =>
      acc +
      month.expenses.filter(
        (expense) => expense.paymentMethodId === paymentMethodId
      ).length,
    0
  )
  const fixedExpenses = workbook.fixedExpenses.filter(
    (fixedExpense) => fixedExpense.paymentMethodId === paymentMethodId
  ).length
  const installments = workbook.months.reduce(
    (acc, month) =>
      acc +
      month.installmentExpenses.filter(
        (installmentExpense) =>
          installmentExpense.paymentMethodId === paymentMethodId
      ).length,
    0
  )

  return { expenses, fixedExpenses, installments }
}

export function PaymentMethodsSection() {
  const workbook = useFinanceStore((state) => state.workbook)
  const addPaymentMethod = useFinanceStore((state) => state.addPaymentMethod)
  const updatePaymentMethod = useFinanceStore(
    (state) => state.updatePaymentMethod
  )
  const deletePaymentMethod = useFinanceStore(
    (state) => state.deletePaymentMethod
  )

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPaymentMethod, setEditingPaymentMethod] =
    useState<PaymentMethod | null>(null)
  const [paymentMethodToDelete, setPaymentMethodToDelete] =
    useState<PaymentMethod | null>(null)

  const paymentMethods = useMemo(
    () =>
      [...workbook.paymentMethods].sort((a, b) => a.name.localeCompare(b.name)),
    [workbook.paymentMethods]
  )

  const openCreateModal = () => {
    setEditingPaymentMethod(null)
    setIsFormOpen(true)
  }

  const openEditModal = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingPaymentMethod(null)
  }

  const formInitialValues = useMemo<PaymentMethodFormOutput>(
    () =>
      editingPaymentMethod
        ? {
            name: editingPaymentMethod.name,
            type: editingPaymentMethod.type,
            isActive: editingPaymentMethod.isActive,
            hasMonthlyFee: editingPaymentMethod.hasMonthlyFee,
            monthlyFeeAmount: editingPaymentMethod.monthlyFeeAmount,
            notes: editingPaymentMethod.notes ?? ''
          }
        : emptyPaymentMethodValues,
    [editingPaymentMethod]
  )

  const handleSave = (values: PaymentMethodFormOutput) => {
    const monthlyFeeAmount = values.hasMonthlyFee
      ? Math.max(0, values.monthlyFeeAmount)
      : 0
    const hasMonthlyFee = values.hasMonthlyFee && monthlyFeeAmount > 0

    const payload = {
      name: values.name.trim(),
      type: values.type,
      isActive: values.isActive,
      hasMonthlyFee,
      monthlyFeeAmount,
      notes: values.notes?.trim() || undefined
    }

    if (editingPaymentMethod) {
      updatePaymentMethod(editingPaymentMethod.id, payload)
      return
    }

    addPaymentMethod(payload)
  }

  const deletionWarning = paymentMethodToDelete
    ? countPaymentMethodReferences(workbook, paymentMethodToDelete.id)
    : null

  return (
    <Card className="p-6">
      <SectionHeader
        title="Métodos de pago"
        description="Administra los métodos de pago usados en gastos y gastos fijos."
        actions={<Button onClick={openCreateModal}>Agregar método</Button>}
      />

      {paymentMethods.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No hay métodos de pago registrados.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {paymentMethods.map((paymentMethod) => (
            <li
              key={paymentMethod.id}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {paymentMethod.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {paymentMethod.type} ·{' '}
                    {paymentMethod.isActive ? 'Activo' : 'Inactivo'}
                    {paymentMethod.hasMonthlyFee
                      ? ` · Cargo ${formatCurrencyCLP(paymentMethod.monthlyFeeAmount)}`
                      : ' · Sin cargo mensual'}
                  </p>
                  {paymentMethod.notes ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {paymentMethod.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                    onClick={() => openEditModal(paymentMethod)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    className="bg-rose-600 hover:bg-rose-700"
                    onClick={() => setPaymentMethodToDelete(paymentMethod)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PaymentMethodFormDialog
        open={isFormOpen}
        title={
          editingPaymentMethod
            ? 'Editar método de pago'
            : 'Nuevo método de pago'
        }
        initialValues={formInitialValues}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={paymentMethodToDelete !== null}
        title="Eliminar método de pago"
        description={
          paymentMethodToDelete && deletionWarning
            ? `"${paymentMethodToDelete.name}" se usa en ${deletionWarning.expenses} gasto(s), ${deletionWarning.fixedExpenses} gasto(s) fijo(s) y ${deletionWarning.installments} cuota(s). Si lo eliminas, esas referencias quedarán inválidas.`
            : `¿Seguro que quieres eliminar "${paymentMethodToDelete?.name ?? ''}"?`
        }
        confirmLabel="Eliminar de todos modos"
        onConfirm={() => {
          if (paymentMethodToDelete) {
            deletePaymentMethod(paymentMethodToDelete.id)
          }
          setPaymentMethodToDelete(null)
        }}
        onCancel={() => setPaymentMethodToDelete(null)}
      />
    </Card>
  )
}
