import { DEFAULT_MEMBER_IDS } from '@/lib/seed'
import type { Member } from '@/lib/types'

export const BANKING_QR_OPTIONS = ['1.jpg', '2.jpg', '3.jpg'] as const

const DEFAULT_BANKING_QR_BY_MEMBER_ID: Record<string, string> = {
  [DEFAULT_MEMBER_IDS.an]: '1.jpg',
  [DEFAULT_MEMBER_IDS.binh]: '2.jpg',
  [DEFAULT_MEMBER_IDS.cuong]: '3.jpg',
}

export function isBankingQrImage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (BANKING_QR_OPTIONS as readonly string[]).includes(value)
  )
}

export function getDefaultBankingQrImage(memberId: string): string {
  return DEFAULT_BANKING_QR_BY_MEMBER_ID[memberId] ?? BANKING_QR_OPTIONS[0]
}

export function getBankingQrUrl(member: Pick<Member, 'id' | 'bankingQrImage'>) {
  const image = isBankingQrImage(member.bankingQrImage)
    ? member.bankingQrImage
    : getDefaultBankingQrImage(member.id)

  return `/banking-qr/${image}`
}
