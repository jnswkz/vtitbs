'use client'

import { Check, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Field, TextInput } from '@/components/form-fields'
import { MemberAvatar } from '@/components/member-avatar'

export function SettingsView() {
  const { members, renameMembers, resetToDemo } = useStore()
  const [names, setNames] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    setNames(Object.fromEntries(members.map((m) => [m.id, m.name])))
  }, [members])

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    renameMembers(names)
    setSaving(false)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const dirty = members.some((m) => (names[m.id] ?? m.name) !== m.name)
  const canSave = dirty && members.every((m) => (names[m.id] ?? '').trim())

  async function handleReset() {
    setResetting(true)
    await resetToDemo()
    setResetting(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Thành viên</h2>
          <p className="text-sm text-muted-foreground">
            Đổi tên 3 thành viên trong nhóm.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {members.map((m) => (
            <div key={m.id} className="flex items-end gap-3">
              <MemberAvatar
                id={m.id}
                name={names[m.id] ?? m.name}
                size="md"
                className="mb-0.5"
              />
              <div className="flex-1">
                <Field label={`Thành viên`} htmlFor={`name-${m.id}`}>
                  <TextInput
                    id={`name-${m.id}`}
                    value={names[m.id] ?? ''}
                    onChange={(e) =>
                      setNames((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                    autoComplete="off"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

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
            Dữ liệu được lưu trong MongoDB và đồng bộ qua Vercel.
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
          {resetting ? 'Đang khôi phục...' : 'Khôi phục dữ liệu demo'}
        </Button>
      </section>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        Split 3 · Chia tiền đơn giản cho nhóm 3 người
      </p>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => {
          if (!resetting) setResetOpen(false)
        }}
        onConfirm={handleReset}
        title="Khôi phục dữ liệu demo?"
        message="Toàn bộ khoản chi và trả nợ hiện tại sẽ bị xóa và thay bằng dữ liệu demo ban đầu."
        confirmLabel={resetting ? 'Đang khôi phục...' : 'Khôi phục'}
        confirmDisabled={resetting}
      />
    </div>
  )
}
