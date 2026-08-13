'use client'

import { Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  formatVND,
  formatVNDInput,
  parseVND,
  splitAmountEqually,
} from '@/lib/calculation'
import { useStore, type ExpenseInput } from '@/lib/store'
import type { Expense } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, inputClass, TextInput } from '@/components/form-fields'
import { MemberAvatar } from '@/components/member-avatar'
import { Modal } from '@/components/modal'

interface Errors {
  title?: string
  amount?: string
  participants?: string
}

export function ExpenseFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing?: Expense | null
}) {
  const { members, addExpense, updateExpense } = useStore()

  const [title, setTitle] = useState('')
  const [amountText, setAmountText] = useState('')
  const [payerId, setPayerId] = useState(members[0]?.id ?? '')
  const [participantIds, setParticipantIds] = useState<string[]>(
    members.map((m) => m.id),
  )
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset the form whenever it is (re)opened.
  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setAmountText(formatVNDInput(String(editing.amount)))
      setPayerId(editing.payerId)
      setParticipantIds(editing.participantIds)
      setNote(editing.note ?? '')
    } else {
      setTitle('')
      setAmountText('')
      setPayerId(members[0]?.id ?? '')
      setParticipantIds(members.map((m) => m.id))
      setNote('')
    }
    setErrors({})
    setSubmitError(null)
  }, [open, editing, members])

  const amount = parseVND(amountText)
  const validAmount = Number.isFinite(amount) && amount > 0

  // Keep participant order aligned with the members array for stable splits.
  const orderedParticipants = useMemo(
    () => members.filter((m) => participantIds.includes(m.id)).map((m) => m.id),
    [members, participantIds],
  )

  const preview = useMemo(() => {
    if (!validAmount || orderedParticipants.length === 0) return null
    return splitAmountEqually(amount, orderedParticipants)
  }, [validAmount, amount, orderedParticipants])

  const isEqualSplit =
    preview &&
    preview.every((s) => s.amount === preview[0].amount)

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  function validate(): boolean {
    const next: Errors = {}
    if (!title.trim()) next.title = 'Nhập tên khoản chi.'
    if (!validAmount) next.amount = 'Số tiền phải lớn hơn 0.'
    if (orderedParticipants.length === 0)
      next.participants = 'Chọn ít nhất 1 người tham gia.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setSaving(true)
    setSubmitError(null)
    const input: ExpenseInput = {
      title,
      amount,
      payerId,
      participantIds: orderedParticipants,
      note,
    }
    try {
      if (editing) await updateExpense(editing.id, input)
      else await addExpense(input)
      onClose()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Không thể lưu khoản chi.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Sửa khoản chi' : 'Thêm khoản chi'}
      description="Chia đều cho những người tham gia."
      footer={
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving
            ? 'Đang lưu...'
            : editing
              ? 'Lưu thay đổi'
              : 'Lưu khoản chi'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Tên khoản chi" htmlFor="expense-title" error={errors.title}>
          <TextInput
            id="expense-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ăn tối, Grab, Khách sạn…"
            aria-invalid={!!errors.title}
            autoComplete="off"
          />
        </Field>

        <Field label="Số tiền (đ)" htmlFor="expense-amount" error={errors.amount}>
          <TextInput
            id="expense-amount"
            value={amountText}
            onChange={(e) => setAmountText(formatVNDInput(e.target.value))}
            placeholder="0"
            inputMode="numeric"
            className="text-right font-mono text-lg tabular-nums"
            aria-invalid={!!errors.amount}
          />
        </Field>

        <Field label="Người đã thanh toán">
          <div className="grid grid-cols-3 gap-2">
            {members.map((m) => {
              const active = payerId === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPayerId(m.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-sm transition-colors',
                    active
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border bg-background text-foreground hover:bg-muted',
                  )}
                >
                  <MemberAvatar id={m.id} name={m.name} size="sm" />
                  <span className="truncate">{m.name}</span>
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Chia cho ai?" error={errors.participants}>
          <div className="flex flex-col gap-2">
            {members.map((m) => {
              const active = participantIds.includes(m.id)
              const share = preview?.find((s) => s.memberId === m.id)?.amount
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleParticipant(m.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
                    active
                      ? 'border-primary bg-accent'
                      : 'border-border bg-background hover:bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-md border transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background',
                    )}
                  >
                    {active ? <Check className="size-3.5" /> : null}
                  </span>
                  <MemberAvatar id={m.id} name={m.name} size="sm" />
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {m.name}
                  </span>
                  {active && share !== undefined ? (
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {formatVND(share)}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </Field>

        {preview ? (
          <div className="rounded-xl bg-accent px-4 py-3 text-center">
            {isEqualSplit ? (
              <p className="text-sm text-accent-foreground">
                Mỗi người:{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {formatVND(preview[0].amount)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-accent-foreground">
                Chia không đều —{' '}
                <span className="font-mono tabular-nums">
                  {preview.map((s) => formatVND(s.amount)).join(' · ')}
                </span>
              </p>
            )}
          </div>
        ) : null}

        <Field label="Ghi chú (không bắt buộc)" htmlFor="expense-note">
          <textarea
            id="expense-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Thêm ghi chú…"
            className={cn(inputClass, 'h-auto resize-none py-2.5')}
          />
        </Field>

        {submitError ? (
          <p className="text-sm font-medium text-destructive">{submitError}</p>
        ) : null}
      </div>
    </Modal>
  )
}
