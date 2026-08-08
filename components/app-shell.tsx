'use client'

import { Clock, Home, Plus, Send, Settings } from 'lucide-react'
import { useState } from 'react'

import { useStore } from '@/lib/store'
import type { Expense, Payment } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ExpenseDetailModal } from '@/components/expense-detail-modal'
import { ExpenseFormModal } from '@/components/expense-form-modal'
import { MemberBalanceCards } from '@/components/member-balance-cards'
import { OverviewCard } from '@/components/overview-card'
import { PaymentFormModal } from '@/components/payment-form-modal'
import { SettingsView } from '@/components/settings-view'
import { SettlementCard } from '@/components/settlement-card'
import { TransactionList } from '@/components/transaction-list'

type Tab = 'home' | 'history' | 'settings'

const NAV: { value: Tab; label: string; icon: typeof Home }[] = [
  { value: 'home', label: 'Trang chủ', icon: Home },
  { value: 'history', label: 'Lịch sử', icon: Clock },
  { value: 'settings', label: 'Cài đặt', icon: Settings },
]

export function AppShell() {
  const { ready } = useStore()
  const [tab, setTab] = useState<Tab>('home')

  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const [paymentFormOpen, setPaymentFormOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  const [detailExpense, setDetailExpense] = useState<Expense | null>(null)

  function openAddExpense() {
    setEditingExpense(null)
    setExpenseFormOpen(true)
  }

  function openAddPayment() {
    setEditingPayment(null)
    setPaymentFormOpen(true)
  }

  function openEditExpense(expense: Expense) {
    setDetailExpense(null)
    setEditingExpense(expense)
    setExpenseFormOpen(true)
  }

  function openEditPayment(payment: Payment) {
    setEditingPayment(payment)
    setPaymentFormOpen(true)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Split 3
        </h1>
        <p className="text-sm text-muted-foreground">
          Chia tiền đơn giản cho nhóm 3 người
        </p>
      </header>

      <main className="flex-1 px-5 pb-32">
        {!ready ? (
          <div className="flex flex-col gap-3 pt-8" aria-hidden="true">
            <div className="h-28 animate-pulse rounded-3xl bg-muted" />
            <div className="h-48 animate-pulse rounded-3xl bg-muted" />
            <div className="h-40 animate-pulse rounded-3xl bg-muted" />
          </div>
        ) : tab === 'home' ? (
          <div className="flex flex-col gap-4 pt-1">
            <MemberBalanceCards />
            <SettlementCard />
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" className="h-12" onClick={openAddExpense}>
                <Plus />
                Thêm khoản chi
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12"
                onClick={openAddPayment}
              >
                <Send />
                Trả nợ
              </Button>
            </div>
            <OverviewCard />
          </div>
        ) : tab === 'history' ? (
          <div className="pt-1">
            <TransactionList
              onSelectExpense={setDetailExpense}
              onSelectPayment={openEditPayment}
              onAddExpense={openAddExpense}
            />
          </div>
        ) : (
          <div className="pt-1">
            <SettingsView />
          </div>
        )}
      </main>

      {/* Floating action button (anchored to the right edge of the container) */}
      {tab !== 'settings' ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center">
          <div className="pointer-events-none flex w-full max-w-xl justify-end px-5">
            <button
              type="button"
              onClick={openAddExpense}
              aria-label="Thêm khoản chi"
              className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
            >
              <Plus className="size-6" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Bottom navigation */}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/90 backdrop-blur-md"
      >
        <div className="mx-auto flex w-full max-w-xl items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {NAV.map((item) => {
            const active = tab === item.value
            const Icon = item.icon
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>

      <ExpenseFormModal
        open={expenseFormOpen}
        onClose={() => setExpenseFormOpen(false)}
        editing={editingExpense}
      />
      <PaymentFormModal
        open={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        editing={editingPayment}
      />
      <ExpenseDetailModal
        expense={detailExpense}
        onClose={() => setDetailExpense(null)}
        onEdit={openEditExpense}
      />
    </div>
  )
}
