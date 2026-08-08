'use client'

import { ArrowRight, Receipt, Send } from 'lucide-react'
import { useState } from 'react'

import { formatVND } from '@/lib/calculation'
import { useStore } from '@/lib/store'
import type { Expense, Payment } from '@/lib/types'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'expense' | 'payment'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'expense', label: 'Khoản chi' },
  { value: 'payment', label: 'Trả nợ' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function TransactionList({
  onSelectExpense,
  onSelectPayment,
  onAddExpense,
}: {
  onSelectExpense: (expense: Expense) => void
  onSelectPayment: (payment: Payment) => void
  onAddExpense: () => void
}) {
  const { transactions, getMember } = useStore()
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = transactions.filter((t) =>
    filter === 'all' ? true : t.kind === filter,
  )

  return (
    <section aria-label="Lịch sử giao dịch" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Lịch sử</h2>
        <div
          role="tablist"
          aria-label="Lọc giao dịch"
          className="flex gap-1 rounded-full bg-secondary p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filter === f.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card px-4 py-12 text-center">
          <Receipt className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filter === 'payment'
              ? 'Chưa có khoản trả nợ nào'
              : 'Chưa có khoản chi nào'}
          </p>
          {filter !== 'payment' ? (
            <button
              onClick={onAddExpense}
              className="text-sm font-medium text-primary hover:underline"
            >
              Thêm khoản chi đầu tiên
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filtered.map((t) => {
            if (t.kind === 'expense') {
              const payer = getMember(t.payerId)
              const perShare =
                t.participantShares.length > 0
                  ? t.participantShares
                  : []
              const equal =
                perShare.length > 0 &&
                perShare.every((s) => s.amount === perShare[0].amount)
              return (
                <li key={`e-${t.id}`}>
                  <button
                    onClick={() => onSelectExpense(t)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Receipt className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-foreground">
                          {t.title}
                        </span>
                        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
                          {formatVND(t.amount)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">
                          {payer?.name ?? '—'} đã trả
                          {equal
                            ? ` · mỗi người ${formatVND(perShare[0].amount)}`
                            : ' · chia không đều'}
                        </span>
                        <span className="shrink-0">{formatDate(t.createdAt)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            }

            const from = getMember(t.fromMemberId)
            const to = getMember(t.toMemberId)
            return (
              <li key={`p-${t.id}`}>
                <button
                  onClick={() => onSelectPayment(t)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-muted text-success">
                    <Send className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 truncate font-medium text-foreground">
                        {from?.name ?? '—'}
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                        {to?.name ?? '—'}
                      </span>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-success">
                        {formatVND(t.amount)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">Trả nợ{t.note ? ` · ${t.note}` : ''}</span>
                      <span className="shrink-0">{formatDate(t.createdAt)}</span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
