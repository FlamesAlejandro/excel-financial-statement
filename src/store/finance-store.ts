import { create } from 'zustand'

import { getMonthLabel, sortYearMonthsDesc } from '../lib/date'
import { createId } from '../lib/ids'
import { createMockFinanceWorkbook } from '../domain/finance/mock'
import type {
  Expense,
  ExtraIncome,
  FinanceWorkbook,
  FixedExpense,
  InstallmentExpense,
  MonthFinance,
  MonthNumber,
  PaymentMethod
} from '../domain/finance/types'

type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>
type ExpenseUpdate = Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>

type ExtraIncomeInput = Omit<ExtraIncome, 'id' | 'createdAt' | 'updatedAt'>
type ExtraIncomeUpdate = Partial<
  Omit<ExtraIncome, 'id' | 'createdAt' | 'updatedAt'>
>

type PaymentMethodInput = Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>
type PaymentMethodUpdate = Partial<
  Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>
>

type FixedExpenseInput = Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>
type FixedExpenseUpdate = Partial<
  Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>
>

type InstallmentExpenseInput = Omit<
  InstallmentExpense,
  'id' | 'createdAt' | 'updatedAt'
>
type InstallmentExpenseUpdate = Partial<
  Omit<InstallmentExpense, 'id' | 'createdAt' | 'updatedAt'>
>

interface FinanceStoreState {
  workbook: FinanceWorkbook
  selectedMonthId: string | null
  fileName: string | null
  isLoading: boolean
  importErrors: string[]
  importWarnings: string[]
  hasUnsavedChanges: boolean
}

interface FinanceStoreActions {
  setWorkbook: (workbook: FinanceWorkbook) => void
  markWorkbookAsExported: () => void
  startWorkbookImport: () => void
  finishWorkbookImportSuccess: (params: {
    workbook: FinanceWorkbook
    fileName: string | null
    warnings: string[]
  }) => void
  finishWorkbookImportFailure: (params: {
    errors: string[]
    warnings: string[]
  }) => void
  resetToMockWorkbook: () => void
  selectMonth: (monthId: string) => void
  createMonth: (year: number, month: number) => void
  updateMonthBaseSalary: (monthId: string, baseSalary: number) => void

  addExpense: (monthId: string, input: ExpenseInput) => void
  updateExpense: (
    monthId: string,
    expenseId: string,
    data: ExpenseUpdate
  ) => void
  deleteExpense: (monthId: string, expenseId: string) => void

  addExtraIncome: (monthId: string, input: ExtraIncomeInput) => void
  updateExtraIncome: (
    monthId: string,
    incomeId: string,
    data: ExtraIncomeUpdate
  ) => void
  deleteExtraIncome: (monthId: string, incomeId: string) => void

  addPaymentMethod: (input: PaymentMethodInput) => void
  updatePaymentMethod: (id: string, data: PaymentMethodUpdate) => void
  deletePaymentMethod: (id: string) => void

  addFixedExpense: (input: FixedExpenseInput) => void
  updateFixedExpense: (id: string, data: FixedExpenseUpdate) => void
  deleteFixedExpense: (id: string) => void

  addInstallmentExpense: (
    monthId: string,
    input: InstallmentExpenseInput
  ) => void
  updateInstallmentExpense: (
    monthId: string,
    id: string,
    data: InstallmentExpenseUpdate
  ) => void
  deleteInstallmentExpense: (monthId: string, id: string) => void
}

export type FinanceStore = FinanceStoreState & FinanceStoreActions

const getNowIso = (): string => new Date().toISOString()

const getValidSelectedMonthId = (
  selectedMonthId: string | null,
  months: MonthFinance[]
): string | null => {
  if (selectedMonthId && months.some((month) => month.id === selectedMonthId)) {
    return selectedMonthId
  }

  return months[0]?.id ?? null
}

const normalizeWorkbookMonths = (
  workbook: FinanceWorkbook
): FinanceWorkbook => ({
  ...workbook,
  months: sortYearMonthsDesc(workbook.months)
})

const createInitialState = (): FinanceStoreState => {
  const workbook = normalizeWorkbookMonths(createMockFinanceWorkbook())

  return {
    workbook,
    selectedMonthId: workbook.months[0]?.id ?? null,
    fileName: null,
    isLoading: false,
    importErrors: [],
    importWarnings: [],
    hasUnsavedChanges: false
  }
}

const updateWorkbookMetadata = (
  workbook: FinanceWorkbook,
  updatedAt: string
): FinanceWorkbook => ({
  ...workbook,
  metadata: {
    ...workbook.metadata,
    updatedAt
  }
})

const isValidMonthNumber = (month: number): month is MonthNumber =>
  Number.isInteger(month) && month >= 1 && month <= 12

const mapMonthById = (
  workbook: FinanceWorkbook,
  monthId: string,
  updater: (month: MonthFinance, nowIso: string) => MonthFinance
): FinanceWorkbook | null => {
  const nowIso = getNowIso()
  let found = false

  const months = workbook.months.map((month) => {
    if (month.id !== monthId) {
      return month
    }

    found = true
    return updater(month, nowIso)
  })

  if (!found) {
    return null
  }

  return {
    ...workbook,
    months
  }
}

export const useFinanceStore = create<FinanceStore>((set) => ({
  ...createInitialState(),

  setWorkbook: (workbook) => {
    const normalizedWorkbook = normalizeWorkbookMonths(workbook)

    set((state) => ({
      workbook: normalizedWorkbook,
      selectedMonthId: getValidSelectedMonthId(
        state.selectedMonthId,
        normalizedWorkbook.months
      ),
      hasUnsavedChanges: false,
      importErrors: [],
      importWarnings: []
    }))
  },

  markWorkbookAsExported: () => {
    set(() => ({
      hasUnsavedChanges: false
    }))
  },

  startWorkbookImport: () => {
    set(() => ({
      isLoading: true,
      importErrors: [],
      importWarnings: []
    }))
  },

  finishWorkbookImportSuccess: ({ workbook, fileName, warnings }) => {
    const normalizedWorkbook = normalizeWorkbookMonths(workbook)

    set(() => ({
      workbook: normalizedWorkbook,
      selectedMonthId: normalizedWorkbook.months[0]?.id ?? null,
      fileName,
      isLoading: false,
      importErrors: [],
      importWarnings: warnings,
      hasUnsavedChanges: false
    }))
  },

  finishWorkbookImportFailure: ({ errors, warnings }) => {
    set(() => ({
      isLoading: false,
      importErrors: errors,
      importWarnings: warnings
    }))
  },

  resetToMockWorkbook: () => {
    const initial = createInitialState()
    set(() => initial)
  },

  selectMonth: (monthId) => {
    set((state) => {
      const exists = state.workbook.months.some((month) => month.id === monthId)
      if (!exists) {
        return state
      }

      return {
        selectedMonthId: monthId
      }
    })
  },

  createMonth: (year, month) => {
    set((state) => {
      if (!Number.isInteger(year) || !isValidMonthNumber(month)) {
        return state
      }

      const duplicate = state.workbook.months.some(
        (item) => item.year === year && item.month === month
      )
      if (duplicate) {
        return state
      }

      const nowIso = getNowIso()
      const baseSalaryFromLatestMonth =
        state.workbook.months[0]?.baseSalary ??
        state.workbook.settings.defaultBaseSalary

      const newMonth: MonthFinance = {
        id: createId('month'),
        year,
        month,
        label: getMonthLabel(year, month),
        baseSalary: baseSalaryFromLatestMonth,
        extraIncomes: [],
        expenses: [],
        installmentExpenses: [],
        createdAt: nowIso,
        updatedAt: nowIso
      }

      const workbook = updateWorkbookMetadata(
        {
          ...state.workbook,
          months: sortYearMonthsDesc([...state.workbook.months, newMonth])
        },
        nowIso
      )

      return {
        workbook,
        selectedMonthId: newMonth.id,
        hasUnsavedChanges: true
      }
    })
  },

  updateMonthBaseSalary: (monthId, baseSalary) => {
    set((state) => {
      const nextWorkbook = mapMonthById(
        state.workbook,
        monthId,
        (month, nowIso) => ({
          ...month,
          baseSalary,
          updatedAt: nowIso
        })
      )

      if (!nextWorkbook) {
        return state
      }

      const nowIso = getNowIso()
      return {
        workbook: updateWorkbookMetadata(nextWorkbook, nowIso),
        selectedMonthId: getValidSelectedMonthId(
          state.selectedMonthId,
          nextWorkbook.months
        ),
        hasUnsavedChanges: true
      }
    })
  },

  addExpense: (monthId, input) => {
    set((state) => {
      const nextWorkbook = mapMonthById(
        state.workbook,
        monthId,
        (month, nowIso) => ({
          ...month,
          expenses: [
            ...month.expenses,
            {
              ...input,
              id: createId('exp'),
              createdAt: nowIso,
              updatedAt: nowIso
            }
          ],
          updatedAt: nowIso
        })
      )

      if (!nextWorkbook) {
        return state
      }

      const nowIso = getNowIso()
      return {
        workbook: updateWorkbookMetadata(nextWorkbook, nowIso),
        hasUnsavedChanges: true
      }
    })
  },

  updateExpense: (monthId, expenseId, data) => {
    set((state) => {
      const nextWorkbook = mapMonthById(
        state.workbook,
        monthId,
        (month, nowIso) => {
          let changed = false
          const expenses = month.expenses.map((expense) => {
            if (expense.id !== expenseId) {
              return expense
            }

            changed = true
            return {
              ...expense,
              ...data,
              updatedAt: nowIso
            }
          })

          if (!changed) {
            return month
          }

          return {
            ...month,
            expenses,
            updatedAt: nowIso
          }
        }
      )

      if (!nextWorkbook) {
        return state
      }

      const month = nextWorkbook.months.find((item) => item.id === monthId)
      const hasExpense = month?.expenses.some((item) => item.id === expenseId)
      if (!hasExpense) {
        return state
      }

      const nowIso = getNowIso()
      return {
        workbook: updateWorkbookMetadata(nextWorkbook, nowIso),
        hasUnsavedChanges: true
      }
    })
  },

  deleteExpense: (monthId, expenseId) => {
    set((state) => {
      const nextWorkbook = mapMonthById(
        state.workbook,
        monthId,
        (month, nowIso) => {
          const expenses = month.expenses.filter(
            (expense) => expense.id !== expenseId
          )
          if (expenses.length === month.expenses.length) {
            return month
          }

          return {
            ...month,
            expenses,
            updatedAt: nowIso
          }
        }
      )

      if (!nextWorkbook) {
        return state
      }

      const originalMonth = state.workbook.months.find(
        (month) => month.id === monthId
      )
      const removed = originalMonth?.expenses.some(
        (expense) => expense.id === expenseId
      )
      if (!removed) {
        return state
      }

      const nowIso = getNowIso()
      return {
        workbook: updateWorkbookMetadata(nextWorkbook, nowIso),
        hasUnsavedChanges: true
      }
    })
  },

  addExtraIncome: (monthId, input) => {
    set((state) => {
      const nextWorkbook = mapMonthById(
        state.workbook,
        monthId,
        (month, nowIso) => ({
          ...month,
          extraIncomes: [
            ...month.extraIncomes,
            {
              ...input,
              id: createId('income'),
              createdAt: nowIso,
              updatedAt: nowIso
            }
          ],
          updatedAt: nowIso
        })
      )

      if (!nextWorkbook) {
        return state
      }

      const nowIso = getNowIso()
      return {
        workbook: updateWorkbookMetadata(nextWorkbook, nowIso),
        hasUnsavedChanges: true
      }
    })
  },

  updateExtraIncome: (monthId, incomeId, data) => {
    set((state) => {
      const originalMonth = state.workbook.months.find(
        (month) => month.id === monthId
      )
      const exists = originalMonth?.extraIncomes.some(
        (income) => income.id === incomeId
      )
      if (!exists) {
        return state
      }

      const nextWorkbook = mapMonthById(
        state.workbook,
        monthId,
        (month, nowIso) => ({
          ...month,
          extraIncomes: month.extraIncomes.map((income) =>
            income.id === incomeId
              ? {
                  ...income,
                  ...data,
                  updatedAt: nowIso
                }
              : income
          ),
          updatedAt: nowIso
        })
      )

      if (!nextWorkbook) {
        return state
      }

      const nowIso = getNowIso()
      return {
        workbook: updateWorkbookMetadata(nextWorkbook, nowIso),
        hasUnsavedChanges: true
      }
    })
  },

  deleteExtraIncome: (monthId, incomeId) => {
    set((state) => {
      const originalMonth = state.workbook.months.find(
        (month) => month.id === monthId
      )
      const exists = originalMonth?.extraIncomes.some(
        (income) => income.id === incomeId
      )
      if (!exists) {
        return state
      }

      const nextWorkbook = mapMonthById(
        state.workbook,
        monthId,
        (month, nowIso) => ({
          ...month,
          extraIncomes: month.extraIncomes.filter(
            (income) => income.id !== incomeId
          ),
          updatedAt: nowIso
        })
      )

      if (!nextWorkbook) {
        return state
      }

      const nowIso = getNowIso()
      return {
        workbook: updateWorkbookMetadata(nextWorkbook, nowIso),
        hasUnsavedChanges: true
      }
    })
  },

  addPaymentMethod: (input) => {
    set((state) => {
      const nowIso = getNowIso()
      const workbook = updateWorkbookMetadata(
        {
          ...state.workbook,
          paymentMethods: [
            ...state.workbook.paymentMethods,
            {
              ...input,
              id: createId('pm'),
              createdAt: nowIso,
              updatedAt: nowIso
            }
          ]
        },
        nowIso
      )

      return {
        workbook,
        hasUnsavedChanges: true
      }
    })
  },

  updatePaymentMethod: (id, data) => {
    set((state) => {
      const exists = state.workbook.paymentMethods.some(
        (method) => method.id === id
      )
      if (!exists) {
        return state
      }

      const nowIso = getNowIso()
      const workbook = updateWorkbookMetadata(
        {
          ...state.workbook,
          paymentMethods: state.workbook.paymentMethods.map((method) =>
            method.id === id
              ? {
                  ...method,
                  ...data,
                  updatedAt: nowIso
                }
              : method
          )
        },
        nowIso
      )

      return {
        workbook,
        hasUnsavedChanges: true
      }
    })
  },

  deletePaymentMethod: (id) => {
    set((state) => {
      const paymentMethods = state.workbook.paymentMethods.filter(
        (method) => method.id !== id
      )
      if (paymentMethods.length === state.workbook.paymentMethods.length) {
        return state
      }

      const nowIso = getNowIso()
      const workbook = updateWorkbookMetadata(
        {
          ...state.workbook,
          paymentMethods
        },
        nowIso
      )

      return {
        workbook,
        hasUnsavedChanges: true
      }
    })
  },

  addFixedExpense: (input) => {
    set((state) => {
      const nowIso = getNowIso()
      const workbook = updateWorkbookMetadata(
        {
          ...state.workbook,
          fixedExpenses: [
            ...state.workbook.fixedExpenses,
            {
              ...input,
              id: createId('fixed'),
              createdAt: nowIso,
              updatedAt: nowIso
            }
          ]
        },
        nowIso
      )

      return {
        workbook,
        hasUnsavedChanges: true
      }
    })
  },

  updateFixedExpense: (id, data) => {
    set((state) => {
      const exists = state.workbook.fixedExpenses.some(
        (expense) => expense.id === id
      )
      if (!exists) {
        return state
      }

      const nowIso = getNowIso()
      const workbook = updateWorkbookMetadata(
        {
          ...state.workbook,
          fixedExpenses: state.workbook.fixedExpenses.map((expense) =>
            expense.id === id
              ? {
                  ...expense,
                  ...data,
                  updatedAt: nowIso
                }
              : expense
          )
        },
        nowIso
      )

      return {
        workbook,
        hasUnsavedChanges: true
      }
    })
  },

  deleteFixedExpense: (id) => {
    set((state) => {
      const fixedExpenses = state.workbook.fixedExpenses.filter(
        (expense) => expense.id !== id
      )
      if (fixedExpenses.length === state.workbook.fixedExpenses.length) {
        return state
      }

      const nowIso = getNowIso()
      const workbook = updateWorkbookMetadata(
        {
          ...state.workbook,
          fixedExpenses
        },
        nowIso
      )

      return {
        workbook,
        hasUnsavedChanges: true
      }
    })
  },

  addInstallmentExpense: (monthId, input) => {
    set((state) => {
      const nextWorkbook = mapMonthById(
        state.workbook,
        monthId,
        (month, nowIso) => ({
          ...month,
          installmentExpenses: [
            ...month.installmentExpenses,
            {
              ...input,
              id: createId('installment'),
              createdAt: nowIso,
              updatedAt: nowIso
            }
          ],
          updatedAt: nowIso
        })
      )

      if (!nextWorkbook) {
        return state
      }

      const nowIso = getNowIso()
      return {
        workbook: updateWorkbookMetadata(nextWorkbook, nowIso),
        hasUnsavedChanges: true
      }
    })
  },

  updateInstallmentExpense: (monthId, id, data) => {
    set((state) => {
      const originalMonth = state.workbook.months.find(
        (month) => month.id === monthId
      )
      const exists = originalMonth?.installmentExpenses.some(
        (installmentExpense) => installmentExpense.id === id
      )
      if (!exists) {
        return state
      }

      const nextWorkbook = mapMonthById(
        state.workbook,
        monthId,
        (month, nowIso) => ({
          ...month,
          installmentExpenses: month.installmentExpenses.map(
            (installmentExpense) =>
              installmentExpense.id === id
                ? {
                    ...installmentExpense,
                    ...data,
                    updatedAt: nowIso
                  }
                : installmentExpense
          ),
          updatedAt: nowIso
        })
      )

      if (!nextWorkbook) {
        return state
      }

      const nowIso = getNowIso()
      return {
        workbook: updateWorkbookMetadata(nextWorkbook, nowIso),
        hasUnsavedChanges: true
      }
    })
  },

  deleteInstallmentExpense: (monthId, id) => {
    set((state) => {
      const originalMonth = state.workbook.months.find(
        (month) => month.id === monthId
      )
      const exists = originalMonth?.installmentExpenses.some(
        (installmentExpense) => installmentExpense.id === id
      )
      if (!exists) {
        return state
      }

      const nextWorkbook = mapMonthById(
        state.workbook,
        monthId,
        (month, nowIso) => ({
          ...month,
          installmentExpenses: month.installmentExpenses.filter(
            (installmentExpense) => installmentExpense.id !== id
          ),
          updatedAt: nowIso
        })
      )

      if (!nextWorkbook) {
        return state
      }

      const nowIso = getNowIso()
      return {
        workbook: updateWorkbookMetadata(nextWorkbook, nowIso),
        hasUnsavedChanges: true
      }
    })
  }
}))
