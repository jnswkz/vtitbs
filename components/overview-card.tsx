'use client'

import { formatVND } from '@/lib/calculation'
import { useStore } from '@/lib/store'
import { MemberAvatar } from '@/components/member-avatar'

export function OverviewCard() {
  const { totalSpent, expenses, payments, members, spentByMember } = useStore()

  return (
    <section
      aria-label="Tổng quan chi tiêu"
      className="rounded-3xl border border-border bg-card p-5"
    >
      <h2 className="text-lg font-semibold text-foreground">Tổng quan</h2>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-secondary/60 p-3">
          <p className="font-mono text-base font-semibold tabular-nums text-foreground">
            {formatVND(totalSpent)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Tổng chi tiêu</p>
        </div>
        <div className="rounded-2xl bg-secondary/60 p-3">
          <p className="text-base font-semibold text-foreground">
            {expenses.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Khoản chi</p>
        </div>
        <div className="rounded-2xl bg-secondary/60 p-3">
          <p className="text-base font-semibold text-foreground">
            {payments.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Lần trả nợ</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">
          Mỗi người đã trả
        </p>
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-3 py-1.5"
          >
            <div className="flex items-center gap-2.5">
              <MemberAvatar id={member.id} name={member.name} size="sm" />
              <span className="text-sm text-foreground">{member.name}</span>
            </div>
            <span className="font-mono text-sm tabular-nums text-foreground">
              {formatVND(spentByMember[member.id] ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
