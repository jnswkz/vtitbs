// Pure business logic for Split 3.
//
// This module is intentionally free of any React / UI / storage code so it can
// be unit tested in isolation and reused anywhere. All money is handled as
// integer VND. Balances are always DERIVED from source transactions
// (expenses + payments) and never stored as the source of truth.

import type {
  Balance,
  Expense,
  Member,
  ParticipantShare,
  Payment,
  Settlement,
} from './types'

/**
 * Split an integer amount as evenly as possible across participants without
 * losing or creating money. The sum of the returned shares is guaranteed to
 * equal `amount` exactly.
 *
 * Example: splitAmountEqually(100000, ["A","B","C"])
 *   -> [{A,33334},{B,33333},{C,33333}]  (sum === 100000)
 *
 * The remainder (in đồng) is distributed one unit at a time to the first
 * participants, so earlier participants may pay one đồng more.
 */
export function splitAmountEqually(
  amount: number,
  participantIds: string[],
): ParticipantShare[] {
  const n = participantIds.length
  if (n === 0) return []
  if (!Number.isInteger(amount)) {
    throw new Error('splitAmountEqually requires an integer amount')
  }

  const base = Math.floor(amount / n)
  let remainder = amount - base * n // always 0 <= remainder < n for amount >= 0

  return participantIds.map((memberId, index) => {
    // Give one extra đồng to the first `remainder` participants.
    const extra = index < remainder ? 1 : 0
    return { memberId, amount: base + extra }
  })
}

/**
 * Compute the net balance of every member from the full transaction history.
 *
 * For each expense:
 *   - subtract each participant's share from that participant's balance
 *   - add the full expense amount to the payer's balance
 *
 * For each payment (repayment fromMember -> toMember):
 *   - the payer's balance goes UP (their debt shrinks)
 *   - the receiver's balance goes DOWN (they got money back)
 *
 * The sum of all balances is always exactly 0.
 */
export function calculateBalances(
  members: Member[],
  expenses: Expense[],
  payments: Payment[],
): Balance[] {
  const totals = new Map<string, number>()
  for (const m of members) totals.set(m.id, 0)

  const add = (memberId: string, delta: number) => {
    if (!totals.has(memberId)) return // ignore unknown members defensively
    totals.set(memberId, (totals.get(memberId) ?? 0) + delta)
  }

  for (const expense of expenses) {
    for (const share of expense.participantShares) {
      add(share.memberId, -share.amount)
    }
    add(expense.payerId, expense.amount)
  }

  for (const payment of payments) {
    add(payment.fromMemberId, payment.amount)
    add(payment.toMemberId, -payment.amount)
  }

  return members.map((m) => ({ memberId: m.id, amount: totals.get(m.id) ?? 0 }))
}

/**
 * Derive a minimal set of settlements ("who pays whom") from net balances.
 *
 * Uses a greedy match of the largest debtor against the largest creditor,
 * which for a small group (and in particular 3 members) produces the minimum
 * number of transfers. The total settled always equals the total debt.
 *
 * Settlements are always derived from balances and never used as a source of
 * truth themselves.
 */
export function calculateSettlements(balances: Balance[]): Settlement[] {
  const creditors = balances
    .filter((b) => b.amount > 0)
    .map((b) => ({ id: b.memberId, amount: b.amount }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = balances
    .filter((b) => b.amount < 0)
    .map((b) => ({ id: b.memberId, amount: -b.amount }))
    .sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []

  let i = 0 // debtor pointer
  let j = 0 // creditor pointer
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const pay = Math.min(debtor.amount, creditor.amount)

    if (pay > 0) {
      settlements.push({
        fromMemberId: debtor.id,
        toMemberId: creditor.id,
        amount: pay,
      })
    }

    debtor.amount -= pay
    creditor.amount -= pay

    if (debtor.amount === 0) i++
    if (creditor.amount === 0) j++
  }

  return settlements
}

/**
 * Format an integer VND amount for display using Vietnamese grouping.
 * Example: 900000 -> "900.000đ", -200000 -> "-200.000đ"
 */
export function formatVND(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(Math.trunc(amount))
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}${grouped}đ`
}

/**
 * Format an integer VND amount with an explicit sign for balances.
 * Example: 500000 -> "+500.000đ", -200000 -> "-200.000đ", 0 -> "0đ"
 */
export function formatVNDSigned(amount: number): string {
  if (amount === 0) return '0đ'
  const prefix = amount > 0 ? '+' : ''
  return `${prefix}${formatVND(amount)}`
}

/**
 * Parse a user-entered money string ("1.000.000", "1,000,000", "1 000 000")
 * into an integer number of đồng. Returns NaN when there is no valid number.
 */
export function parseVND(input: string): number {
  const digits = input.replace(/[^\d]/g, '')
  if (digits === '') return Number.NaN
  return Number.parseInt(digits, 10)
}

/** Group digits with dots as the user types, e.g. "1000000" -> "1.000.000". */
export function formatVNDInput(input: string): string {
  const digits = input.replace(/[^\d]/g, '')
  if (digits === '') return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** The displayed initial(s) for a member without an avatar image. */
export function memberInitial(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '') return '?'
  return trimmed.charAt(0).toUpperCase()
}
