'use client'

import { ArrowRight, PartyPopper } from 'lucide-react'

import { formatVND } from '@/lib/calculation'
import { useStore } from '@/lib/store'
import { MemberAvatar } from '@/components/member-avatar'

export function SettlementCard() {
  const { settlements, getMember } = useStore()

  return (
    <section
      aria-label="Ai cần trả ai"
      className="rounded-3xl border border-border bg-card p-5"
    >
      <h2 className="text-lg font-semibold text-foreground">Ai cần trả ai?</h2>

      {settlements.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-success-muted px-4 py-8 text-center">
          <PartyPopper className="size-7 text-success" />
          <p className="font-medium text-success">
            Không còn khoản nợ nào
          </p>
          <p className="text-sm text-success/80">
            Mọi người đã thanh toán xong.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {settlements.map((s, index) => {
            const from = getMember(s.fromMemberId)
            const to = getMember(s.toMemberId)
            if (!from || !to) return null

            return (
              <li
                key={`${s.fromMemberId}-${s.toMemberId}-${index}`}
                className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <MemberAvatar id={from.id} name={from.name} size="sm" />
                  <span className="truncate text-sm font-medium text-foreground">
                    {from.name}
                  </span>
                </div>

                <div className="flex flex-col items-center px-1">
                  <span className="font-mono text-sm font-semibold tabular-nums text-warning">
                    {formatVND(s.amount)}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
                  <span className="truncate text-right text-sm font-medium text-foreground">
                    {to.name}
                  </span>
                  <MemberAvatar id={to.id} name={to.name} size="sm" />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
