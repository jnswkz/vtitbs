'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { formatVND } from '@/lib/calculation'
import { useStore } from '@/lib/store'
import type { Expense } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { MemberAvatar } from '@/components/member-avatar'
import { Modal } from '@/components/modal'

export function ExpenseDetailModal({
  expense,
  onClose,
  onEdit,
}: {
  expense: Expense | null
  onClose: () => void
  onEdit: (expense: Expense) => void
}) {
  const { getMember, deleteExpense } = useStore()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!expense) return null
  const payer = getMember(expense.payerId)

  return (
    <>
      <Modal
        open={!!expense}
        onClose={onClose}
        title={expense.title}
        footer={
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => onEdit(expense)}
            >
              <Pencil />
              Sửa
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="flex-1"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 />
              Xóa
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
            <span className="text-sm text-muted-foreground">Tổng</span>
            <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {formatVND(expense.amount)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Người thanh toán
            </span>
            <span className="flex items-center gap-2">
              {payer ? (
                <MemberAvatar id={payer.id} name={payer.name} size="sm" />
              ) : null}
              <span className="text-sm font-medium text-foreground">
                {payer?.name ?? '—'}
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              Chia cho ({expense.participantShares.length} người)
            </p>
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {expense.participantShares.map((share) => {
                const member = getMember(share.memberId)
                return (
                  <li
                    key={share.memberId}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                  >
                    <span className="flex items-center gap-2.5">
                      {member ? (
                        <MemberAvatar
                          id={member.id}
                          name={member.name}
                          size="sm"
                        />
                      ) : null}
                      <span className="text-sm text-foreground">
                        {member?.name ?? '—'}
                      </span>
                    </span>
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {formatVND(share.amount)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {expense.note ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">Ghi chú</p>
              <p className="text-sm text-foreground text-pretty">
                {expense.note}
              </p>
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          deleteExpense(expense.id)
          onClose()
        }}
        title="Xóa khoản chi?"
        message={`Xóa "${expense.title}" (${formatVND(expense.amount)})? Công nợ sẽ được tính lại ngay.`}
      />
    </>
  )
}
