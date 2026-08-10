'use client'

import { ArrowRight, PartyPopper } from 'lucide-react'
import { useState } from 'react'

import { formatVND } from '@/lib/calculation'
import { getBankingQrUrl } from '@/lib/banking-qr'
import { useStore } from '@/lib/store'
import { MemberAvatar } from '@/components/member-avatar'
import { Modal } from '@/components/modal'

interface SelectedQr {
  url: string
  memberName: string
  amount: number
}

export function SettlementCard() {
  const { settlements, getMember } = useStore()
  const [selectedQr, setSelectedQr] = useState<SelectedQr | null>(null)

  return (
    <>
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
              const qrUrl = getBankingQrUrl(to)

              return (
                <li
                  key={`${s.fromMemberId}-${s.toMemberId}-${index}`}
                  className="flex flex-col gap-3 rounded-2xl bg-secondary/60 p-3"
                >
                  <div className="flex items-center gap-3">
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
                  </div>

                  {qrUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedQr({
                          url: qrUrl,
                          memberName: to.name,
                          amount: s.amount,
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <img
                        src={qrUrl}
                        alt={`QR ngân hàng của ${to.name}`}
                        className="size-24 shrink-0 rounded-lg border border-border bg-background object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Quét QR để trả {to.name}
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-warning">
                          {formatVND(s.amount)}
                        </p>
                      </div>
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Modal
        open={selectedQr !== null}
        onClose={() => setSelectedQr(null)}
        title={
          selectedQr ? `QR ngân hàng của ${selectedQr.memberName}` : 'QR ngân hàng'
        }
        description={
          selectedQr
            ? `Số tiền cần trả: ${formatVND(selectedQr.amount)}`
            : undefined
        }
      >
        {selectedQr ? (
          <div className="flex justify-center">
            <img
              src={selectedQr.url}
              alt={`QR ngân hàng của ${selectedQr.memberName}`}
              className="max-h-[70dvh] w-full rounded-2xl border border-border bg-background object-contain"
            />
          </div>
        ) : null}
      </Modal>
    </>
  )
}
