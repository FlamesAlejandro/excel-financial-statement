import type { FinanceWorkbook } from './types'

export function createMockFinanceWorkbook(): FinanceWorkbook {
  const nowIso = '2026-07-15T12:00:00.000Z'

  const paymentMethodIds = {
    debit: 'pm_debit',
    cash: 'pm_cash',
    transfer: 'pm_transfer',
    cmr: 'pm_cmr',
    cencosud: 'pm_cencosud'
  } as const

  return {
    metadata: {
      appName: 'Estado Financiero',
      formatVersion: '1.0.0',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: nowIso
    },
    settings: {
      currency: 'CLP',
      locale: 'es-CL',
      defaultBaseSalary: 1200000
    },
    paymentMethods: [
      {
        id: paymentMethodIds.debit,
        name: 'Debito',
        type: 'debit',
        isActive: true,
        hasMonthlyFee: false,
        monthlyFeeAmount: 0,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: nowIso
      },
      {
        id: paymentMethodIds.cash,
        name: 'Efectivo',
        type: 'cash',
        isActive: true,
        hasMonthlyFee: false,
        monthlyFeeAmount: 0,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: nowIso
      },
      {
        id: paymentMethodIds.transfer,
        name: 'Transferencia',
        type: 'transfer',
        isActive: true,
        hasMonthlyFee: false,
        monthlyFeeAmount: 0,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: nowIso
      },
      {
        id: paymentMethodIds.cmr,
        name: 'CMR',
        type: 'credit_card',
        isActive: true,
        hasMonthlyFee: true,
        monthlyFeeAmount: 5990,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: nowIso
      },
      {
        id: paymentMethodIds.cencosud,
        name: 'Cencosud',
        type: 'credit_card',
        isActive: true,
        hasMonthlyFee: false,
        monthlyFeeAmount: 0,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: nowIso
      }
    ],
    fixedExpenses: [
      {
        id: 'fx_internet',
        name: 'Internet',
        amount: 24990,
        paymentMethodId: paymentMethodIds.transfer,
        startYear: 2026,
        startMonth: 6,
        estimatedChargeDay: 5,
        isActive: true,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: nowIso
      },
      {
        id: 'fx_luz',
        name: 'Luz',
        amount: 31990,
        paymentMethodId: paymentMethodIds.transfer,
        startYear: 2026,
        startMonth: 6,
        estimatedChargeDay: 10,
        isActive: true,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: nowIso
      },
      {
        id: 'fx_agua',
        name: 'Agua',
        amount: 18990,
        paymentMethodId: paymentMethodIds.transfer,
        startYear: 2026,
        startMonth: 6,
        estimatedChargeDay: 12,
        isActive: true,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: nowIso
      },
      {
        id: 'fx_celular',
        name: 'Celular',
        amount: 15990,
        paymentMethodId: paymentMethodIds.cmr,
        startYear: 2026,
        startMonth: 6,
        estimatedChargeDay: 18,
        isActive: true,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: nowIso
      }
    ],
    months: [
      {
        id: 'm_2026_07',
        year: 2026,
        month: 7,
        label: 'Julio 2026',
        baseSalary: 1250000,
        extraIncomes: [
          {
            id: 'inc_2026_07_01',
            date: '2026-07-08T00:00:00.000Z',
            description: 'Freelance diseno',
            amount: 120000,
            source: 'Freelance',
            createdAt: '2026-07-08T00:00:00.000Z',
            updatedAt: nowIso
          }
        ],
        expenses: [
          {
            id: 'exp_2026_07_01',
            date: '2026-07-03T00:00:00.000Z',
            description: 'Supermercado',
            amount: 85750,
            paymentMethodId: paymentMethodIds.debit,
            category: 'Hogar',
            createdAt: '2026-07-03T00:00:00.000Z',
            updatedAt: nowIso
          },
          {
            id: 'exp_2026_07_02',
            date: '2026-07-15T00:00:00.000Z',
            description: 'Transporte',
            amount: 42000,
            paymentMethodId: paymentMethodIds.cash,
            category: 'Movilidad',
            createdAt: '2026-07-15T00:00:00.000Z',
            updatedAt: nowIso
          }
        ],
        installmentExpenses: [],
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: nowIso
      },
      {
        id: 'm_2026_06',
        year: 2026,
        month: 6,
        label: 'Junio 2026',
        baseSalary: 1200000,
        extraIncomes: [
          {
            id: 'inc_2026_06_01',
            date: '2026-06-20T00:00:00.000Z',
            description: 'Venta de articulos',
            amount: 90000,
            source: 'Venta',
            createdAt: '2026-06-20T00:00:00.000Z',
            updatedAt: nowIso
          }
        ],
        expenses: [
          {
            id: 'exp_2026_06_01',
            date: '2026-06-04T00:00:00.000Z',
            description: 'Bencina',
            amount: 60000,
            paymentMethodId: paymentMethodIds.debit,
            category: 'Movilidad',
            createdAt: '2026-06-04T00:00:00.000Z',
            updatedAt: nowIso
          },
          {
            id: 'exp_2026_06_02',
            date: '2026-06-11T00:00:00.000Z',
            description: 'Farmacia',
            amount: 21500,
            paymentMethodId: paymentMethodIds.cash,
            category: 'Salud',
            createdAt: '2026-06-11T00:00:00.000Z',
            updatedAt: nowIso
          }
        ],
        installmentExpenses: [
          {
            id: 'ins_2026_06_01',
            purchaseDate: '2026-06-12T00:00:00.000Z',
            description: 'Notebook trabajo',
            totalAmount: 720000,
            installmentsCount: 6,
            installmentAmount: 120000,
            paymentMethodId: paymentMethodIds.cmr,
            category: 'Tecnologia',
            isActive: true,
            createdAt: '2026-06-12T00:00:00.000Z',
            updatedAt: nowIso
          }
        ],
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: nowIso
      }
    ]
  }
}
