import { cn } from '@/lib/utils'
import type { InputHTMLAttributes, ReactNode } from 'react'

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  )
}

export const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive'

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />
}
