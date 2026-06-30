import type {
  FinanceSummary,
  FixedExpense,
  MonthFinance,
  MonthlyInstallmentCharge,
  PaymentMethod
} from './types'

type YearMonth = {
  year: number
  month: number
}

function toSafeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function sumAmounts(items: number[]): number {
  return items.reduce((acc, current) => acc + toSafeNumber(current), 0)
}

function getMonthsDiff(from: YearMonth, to: YearMonth): number {
  return (to.year - from.year) * 12 + (to.month - from.month)
}

function compareYearMonth(a: YearMonth, b: YearMonth): number {
  const aKey = a.year * 12 + (a.month - 1)
  const bKey = b.year * 12 + (b.month - 1)
  return aKey - bKey
}

function isFixedExpenseActiveForMonth(
  fixedExpense: FixedExpense,
  targetMonth: YearMonth
): boolean {
  if (!fixedExpense.isActive) {
    return false
  }

  const startsAt: YearMonth = {
    year: fixedExpense.startYear,
    month: fixedExpense.startMonth
  }

  if (compareYearMonth(targetMonth, startsAt) < 0) {
    return false
  }

  if (
    fixedExpense.endYear === undefined ||
    fixedExpense.endMonth === undefined
  ) {
    return true
  }

  const endsAt: YearMonth = {
    year: fixedExpense.endYear,
    month: fixedExpense.endMonth
  }

  return compareYearMonth(targetMonth, endsAt) <= 0
}

function parseIsoYearMonth(dateText: string): YearMonth | null {
  const match = dateText.match(/^(\d{4})-(\d{2})-\d{2}/)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null
  }

  return { year, month }
}

export function getExtraIncomeTotal(month: MonthFinance): number {
  return sumAmounts(month.extraIncomes.map((income) => income.amount))
}

export function getNormalExpensesTotal(month: MonthFinance): number {
  return sumAmounts(month.expenses.map((expense) => expense.amount))
}

export function getActiveFixedExpensesTotal(
  targetMonth: MonthFinance,
  fixedExpenses: FixedExpense[]
): number {
  return sumAmounts(
    fixedExpenses
      .filter((fixedExpense) =>
        isFixedExpenseActiveForMonth(fixedExpense, {
          year: targetMonth.year,
          month: targetMonth.month
        })
      )
      .map((fixedExpense) => fixedExpense.amount)
  )
}

export function getPaymentMethodsMonthlyFeesTotal(
  paymentMethods: PaymentMethod[]
): number {
  return sumAmounts(
    paymentMethods
      .filter((method) => method.isActive && method.hasMonthlyFee)
      .map((method) => method.monthlyFeeAmount)
  )
}

export function getInstallmentChargesForMonth(
  targetMonth: MonthFinance,
  allMonths: MonthFinance[]
): MonthlyInstallmentCharge[] {
  const charges: MonthlyInstallmentCharge[] = []

  for (const month of allMonths) {
    for (const installmentExpense of month.installmentExpenses) {
      if (!installmentExpense.isActive) {
        continue
      }

      const purchaseYearMonth = parseIsoYearMonth(
        installmentExpense.purchaseDate
      )
      if (!purchaseYearMonth) {
        continue
      }

      const monthDiff = getMonthsDiff(purchaseYearMonth, {
        year: targetMonth.year,
        month: targetMonth.month
      })

      if (
        monthDiff < 0 ||
        monthDiff >= installmentExpense.installmentsCount ||
        installmentExpense.installmentsCount <= 0
      ) {
        continue
      }

      charges.push({
        installmentExpenseId: installmentExpense.id,
        description: installmentExpense.description,
        paymentMethodId: installmentExpense.paymentMethodId,
        installmentNumber: monthDiff + 1,
        installmentsCount: installmentExpense.installmentsCount,
        amount: installmentExpense.installmentAmount,
        year: targetMonth.year,
        month: targetMonth.month
      })
    }
  }

  return charges
}

export function getInstallmentsTotalForMonth(
  targetMonth: MonthFinance,
  allMonths: MonthFinance[]
): number {
  return sumAmounts(
    getInstallmentChargesForMonth(targetMonth, allMonths).map((charge) =>
      toSafeNumber(charge.amount)
    )
  )
}

export function getTotalAvailableForMonth(month: MonthFinance): number {
  return toSafeNumber(month.baseSalary) + getExtraIncomeTotal(month)
}

export function getTotalExpensesForMonth(
  month: MonthFinance,
  fixedExpenses: FixedExpense[],
  paymentMethods: PaymentMethod[],
  allMonths: MonthFinance[]
): number {
  const normalExpensesTotal = getNormalExpensesTotal(month)
  const fixedExpensesTotal = getActiveFixedExpensesTotal(month, fixedExpenses)
  const paymentMethodsMonthlyFeesTotal =
    getPaymentMethodsMonthlyFeesTotal(paymentMethods)
  const installmentsTotal = getInstallmentsTotalForMonth(month, allMonths)

  return (
    normalExpensesTotal +
    fixedExpensesTotal +
    paymentMethodsMonthlyFeesTotal +
    installmentsTotal
  )
}

export function getRemainingMoneyForMonth(
  month: MonthFinance,
  fixedExpenses: FixedExpense[],
  paymentMethods: PaymentMethod[],
  allMonths: MonthFinance[]
): number {
  return (
    getTotalAvailableForMonth(month) -
    getTotalExpensesForMonth(month, fixedExpenses, paymentMethods, allMonths)
  )
}

export function buildFinanceSummary(
  month: MonthFinance,
  fixedExpenses: FixedExpense[],
  paymentMethods: PaymentMethod[],
  allMonths: MonthFinance[]
): FinanceSummary {
  const baseSalary = toSafeNumber(month.baseSalary)
  const extraIncomeTotal = getExtraIncomeTotal(month)
  const totalAvailable = getTotalAvailableForMonth(month)
  const normalExpensesTotal = getNormalExpensesTotal(month)
  const fixedExpensesTotal = getActiveFixedExpensesTotal(month, fixedExpenses)
  const paymentMethodsMonthlyFeesTotal =
    getPaymentMethodsMonthlyFeesTotal(paymentMethods)
  const installmentsTotal = getInstallmentsTotalForMonth(month, allMonths)
  const totalExpenses =
    normalExpensesTotal +
    fixedExpensesTotal +
    paymentMethodsMonthlyFeesTotal +
    installmentsTotal
  const remainingMoney = totalAvailable - totalExpenses

  return {
    baseSalary,
    extraIncomeTotal,
    totalAvailable,
    normalExpensesTotal,
    fixedExpensesTotal,
    paymentMethodsMonthlyFeesTotal,
    installmentsTotal,
    totalExpenses,
    remainingMoney
  }
}

export function getExpensesGroupedByPaymentMethod(
  month: MonthFinance,
  fixedExpenses: FixedExpense[],
  paymentMethods: PaymentMethod[],
  allMonths: MonthFinance[]
): Record<string, number> {
  const grouped: Record<string, number> = {}

  const addAmount = (paymentMethodId: string, amount: number): void => {
    grouped[paymentMethodId] =
      toSafeNumber(grouped[paymentMethodId] ?? 0) + toSafeNumber(amount)
  }

  for (const expense of month.expenses) {
    addAmount(expense.paymentMethodId, expense.amount)
  }

  for (const fixedExpense of fixedExpenses) {
    if (
      isFixedExpenseActiveForMonth(fixedExpense, {
        year: month.year,
        month: month.month
      })
    ) {
      addAmount(fixedExpense.paymentMethodId, fixedExpense.amount)
    }
  }

  for (const method of paymentMethods) {
    if (method.isActive && method.hasMonthlyFee) {
      addAmount(method.id, method.monthlyFeeAmount)
    }
  }

  const installmentCharges = getInstallmentChargesForMonth(month, allMonths)
  for (const charge of installmentCharges) {
    addAmount(charge.paymentMethodId, charge.amount)
  }

  return grouped
}
