export type ISODateString = string

export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type PaymentMethodType =
  | 'debit'
  | 'credit_card'
  | 'cash'
  | 'transfer'
  | 'other'

export interface WorkbookMetadata {
  appName: string
  formatVersion: string
  createdAt: ISODateString
  updatedAt: ISODateString
  exportedAt?: ISODateString
}

export interface AppSettings {
  currency: 'CLP'
  locale: 'es-CL'
  defaultBaseSalary: number
}

export interface PaymentMethod {
  id: string
  name: string
  type: PaymentMethodType
  isActive: boolean
  hasMonthlyFee: boolean
  monthlyFeeAmount: number
  notes?: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface ExtraIncome {
  id: string
  date: ISODateString
  description: string
  amount: number
  source?: string
  notes?: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Expense {
  id: string
  date: ISODateString
  description: string
  amount: number
  paymentMethodId: string
  category?: string
  notes?: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  paymentMethodId: string
  startYear: number
  startMonth: number
  endYear?: number
  endMonth?: number
  estimatedChargeDay?: number
  isActive: boolean
  notes?: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface InstallmentExpense {
  id: string
  purchaseDate: ISODateString
  description: string
  totalAmount: number
  installmentsCount: number
  installmentAmount: number
  paymentMethodId: string
  category?: string
  notes?: string
  isActive: boolean
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface MonthlyInstallmentCharge {
  installmentExpenseId: string
  description: string
  paymentMethodId: string
  installmentNumber: number
  installmentsCount: number
  amount: number
  year: number
  month: MonthNumber
}

export interface MonthFinance {
  id: string
  year: number
  month: MonthNumber
  label: string
  baseSalary: number
  extraIncomes: ExtraIncome[]
  expenses: Expense[]
  installmentExpenses: InstallmentExpense[]
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface FinanceSummary {
  baseSalary: number
  extraIncomeTotal: number
  totalAvailable: number
  normalExpensesTotal: number
  fixedExpensesTotal: number
  paymentMethodsMonthlyFeesTotal: number
  installmentsTotal: number
  totalExpenses: number
  remainingMoney: number
}

export interface FinanceWorkbook {
  metadata: WorkbookMetadata
  settings: AppSettings
  paymentMethods: PaymentMethod[]
  fixedExpenses: FixedExpense[]
  months: MonthFinance[]
}
