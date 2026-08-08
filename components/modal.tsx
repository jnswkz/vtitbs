'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

/**
 * Accessible modal that renders as a centered dialog on desktop and a
 * bottom sheet on mobile. Handles Escape, backdrop click, focus trapping
 * (basic), and body scroll lock.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the panel.
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    }, 20)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      window.clearTimeout(timer)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px] animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:w-full sm:max-w-md sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground text-balance">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer ? (
          <footer className="border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
