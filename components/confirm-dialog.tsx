'use client'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/modal'
import type { ReactNode } from 'react'

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  confirmDisabled = false,
  title,
  message,
  confirmLabel = 'Xóa',
  children,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void | boolean | Promise<void | boolean>
  confirmDisabled?: boolean
  title: string
  message: string
  confirmLabel?: string
  children?: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="flex-1"
            disabled={confirmDisabled}
            onClick={async () => {
              const shouldClose = await onConfirm()
              if (shouldClose !== false) onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground text-pretty">{message}</p>
        {children}
      </div>
    </Modal>
  )
}
