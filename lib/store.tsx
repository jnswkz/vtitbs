'use client'

// Central state layer. Holds the source-of-truth transaction data and exposes
// actions. Balances and settlements are always derived (via useMemo) from the
// raw expenses + payments, never stored.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  calculateBalances,
  calculateSettlements,
} from './calculation'
import { createSeedData } from './seed'
import type {
  AppData,
  Balance,
  DeletedExpense,
  DeletedPayment,
  Expense,
  Member,
  Payment,
  Settlement,
  Transaction,
} from './types'
import {
  clearStorage,
  mongoStorageAdapter,
  StorageConflictError,
} from '@/services/storage'
import type { ExpenseInput, PaymentInput } from './app-data'

export type { ExpenseInput, PaymentInput } from './app-data'

interface StoreValue {
  ready: boolean
  members: Member[]
  expenses: Expense[]
  payments: Payment[]
  deletedExpenses: DeletedExpense[]
  deletedPayments: DeletedPayment[]
  version: number
  syncError: string | null
  balances: Balance[]
  settlements: Settlement[]
  transactions: Transaction[]
  totalSpent: number
  spentByMember: Record<string, number>
  getMember: (id: string) => Member | undefined
  getBalance: (id: string) => number
  reloadData: () => Promise<void>
  clearSyncError: () => void
  addExpense: (input: ExpenseInput) => Promise<void>
  updateExpense: (id: string, input: ExpenseInput) => Promise<void>
  deleteExpense: (id: string, password: string) => Promise<void>
  restoreExpense: (id: string, password: string) => Promise<void>
  addPayment: (input: PaymentInput) => Promise<void>
  updatePayment: (id: string, input: PaymentInput) => Promise<void>
  deletePayment: (id: string, password: string) => Promise<void>
  restorePayment: (id: string, password: string) => Promise<void>
  renameMembers: (
    names: Record<string, string>,
    password: string,
    bankingQrImages?: Record<string, string>,
  ) => Promise<void>
  resetData: (password: string) => Promise<void>
  exportData: (password: string) => Promise<unknown>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => createSeedData())
  const [ready, setReady] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Load persisted data on the client after mount to avoid hydration issues.
  useEffect(() => {
    let active = true
    mongoStorageAdapter.load().then((loaded) => {
      if (active) {
        setData(loaded)
        setReady(true)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const reloadData = useCallback(async () => {
    const loaded = await mongoStorageAdapter.load()
    setData(loaded)
    setReady(true)
    setSyncError(null)
  }, [])

  const clearSyncError = useCallback(() => setSyncError(null), [])

  const applyMutation = useCallback(async (mutate: () => Promise<AppData>) => {
    try {
      const updated = await mutate()
      setData(updated)
      setSyncError(null)
    } catch (error) {
      if (error instanceof StorageConflictError) {
        setData(error.latest)
        setSyncError(error.message)
      }
      throw error
    }
  }, [])

  const balances = useMemo(
    () => calculateBalances(data.members, data.expenses, data.payments),
    [data.members, data.expenses, data.payments],
  )

  const settlements = useMemo(() => calculateSettlements(balances), [balances])

  const transactions = useMemo<Transaction[]>(() => {
    const expenseTx: Transaction[] = data.expenses.map((e) => ({
      kind: 'expense',
      ...e,
    }))
    const paymentTx: Transaction[] = data.payments.map((p) => ({
      kind: 'payment',
      ...p,
    }))
    return [...expenseTx, ...paymentTx].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [data.expenses, data.payments])

  const totalSpent = useMemo(
    () => data.expenses.reduce((sum, e) => sum + e.amount, 0),
    [data.expenses],
  )

  const spentByMember = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const m of data.members) totals[m.id] = 0
    for (const e of data.expenses) {
      totals[e.payerId] = (totals[e.payerId] ?? 0) + e.amount
    }
    return totals
  }, [data.members, data.expenses])

  const getMember = useCallback(
    (id: string) => data.members.find((m) => m.id === id),
    [data.members],
  )

  const getBalance = useCallback(
    (id: string) => balances.find((b) => b.memberId === id)?.amount ?? 0,
    [balances],
  )

  const addExpense = useCallback(
    (input: ExpenseInput) =>
      applyMutation(() => mongoStorageAdapter.addExpense(data, input)),
    [applyMutation, data],
  )

  const updateExpense = useCallback(
    (id: string, input: ExpenseInput) =>
      applyMutation(() => mongoStorageAdapter.updateExpense(data, id, input)),
    [applyMutation, data],
  )

  const deleteExpense = useCallback(
    (id: string, password: string) =>
      applyMutation(() => mongoStorageAdapter.deleteExpense(data, id, password)),
    [applyMutation, data],
  )

  const restoreExpense = useCallback(
    (id: string, password: string) =>
      applyMutation(() => mongoStorageAdapter.restoreExpense(data, id, password)),
    [applyMutation, data],
  )

  const addPayment = useCallback(
    (input: PaymentInput) =>
      applyMutation(() => mongoStorageAdapter.addPayment(data, input)),
    [applyMutation, data],
  )

  const updatePayment = useCallback(
    (id: string, input: PaymentInput) =>
      applyMutation(() => mongoStorageAdapter.updatePayment(data, id, input)),
    [applyMutation, data],
  )

  const deletePayment = useCallback(
    (id: string, password: string) =>
      applyMutation(() => mongoStorageAdapter.deletePayment(data, id, password)),
    [applyMutation, data],
  )

  const restorePayment = useCallback(
    (id: string, password: string) =>
      applyMutation(() => mongoStorageAdapter.restorePayment(data, id, password)),
    [applyMutation, data],
  )

  const renameMembers = useCallback(
    async (
      names: Record<string, string>,
      password: string,
      bankingQrImages?: Record<string, string>,
    ) => {
      try {
        const updated = await mongoStorageAdapter.renameMembers(
          data,
          names,
          password,
          bankingQrImages,
        )
        setData(updated)
        setSyncError(null)
      } catch (error) {
        if (error instanceof StorageConflictError) {
          setData(error.latest)
          setSyncError(error.message)
        }
        throw error
      }
    },
    [data],
  )

  const resetData = useCallback(async (password: string) => {
    try {
      clearStorage()
      const cleared = await mongoStorageAdapter.reset(data, password)
      setData(cleared)
      setSyncError(null)
    } catch (error) {
      if (error instanceof StorageConflictError) {
        setData(error.latest)
        setSyncError(error.message)
      }
      throw error
    }
  }, [data])

  const exportData = useCallback(
    (password: string) => mongoStorageAdapter.exportData(password),
    [],
  )

  const value: StoreValue = {
    ready,
    members: data.members,
    expenses: data.expenses,
    payments: data.payments,
    deletedExpenses: data.deletedExpenses,
    deletedPayments: data.deletedPayments,
    version: data.version,
    syncError,
    balances,
    settlements,
    transactions,
    totalSpent,
    spentByMember,
    getMember,
    getBalance,
    reloadData,
    clearSyncError,
    addExpense,
    updateExpense,
    deleteExpense,
    restoreExpense,
    addPayment,
    updatePayment,
    deletePayment,
    restorePayment,
    renameMembers,
    resetData,
    exportData,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}
