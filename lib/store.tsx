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
  splitAmountEqually,
} from './calculation'
import { createSeedData } from './seed'
import type {
  AppData,
  Balance,
  Expense,
  Member,
  Payment,
  Settlement,
  Transaction,
} from './types'
import { clearStorage, localStorageAdapter } from '@/services/storage'

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface ExpenseInput {
  title: string
  amount: number
  payerId: string
  participantIds: string[]
  note?: string
}

export interface PaymentInput {
  fromMemberId: string
  toMemberId: string
  amount: number
  createdAt?: string
  note?: string
}

interface StoreValue {
  ready: boolean
  members: Member[]
  expenses: Expense[]
  payments: Payment[]
  balances: Balance[]
  settlements: Settlement[]
  transactions: Transaction[]
  totalSpent: number
  spentByMember: Record<string, number>
  getMember: (id: string) => Member | undefined
  getBalance: (id: string) => number
  addExpense: (input: ExpenseInput) => void
  updateExpense: (id: string, input: ExpenseInput) => void
  deleteExpense: (id: string) => void
  addPayment: (input: PaymentInput) => void
  updatePayment: (id: string, input: PaymentInput) => void
  deletePayment: (id: string) => void
  renameMembers: (names: Record<string, string>) => void
  resetToDemo: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => createSeedData())
  const [ready, setReady] = useState(false)

  // Load persisted data on the client after mount to avoid hydration issues.
  useEffect(() => {
    let active = true
    localStorageAdapter.load().then((loaded) => {
      if (active) {
        setData(loaded)
        setReady(true)
      }
    })
    return () => {
      active = false
    }
  }, [])

  // Persist whenever data changes (only after the initial load).
  useEffect(() => {
    if (!ready) return
    void localStorageAdapter.save(data)
  }, [data, ready])

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

  const addExpense = useCallback((input: ExpenseInput) => {
    const expense: Expense = {
      id: newId(),
      title: input.title.trim(),
      amount: input.amount,
      payerId: input.payerId,
      participantIds: input.participantIds,
      participantShares: splitAmountEqually(input.amount, input.participantIds),
      createdAt: new Date().toISOString(),
      note: input.note?.trim() || undefined,
    }
    setData((prev) => ({ ...prev, expenses: [...prev.expenses, expense] }))
  }, [])

  const updateExpense = useCallback((id: string, input: ExpenseInput) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === id
          ? {
              ...e,
              title: input.title.trim(),
              amount: input.amount,
              payerId: input.payerId,
              participantIds: input.participantIds,
              participantShares: splitAmountEqually(
                input.amount,
                input.participantIds,
              ),
              note: input.note?.trim() || undefined,
            }
          : e,
      ),
    }))
  }, [])

  const deleteExpense = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }))
  }, [])

  const addPayment = useCallback((input: PaymentInput) => {
    const payment: Payment = {
      id: newId(),
      fromMemberId: input.fromMemberId,
      toMemberId: input.toMemberId,
      amount: input.amount,
      createdAt: input.createdAt ?? new Date().toISOString(),
      note: input.note?.trim() || undefined,
    }
    setData((prev) => ({ ...prev, payments: [...prev.payments, payment] }))
  }, [])

  const updatePayment = useCallback((id: string, input: PaymentInput) => {
    setData((prev) => ({
      ...prev,
      payments: prev.payments.map((p) =>
        p.id === id
          ? {
              ...p,
              fromMemberId: input.fromMemberId,
              toMemberId: input.toMemberId,
              amount: input.amount,
              createdAt: input.createdAt ?? p.createdAt,
              note: input.note?.trim() || undefined,
            }
          : p,
      ),
    }))
  }, [])

  const deletePayment = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      payments: prev.payments.filter((p) => p.id !== id),
    }))
  }, [])

  const renameMembers = useCallback((names: Record<string, string>) => {
    setData((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        names[m.id] && names[m.id].trim()
          ? { ...m, name: names[m.id].trim() }
          : m,
      ),
    }))
  }, [])

  const resetToDemo = useCallback(() => {
    clearStorage()
    setData(createSeedData())
  }, [])

  const value: StoreValue = {
    ready,
    members: data.members,
    expenses: data.expenses,
    payments: data.payments,
    balances,
    settlements,
    transactions,
    totalSpent,
    spentByMember,
    getMember,
    getBalance,
    addExpense,
    updateExpense,
    deleteExpense,
    addPayment,
    updatePayment,
    deletePayment,
    renameMembers,
    resetToDemo,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}
