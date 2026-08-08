'use client'

import { formatVNDSigned } from '@/lib/calculation'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { MemberAvatar } from '@/components/member-avatar'

function statusLabel(amount: number): string {
  if (amount > 0) return 'Cần được nhận'
  if (amount < 0) return 'Cần trả'
  return 'Đã cân bằng'
}

export function MemberBalanceCards() {
  const { members, getBalance } = useStore()

  return (
    <section aria-label="Số dư công nợ của các thành viên">
      <div className="grid grid-cols-3 gap-2.5">
        {members.map((member) => {
          const balance = getBalance(member.id)
          const positive = balance > 0
          const negative = balance < 0

          return (
            <div
              key={member.id}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center"
            >
              <MemberAvatar id={member.id} name={member.name} size="md" />
              <p className="w-full truncate text-sm font-medium text-foreground">
                {member.name}
              </p>
              <p
                className={cn(
                  'font-mono text-sm font-semibold tabular-nums',
                  positive && 'text-success',
                  negative && 'text-warning',
                  !positive && !negative && 'text-muted-foreground',
                )}
              >
                {formatVNDSigned(balance)}
              </p>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  positive && 'bg-success-muted text-success',
                  negative && 'bg-warning-muted text-warning',
                  !positive &&
                    !negative &&
                    'bg-muted text-muted-foreground',
                )}
              >
                {statusLabel(balance)}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
