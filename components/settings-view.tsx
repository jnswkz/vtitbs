'use client'

import { Check, Download, RefreshCw, RotateCcw, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { formatVND } from '@/lib/calculation'
import {
  BANKING_QR_OPTIONS,
  getBankingQrUrl,
  getDefaultBankingQrImage,
} from '@/lib/banking-qr'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Field, inputClass, TextInput } from '@/components/form-fields'
import { MemberAvatar } from '@/components/member-avatar'

export function SettingsView() {
  const {
    members,
    deletedExpenses,
    deletedPayments,
    syncError,
    reloadData,
    clearSyncError,
    getMember,
    renameMembers,
    resetData,
    restoreExpense,
    restorePayment,
    exportData,
  } = useStore()
  const [names, setNames] = useState<Record<string, string>>({})
  const [bankingQrImages, setBankingQrImages] = useState<Record<string, string>>(
    {},
  )
  const [namePassword, setNamePassword] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<{
    kind: 'expense' | 'payment'
    id: string
    label: string
  } | null>(null)
  const [restorePassword, setRestorePassword] = useState('')
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setNames(Object.fromEntries(members.map((m) => [m.id, m.name])))
    setBankingQrImages(
      Object.fromEntries(
        members.map((m) => [
          m.id,
          m.bankingQrImage ?? getDefaultBankingQrImage(m.id),
        ]),
      ),
    )
  }, [members])

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setNameError(null)
    try {
      await renameMembers(names, namePassword, bankingQrImages)
      setNamePassword('')
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    } catch (error) {
      setNameError(
        error instanceof Error
          ? error.message
          : 'Không thể đổi tên. Kiểm tra lại mật khẩu.',
      )
    } finally {
      setSaving(false)
    }
  }

  const dirty = members.some((m) => (names[m.id] ?? m.name) !== m.name)
  const qrDirty = members.some(
    (m) =>
      (bankingQrImages[m.id] ?? getDefaultBankingQrImage(m.id)) !==
      (m.bankingQrImage ?? getDefaultBankingQrImage(m.id)),
  )
  const canSave =
    (dirty || qrDirty) &&
    Boolean(namePassword) &&
    members.every((m) => (names[m.id] ?? '').trim())

  async function handleReset() {
    setResetting(true)
    setResetError(null)
    try {
      await resetData(resetPassword)
      setResetPassword('')
      setResetOpen(false)
    } catch (error) {
      setResetError(
        error instanceof Error
          ? error.message
          : 'Không thể xóa dữ liệu. Kiểm tra lại mật khẩu.',
      )
    } finally {
      setResetting(false)
    }
  }

  async function handleRestore() {
    if (!restoreTarget) return false
    setRestoring(true)
    setRestoreError(null)
    try {
      if (restoreTarget.kind === 'expense') {
        await restoreExpense(restoreTarget.id, restorePassword)
      } else {
        await restorePayment(restoreTarget.id, restorePassword)
      }
      setRestorePassword('')
      setRestoreTarget(null)
    } catch (error) {
      setRestoreError(
        error instanceof Error ? error.message : 'Không thể khôi phục dữ liệu.',
      )
      return false
    } finally {
      setRestoring(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      const payload = await exportData(exportPassword)
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `split3-export-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setExportPassword('')
      setExportOpen(false)
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'Không thể xuất dữ liệu.',
      )
      return false
    } finally {
      setExporting(false)
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {syncError ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-accent p-4">
          <p className="text-sm font-medium text-accent-foreground">
            {syncError}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={reloadData}>
              <RefreshCw />
              Tải lại
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearSyncError}
            >
              Đóng
            </Button>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Thành viên</h2>
          <p className="text-sm text-muted-foreground">
            Đổi tên và chọn QR ngân hàng cho từng thành viên.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {members.map((m) => {
            const selectedQrImage =
              bankingQrImages[m.id] ?? getDefaultBankingQrImage(m.id)
            const qrUrl = getBankingQrUrl({
              id: m.id,
              bankingQrImage: selectedQrImage,
            })

            return (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary/40 p-3"
              >
                <div className="flex items-end gap-3">
                  <MemberAvatar
                    id={m.id}
                    name={names[m.id] ?? m.name}
                    size="md"
                    className="mb-0.5"
                  />
                  <div className="flex-1">
                    <Field label="Thành viên" htmlFor={`name-${m.id}`}>
                      <TextInput
                        id={`name-${m.id}`}
                        value={names[m.id] ?? ''}
                        onChange={(e) =>
                          setNames((prev) => ({
                            ...prev,
                            [m.id]: e.target.value,
                          }))
                        }
                        autoComplete="off"
                      />
                    </Field>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <img
                    src={qrUrl}
                    alt={`QR ngân hàng đang chọn cho ${names[m.id] ?? m.name}`}
                    className="size-16 shrink-0 rounded-lg border border-border bg-background object-contain"
                  />
                  <div className="flex-1">
                    <Field label="QR ngân hàng" htmlFor={`qr-${m.id}`}>
                      <select
                        id={`qr-${m.id}`}
                        value={selectedQrImage}
                        onChange={(e) =>
                          setBankingQrImages((prev) => ({
                            ...prev,
                            [m.id]: e.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        {BANKING_QR_OPTIONS.map((image) => (
                          <option key={image} value={image}>
                            {image}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Field
          label="Mật khẩu"
          htmlFor="name-password"
          error={nameError ?? undefined}
        >
          <TextInput
            id="name-password"
            type="password"
            value={namePassword}
            onChange={(e) => {
              setNamePassword(e.target.value)
              setNameError(null)
            }}
            autoComplete="current-password"
          />
        </Field>

        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={saving || (!canSave && !saved)}
        >
          {saving ? (
            'Đang lưu...'
          ) : saved ? (
            <>
              <Check />
              Đã lưu
            </>
          ) : (
            'Lưu tên'
          )}
        </Button>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dữ liệu</h2>
          <p className="text-sm text-muted-foreground">
            Xóa toàn bộ khoản chi và trả nợ. Tên thành viên được giữ lại.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => setResetOpen(true)}
          disabled={resetting}
        >
          <RotateCcw />
          {resetting ? 'Đang xóa...' : 'Xóa dữ liệu'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => setExportOpen(true)}
          disabled={exporting}
        >
          <Download />
          {exporting ? 'Đang xuất...' : 'Xuất dữ liệu'}
        </Button>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Khôi phục đã xóa
          </h2>
          <p className="text-sm text-muted-foreground">
            Các khoản đã xóa không ảnh hưởng công nợ cho đến khi khôi phục.
          </p>
        </div>

        {deletedExpenses.length === 0 && deletedPayments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Chưa có khoản đã xóa.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {deletedExpenses.map((expense) => (
              <div
                key={`deleted-expense-${expense.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {expense.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Khoản chi · {formatVND(expense.amount)} ·{' '}
                    {formatDate(expense.deletedAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Khôi phục ${expense.title}`}
                  onClick={() =>
                    setRestoreTarget({
                      kind: 'expense',
                      id: expense.id,
                      label: expense.title,
                    })
                  }
                >
                  <Undo2 />
                </Button>
              </div>
            ))}

            {deletedPayments.map((payment) => {
              const from = getMember(payment.fromMemberId)
              const to = getMember(payment.toMemberId)
              const label = `${from?.name ?? '—'} → ${to?.name ?? '—'}`
              return (
                <div
                  key={`deleted-payment-${payment.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Trả nợ · {formatVND(payment.amount)} ·{' '}
                      {formatDate(payment.deletedAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Khôi phục ${label}`}
                    onClick={() =>
                      setRestoreTarget({
                        kind: 'payment',
                        id: payment.id,
                        label,
                      })
                    }
                  >
                    <Undo2 />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        Split 3 · Chia tiền đơn giản cho nhóm 3 người
      </p>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => {
          if (!resetting) {
            setResetOpen(false)
            setResetError(null)
            setResetPassword('')
          }
        }}
        onConfirm={handleReset}
        title="Xóa toàn bộ dữ liệu?"
        message="Toàn bộ khoản chi và trả nợ hiện tại sẽ bị xóa. Tên thành viên sẽ được giữ lại."
        confirmLabel={resetting ? 'Đang xóa...' : 'Xóa dữ liệu'}
        confirmDisabled={resetting || !resetPassword}
      >
        <Field
          label="Mật khẩu"
          htmlFor="reset-password"
          error={resetError ?? undefined}
        >
          <TextInput
            id="reset-password"
            type="password"
            value={resetPassword}
            onChange={(e) => {
              setResetPassword(e.target.value)
              setResetError(null)
            }}
            autoComplete="current-password"
          />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => {
          if (!restoring) {
            setRestoreTarget(null)
            setRestorePassword('')
            setRestoreError(null)
          }
        }}
        onConfirm={handleRestore}
        title="Khôi phục dữ liệu?"
        message={
          restoreTarget
            ? `Khôi phục "${restoreTarget.label}" vào lịch sử hiện tại?`
            : ''
        }
        confirmLabel={restoring ? 'Đang khôi phục...' : 'Khôi phục'}
        confirmDisabled={restoring || !restorePassword}
      >
        <Field
          label="Mật khẩu"
          htmlFor="restore-password"
          error={restoreError ?? undefined}
        >
          <TextInput
            id="restore-password"
            type="password"
            value={restorePassword}
            onChange={(e) => {
              setRestorePassword(e.target.value)
              setRestoreError(null)
            }}
            autoComplete="current-password"
          />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={exportOpen}
        onClose={() => {
          if (!exporting) {
            setExportOpen(false)
            setExportPassword('')
            setExportError(null)
          }
        }}
        onConfirm={handleExport}
        title="Xuất dữ liệu?"
        message="Tệp JSON sẽ bao gồm dữ liệu hiện tại, khoản đã xóa và audit log."
        confirmLabel={exporting ? 'Đang xuất...' : 'Xuất'}
        confirmDisabled={exporting || !exportPassword}
      >
        <Field
          label="Mật khẩu"
          htmlFor="export-password"
          error={exportError ?? undefined}
        >
          <TextInput
            id="export-password"
            type="password"
            value={exportPassword}
            onChange={(e) => {
              setExportPassword(e.target.value)
              setExportError(null)
            }}
            autoComplete="current-password"
          />
        </Field>
      </ConfirmDialog>
    </div>
  )
}
