import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { Expense, PaymentMethod } from '../../domain/finance/types'
import { useFinanceStore } from '../../store/finance-store'
import { formatCurrencyCLP } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Textarea } from '../../components/ui/Textarea'

const expenseSchema = z.object({
  date: z.string().min(1, 'La fecha es obligatoria'),
  description: z.string().trim().min(1, 'La descripción es obligatoria'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  paymentMethodId: z.string().min(1, 'El método de pago es obligatorio'),
  category: z.string().optional(),
  notes: z.string().optional()
})

type ExpenseFormValues = z.infer<typeof expenseSchema>
type ExpenseFormInput = z.input<typeof expenseSchema>
type ExpenseFormOutput = z.output<typeof expenseSchema>

type ExpenseFormDialogProps = {
  open: boolean
  title: string
  initialValues: ExpenseFormOutput
  paymentMethods: PaymentMethod[]
  onClose: () => void
  onSubmit: (values: ExpenseFormOutput) => void
}

const emptyExpenseValues: ExpenseFormValues = {
  date: '',
  description: '',
  amount: 0,
  paymentMethodId: '',
  category: '',
  notes: ''
}

function toDateInputValue(value: string): string {
  return value.slice(0, 10)
}

function toIsoDate(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function ExpenseFormDialog({
  open,
  title,
  initialValues,
  paymentMethods,
  onClose,
  onSubmit
}: ExpenseFormDialogProps) {
  const hasNoPaymentMethods = paymentMethods.length === 0

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ExpenseFormInput, undefined, ExpenseFormOutput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initialValues
  })

  useEffect(() => {
    if (open) {
      reset(initialValues)
    }
  }, [initialValues, open, reset])

  const submitForm = (values: ExpenseFormOutput) => {
    if (hasNoPaymentMethods) {
      return
    }

    onSubmit(values)
    onClose()
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit(submitForm)}>
        {hasNoPaymentMethods ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Crea un método de pago antes de registrar gastos.
          </p>
        ) : null}

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

        <Select
          label="Método de pago"
          disabled={hasNoPaymentMethods}
          {...register('paymentMethodId')}
        >
          <option value="">Selecciona un método</option>
          {paymentMethods.map((method) => (
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

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button
            type="button"
            className="bg-slate-200 text-slate-800 hover:bg-slate-300"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={hasNoPaymentMethods}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function ExpensesSection() {
  const workbook = useFinanceStore((state) => state.workbook)
  const selectedMonthId = useFinanceStore((state) => state.selectedMonthId)
  const addExpense = useFinanceStore((state) => state.addExpense)
  const updateExpense = useFinanceStore((state) => state.updateExpense)
  const deleteExpense = useFinanceStore((state) => state.deleteExpense)

  const selectedMonth = workbook.months.find(
    (month) => month.id === selectedMonthId
  )
  const activePaymentMethods = useMemo(
    () => workbook.paymentMethods.filter((method) => method.isActive),
    [workbook.paymentMethods]
  )

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)

  const expenses = useMemo(
    () =>
      selectedMonth
        ? [...selectedMonth.expenses].sort((a, b) =>
            b.date.localeCompare(a.date)
          )
        : [],
    [selectedMonth]
  )

  const formInitialValues: ExpenseFormOutput = editingExpense
    ? {
        date: toDateInputValue(editingExpense.date),
        description: editingExpense.description,
        amount: editingExpense.amount,
        paymentMethodId: editingExpense.paymentMethodId,
        category: editingExpense.category ?? '',
        notes: editingExpense.notes ?? ''
      }
    : {
        ...emptyExpenseValues,
        paymentMethodId: activePaymentMethods[0]?.id ?? ''
      }

  if (!selectedMonth) {
    return (
      <Card className="p-6">
        <SectionHeader
          title="Gastos normales"
          description="Selecciona un mes para administrar gastos normales."
        />
      </Card>
    )
  }

  const openCreateModal = () => {
    setEditingExpense(null)
    setIsFormOpen(true)
  }

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingExpense(null)
  }

  const handleSave = (values: ExpenseFormValues) => {
    const payload = {
      date: toIsoDate(values.date),
      description: values.description.trim(),
      amount: values.amount,
      paymentMethodId: values.paymentMethodId,
      category: values.category?.trim() || undefined,
      notes: values.notes?.trim() || undefined
    }

    if (editingExpense) {
      updateExpense(selectedMonth.id, editingExpense.id, payload)
      return
    }

    addExpense(selectedMonth.id, payload)
  }

  const paymentMethodLabelById = workbook.paymentMethods.reduce<
    Record<string, string>
  >((acc, method) => {
    acc[method.id] = method.name
    return acc
  }, {})

  return (
    <Card className="p-6">
      <SectionHeader
        title="Gastos normales"
        description={`Mes seleccionado: ${selectedMonth.label}`}
        actions={<Button onClick={openCreateModal}>Agregar gasto</Button>}
      />

      {activePaymentMethods.length === 0 ? (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Crea un método de pago antes de registrar gastos.
        </p>
      ) : null}

      {expenses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No hay gastos normales registrados para este mes.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {expense.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Intl.DateTimeFormat('es-CL').format(
                      new Date(expense.date)
                    )}
                    {expense.category ? ` · ${expense.category}` : ''}
                    {expense.paymentMethodId
                      ? ` · ${paymentMethodLabelById[expense.paymentMethodId] ?? expense.paymentMethodId}`
                      : ''}
                  </p>
                  {expense.notes ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {expense.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <p className="text-base font-semibold text-slate-900">
                    {formatCurrencyCLP(expense.amount)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                      onClick={() => openEditModal(expense)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      className="bg-rose-600 hover:bg-rose-700"
                      onClick={() => setExpenseToDelete(expense)}
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

      <ExpenseFormDialog
        open={isFormOpen}
        title={editingExpense ? 'Editar gasto normal' : 'Nuevo gasto normal'}
        initialValues={formInitialValues}
        paymentMethods={activePaymentMethods}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={expenseToDelete !== null}
        title="Eliminar gasto normal"
        description={`¿Seguro que quieres eliminar "${expenseToDelete?.description ?? ''}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (expenseToDelete) {
            deleteExpense(selectedMonth.id, expenseToDelete.id)
          }
          setExpenseToDelete(null)
        }}
        onCancel={() => setExpenseToDelete(null)}
      />
    </Card>
  )
}
