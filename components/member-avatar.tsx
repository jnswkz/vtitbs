import { memberInitial } from '@/lib/calculation'
import { cn } from '@/lib/utils'

// A small deterministic palette so each member keeps a consistent color.
const PALETTE = [
  { bg: 'oklch(0.92 0.05 264)', fg: 'oklch(0.42 0.16 264)' }, // indigo
  { bg: 'oklch(0.92 0.06 155)', fg: 'oklch(0.4 0.13 155)' }, // green
  { bg: 'oklch(0.93 0.06 40)', fg: 'oklch(0.48 0.16 34)' }, // amber
  { bg: 'oklch(0.92 0.06 330)', fg: 'oklch(0.45 0.17 330)' }, // pink
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
} as const

export function MemberAvatar({
  id,
  name,
  size = 'md',
  className,
}: {
  id: string
  name: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const color = PALETTE[hashString(id) % PALETTE.length]
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color.bg, color: color.fg }}
    >
      {memberInitial(name)}
    </span>
  )
}
