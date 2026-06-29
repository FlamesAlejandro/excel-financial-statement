import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Textarea } from '../../components/ui/Textarea'
import { formatCurrencyCLP, roundMoney } from '../../lib/money'
import { useFinanceStore } from '../../store/finance-store'
import type { InstallmentExpense } from '../../domain/finance/types'

const installmentExpenseSchema = z.object({
  purchaseDate: z.string().min(1, 'La fecha de compra es obligatoria'),
  description: z.string().trim().min(1, 'La descripción es obligatoria'),
  totalAmount: z.coerce.number().positive('El monto total debe ser mayor a 0'),
  installmentsCount: z.coerce
    .number()
    .int()
    .min(2, 'Debe tener al menos 2 cuotas'),
  paymentMethodId: z.string().min(1, 'El método de pago es obligatorio'),
  category: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean()
})

type InstallmentExpenseFormInput = z.input<typeof installmentExpenseSchema>
type InstallmentExpenseFormOutput = z.output<typeof installmentExpenseSchema>

type InstallmentExpenseFormDialogProps = {
  open: boolean
  title: string
  initialValues: InstallmentExpenseFormOutput
  paymentMethodOptions: Array<{ id: string; name: string }>
  onClose: () => void
  onSubmit: (values: InstallmentExpenseFormOutput) => void
}

const emptyInstallmentValues: InstallmentExpenseFormOutput = {
  purchaseDate: '',
  description: '',
  totalAmount: 0,
  installmentsCount: 2,
  paymentMethodId: '',
  category: '',
  notes: '',
  isActive: true
}

function toDateInputValue(value: string): string {
  return value.slice(0, 10)
}

function toIsoDate(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function InstallmentExpenseFormDialog({
  open,
  title,
  initialValues,
  paymentMethodOptions,
  onClose,
  onSubmit
}: InstallmentExpenseFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<
    InstallmentExpenseFormInput,
    undefined,
    InstallmentExpenseFormOutput
  >({
    resolver: zodResolver(installmentExpenseSchema),
    defaultValues: initialValues
  })

  const watchedTotalAmount = watch('totalAmount')
  const watchedInstallmentsCount = watch('installmentsCount')
  const totalAmount =
    typeof watchedTotalAmount === 'number'
      ? watchedTotalAmount
      : Number(watchedTotalAmount ?? 0)
  const installmentsCount =
    typeof watchedInstallmentsCount === 'number'
      ? watchedInstallmentsCount
      : Number(watchedInstallmentsCount ?? 0)
  const installmentAmount = useMemo(() => {
    if (
      !Number.isFinite(totalAmount) ||
      !Number.isFinite(installmentsCount) ||
      installmentsCount <= 0
    ) {
      return 0
    }

    return roundMoney(totalAmount / installmentsCount)
  }, [installmentsCount, totalAmount])

  useEffect(() => {
    if (open) {
      reset(initialValues)
    }
  }, [initialValues, open, reset])

  const submitForm = (values: InstallmentExpenseFormOutput) => {
    onSubmit({
      ...values,
      category: values.category?.trim() || undefined,
      notes: values.notes?.trim() || undefined
    })
    onClose()
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit(submitForm)}>
        <Input
          label="Fecha de compra"
          type="date"
          {...register('purchaseDate')}
        />
        {errors.purchaseDate ? (
          <p className="text-sm text-rose-600">{errors.purchaseDate.message}</p>
        ) : null}

        <Input label="Descripción" {...register('description')} />
        {errors.description ? (
          <p className="text-sm text-rose-600">{errors.description.message}</p>
        ) : null}

        <Input
          label="Monto total"
          type="number"
          min={1}
          step="1"
          {...register('totalAmount')}
        />
        {errors.totalAmount ? (
          <p className="text-sm text-rose-600">{errors.totalAmount.message}</p>
        ) : null}

        <Input
          label="Número de cuotas"
          type="number"
          min={2}
          step="1"
          {...register('installmentsCount')}
        />
        {errors.installmentsCount ? (
          <p className="text-sm text-rose-600">
            {errors.installmentsCount.message}
          </p>
        ) : null}

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Monto de cuota calculado:{' '}
          <strong>{formatCurrencyCLP(installmentAmount)}</strong>
        </div>

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

        <Input label="Categoría" {...register('category')} />
        <Textarea label="Notas" rows={3} {...register('notes')} />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isActive')} />
          Gasto en cuotas activo
        </label>

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

function formatPurchaseDate(dateText: string): string {
  return new Intl.DateTimeFormat('es-CL').format(new Date(dateText))
}

export function InstallmentsSection() {
  const workbook = useFinanceStore((state) => state.workbook)
  const selectedMonthId = useFinanceStore((state) => state.selectedMonthId)
  const addInstallmentExpense = useFinanceStore(
    (state) => state.addInstallmentExpense
  )
  const updateInstallmentExpense = useFinanceStore(
    (state) => state.updateInstallmentExpense
  )
  const deleteInstallmentExpense = useFinanceStore(
    (state) => state.deleteInstallmentExpense
  )

  const selectedMonth = workbook.months.find(
    (month) => month.id === selectedMonthId
  )
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingInstallment, setEditingInstallment] =
    useState<InstallmentExpense | null>(null)
  const [installmentToDelete, setInstallmentToDelete] =
    useState<InstallmentExpense | null>(null)

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

  const installmentExpenses = useMemo(
    () =>
      selectedMonth
        ? [...selectedMonth.installmentExpenses].sort((a, b) =>
            b.purchaseDate.localeCompare(a.purchaseDate)
          )
        : [],
    [selectedMonth]
  )

  const formInitialValues: InstallmentExpenseFormOutput = editingInstallment
    ? {
        purchaseDate: toDateInputValue(editingInstallment.purchaseDate),
        description: editingInstallment.description,
        totalAmount: editingInstallment.totalAmount,
        installmentsCount: editingInstallment.installmentsCount,
        paymentMethodId: editingInstallment.paymentMethodId,
        category: editingInstallment.category ?? '',
        notes: editingInstallment.notes ?? '',
        isActive: editingInstallment.isActive
      }
    : {
        ...emptyInstallmentValues,
        paymentMethodId: activePaymentMethods[0]?.id ?? ''
      }

  if (!selectedMonth) {
    return (
      <Card className="p-6">
        <SectionHeader
          title="Gastos en cuotas"
          description="Selecciona un mes para administrar gastos en cuotas."
        />
      </Card>
    )
  }

  const openCreateModal = () => {
    setEditingInstallment(null)
    setIsFormOpen(true)
  }

  const openEditModal = (installment: InstallmentExpense) => {
    setEditingInstallment(installment)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingInstallment(null)
  }

  const handleSave = (values: InstallmentExpenseFormOutput) => {
    const installmentAmount = roundMoney(
      values.totalAmount / values.installmentsCount
    )

    const payload = {
      purchaseDate: toIsoDate(values.purchaseDate),
      description: values.description.trim(),
      totalAmount: values.totalAmount,
      installmentsCount: values.installmentsCount,
      installmentAmount,
      paymentMethodId: values.paymentMethodId,
      category: values.category?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      isActive: values.isActive
    }

    if (editingInstallment) {
      updateInstallmentExpense(selectedMonth.id, editingInstallment.id, payload)
      return
    }

    addInstallmentExpense(selectedMonth.id, payload)
  }

  return (
    <Card className="p-6">
      <SectionHeader
        title="Gastos en cuotas"
        description={`Mes seleccionado: ${selectedMonth.label}`}
        actions={
          <Button onClick={openCreateModal}>Agregar gasto en cuotas</Button>
        }
      />

      {installmentExpenses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No hay gastos en cuotas registrados para este mes.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {installmentExpenses.map((installment) => (
            <li
              key={installment.id}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {installment.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatPurchaseDate(installment.purchaseDate)} ·{' '}
                    {installment.isActive ? 'Activo' : 'Inactivo'}
                    {installment.category ? ` · ${installment.category}` : ''}
                    {installment.paymentMethodId
                      ? ` · ${paymentMethodLabelById[installment.paymentMethodId] ?? installment.paymentMethodId}`
                      : ''}
                  </p>
                  {installment.notes ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {installment.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <div className="text-right text-sm text-slate-700">
                    <p>
                      Monto total: {formatCurrencyCLP(installment.totalAmount)}
                    </p>
                    <p>
                      Cuota: {formatCurrencyCLP(installment.installmentAmount)}{' '}
                      · {installment.installmentsCount} cuota(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                      onClick={() => openEditModal(installment)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      className="bg-rose-600 hover:bg-rose-700"
                      onClick={() => setInstallmentToDelete(installment)}
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

      <InstallmentExpenseFormDialog
        open={isFormOpen}
        title={
          editingInstallment
            ? 'Editar gasto en cuotas'
            : 'Nuevo gasto en cuotas'
        }
        initialValues={formInitialValues}
        paymentMethodOptions={activePaymentMethods}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={installmentToDelete !== null}
        title="Eliminar gasto en cuotas"
        description={`¿Seguro que quieres eliminar "${installmentToDelete?.description ?? ''}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (installmentToDelete) {
            deleteInstallmentExpense(selectedMonth.id, installmentToDelete.id)
          }
          setInstallmentToDelete(null)
        }}
        onCancel={() => setInstallmentToDelete(null)}
      />
    </Card>
  )
}
