'use client'

import { ArrowRight, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { formatVND, formatVNDInput, parseVND } from '@/lib/calculation'
import { useStore, type PaymentInput } from '@/lib/store'
import type { Payment } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Field, inputClass, TextInput } from '@/components/form-fields'
import { Modal } from '@/components/modal'

interface Errors {
  members?: string
  amount?: string
}

function todayInputValue(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  return d.toISOString().slice(0, 10)
}

export function PaymentFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing?: Payment | null
}) {
  const { members, settlements, getMember, addPayment, updatePayment, deletePayment } =
    useStore()

  const [fromMemberId, setFromMemberId] = useState('')
  const [toMemberId, setToMemberId] = useState('')
  const [amountText, setAmountText] = useState('')
  const [dateValue, setDateValue] = useState(todayInputValue())
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setFromMemberId(editing.fromMemberId)
      setToMemberId(editing.toMemberId)
      setAmountText(formatVNDInput(String(editing.amount)))
      setDateValue(todayInputValue(editing.createdAt))
      setNote(editing.note ?? '')
    } else {
      // Prefill from the largest outstanding settlement when available.
      const suggestion = settlements[0]
      setFromMemberId(suggestion?.fromMemberId ?? members[0]?.id ?? '')
      setToMemberId(suggestion?.toMemberId ?? members[1]?.id ?? '')
      setAmountText(suggestion ? formatVNDInput(String(suggestion.amount)) : '')
      setDateValue(todayInputValue())
      setNote('')
    }
    setErrors({})
  }, [open, editing, members, settlements])

  const amount = parseVND(amountText)
  const validAmount = Number.isFinite(amount) && amount > 0

  const receivers = useMemo(
    () => members.filter((m) => m.id !== fromMemberId),
    [members, fromMemberId],
  )

  function selectFrom(id: string) {
    setFromMemberId(id)
    if (id === toMemberId) {
      const other = members.find((m) => m.id !== id)
      setToMemberId(other?.id ?? '')
    }
  }

  function applySuggestion(from: string, to: string, amt: number) {
    setFromMemberId(from)
    setToMemberId(to)
    setAmountText(formatVNDInput(String(amt)))
  }

  function validate(): boolean {
    const next: Errors = {}
    if (!fromMemberId || !toMemberId || fromMemberId === toMemberId)
      next.members = 'Người trả và người nhận phải khác nhau.'
    if (!validAmount) next.amount = 'Số tiền phải lớn hơn 0.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const input: PaymentInput = {
      fromMemberId,
      toMemberId,
      amount,
      createdAt: new Date(`${dateValue}T12:00:00`).toISOString(),
      note,
    }
    if (editing) updatePayment(editing.id, input)
    else addPayment(input)
    onClose()
  }

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Sửa khoản trả nợ' : 'Trả nợ'}
      description="Ghi nhận một người đã trả tiền cho người khác."
      footer={
        <div className="flex gap-3">
          {editing ? (
            <Button
              type="button"
              size="lg"
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              aria-label="Xóa khoản trả nợ"
            >
              <Trash2 />
            </Button>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="flex-1"
            onClick={handleSubmit}
          >
            {editing ? 'Lưu thay đổi' : 'Lưu khoản trả nợ'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {!editing && settlements.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Gợi ý từ công nợ hiện tại
            </p>
            <div className="flex flex-wrap gap-2">
              {settlements.map((s, i) => {
                const from = getMember(s.fromMemberId)
                const to = getMember(s.toMemberId)
                if (!from || !to) return null
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      applySuggestion(s.fromMemberId, s.toMemberId, s.amount)
                    }
                    className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    {from.name}
                    <ArrowRight className="size-3 text-muted-foreground" />
                    {to.name}
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {formatVND(s.amount)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <Field label="Người trả" error={errors.members}>
          <div className="grid grid-cols-3 gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectFrom(m.id)}
                aria-pressed={fromMemberId === m.id}
                className={cn(
                  'rounded-xl border p-2.5 text-sm font-medium transition-colors',
                  fromMemberId === m.id
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Người nhận">
          <div className="grid grid-cols-2 gap-2">
            {receivers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setToMemberId(m.id)}
                aria-pressed={toMemberId === m.id}
                className={cn(
                  'rounded-xl border p-2.5 text-sm font-medium transition-colors',
                  toMemberId === m.id
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Số tiền (đ)" htmlFor="payment-amount" error={errors.amount}>
          <TextInput
            id="payment-amount"
            value={amountText}
            onChange={(e) => setAmountText(formatVNDInput(e.target.value))}
            placeholder="0"
            inputMode="numeric"
            className="text-right font-mono text-lg tabular-nums"
            aria-invalid={!!errors.amount}
          />
        </Field>

        <Field label="Ngày" htmlFor="payment-date">
          <TextInput
            id="payment-date"
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />
        </Field>

        <Field label="Ghi chú (không bắt buộc)" htmlFor="payment-note">
          <textarea
            id="payment-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Thêm ghi chú…"
            className={cn(inputClass, 'h-auto resize-none py-2.5')}
          />
        </Field>
      </div>
    </Modal>

    {editing ? (
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deletePayment(editing.id)
          onClose()
        }}
        title="Xóa khoản trả nợ?"
        message="Xóa giao dịch trả nợ này? Công nợ sẽ được tính lại ngay."
      />
    ) : null}
    </>
  )
}
