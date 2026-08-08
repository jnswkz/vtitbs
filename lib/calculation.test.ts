import { describe, expect, it } from 'vitest'

import {
  calculateBalances,
  calculateSettlements,
  formatVND,
  formatVNDSigned,
  parseVND,
  splitAmountEqually,
} from './calculation'
import { createSeedData } from './seed'
import type { Expense, Member, Payment } from './types'

const A = 'a'
const B = 'b'
const C = 'c'

const members: Member[] = [
  { id: A, name: 'An' },
  { id: B, name: 'Bình' },
  { id: C, name: 'Cường' },
]

function expense(
  id: string,
  amount: number,
  payerId: string,
  participantIds: string[],
): Expense {
  return {
    id,
    title: id,
    amount,
    payerId,
    participantIds,
    participantShares: splitAmountEqually(amount, participantIds),
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function payment(
  id: string,
  fromMemberId: string,
  toMemberId: string,
  amount: number,
): Payment {
  return {
    id,
    fromMemberId,
    toMemberId,
    amount,
    createdAt: '2026-01-02T00:00:00.000Z',
  }
}

function balanceMap(balances: { memberId: string; amount: number }[]) {
  return Object.fromEntries(balances.map((b) => [b.memberId, b.amount]))
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0)
}

describe('splitAmountEqually', () => {
  it('splits evenly divisible amounts', () => {
    const shares = splitAmountEqually(900000, [A, B, C])
    expect(shares.map((s) => s.amount)).toEqual([300000, 300000, 300000])
    expect(sum(shares.map((s) => s.amount))).toBe(900000)
  })

  it('preserves every đồng when not divisible', () => {
    const shares = splitAmountEqually(100000, [A, B, C])
    expect(shares.map((s) => s.amount)).toEqual([33334, 33333, 33333])
    expect(sum(shares.map((s) => s.amount))).toBe(100000)
  })

  it('handles a single participant', () => {
    const shares = splitAmountEqually(180000, [A])
    expect(shares).toEqual([{ memberId: A, amount: 180000 }])
  })

  it('handles two participants with a remainder', () => {
    const shares = splitAmountEqually(101, [A, B])
    expect(shares.map((s) => s.amount)).toEqual([51, 50])
    expect(sum(shares.map((s) => s.amount))).toBe(101)
  })

  it('returns empty for no participants', () => {
    expect(splitAmountEqually(1000, [])).toEqual([])
  })
})

describe('calculateBalances', () => {
  it('one payer covers all three', () => {
    const balances = balanceMap(
      calculateBalances(members, [expense('e', 900000, A, [A, B, C])], []),
    )
    expect(balances).toEqual({ a: 600000, b: -300000, c: -300000 })
    expect(sum(Object.values(balances))).toBe(0)
  })

  it('payer is not among participants', () => {
    const balances = balanceMap(
      calculateBalances(members, [expense('e', 900000, A, [B, C])], []),
    )
    // A paid 900k, only B and C split it -> each owes 450k to A.
    expect(balances).toEqual({ a: 900000, b: -450000, c: -450000 })
    expect(sum(Object.values(balances))).toBe(0)
  })

  it('single participant expense', () => {
    const balances = balanceMap(
      calculateBalances(members, [expense('e', 200000, A, [B])], []),
    )
    expect(balances).toEqual({ a: 200000, b: -200000, c: 0 })
  })

  it('expense split between two participants', () => {
    const balances = balanceMap(
      calculateBalances(members, [expense('e', 180000, B, [A, B])], []),
    )
    // B paid 180k, split A/B 90k each -> A owes B 90k.
    expect(balances).toEqual({ a: -90000, b: 90000, c: 0 })
  })

  it('non-divisible amount keeps the total balanced', () => {
    const balances = calculateBalances(
      members,
      [expense('e', 100000, A, [A, B, C])],
      [],
    )
    expect(sum(balances.map((b) => b.amount))).toBe(0)
  })

  it('multiple crossing expenses', () => {
    const expenses = [
      expense('e1', 900000, A, [A, B, C]),
      expense('e2', 180000, B, [A, B]),
      expense('e3', 1200000, C, [A, B, C]),
    ]
    const balances = balanceMap(calculateBalances(members, expenses, []))
    // A: -300 -90 -400 +900 = 110000
    // B: -300 -90 -400 +180 = -610000
    // C: -300 -0  -400 +1200 = 500000
    expect(balances).toEqual({ a: 110000, b: -610000, c: 500000 })
    expect(sum(Object.values(balances))).toBe(0)
  })

  it('applies a partial repayment', () => {
    const expenses = [expense('e', 900000, A, [A, B, C])]
    const payments = [payment('p', B, A, 200000)]
    const balances = balanceMap(
      calculateBalances(members, expenses, payments),
    )
    // B owed 300k, paid 200k back -> B now -100k, A now +400k.
    expect(balances).toEqual({ a: 400000, b: -100000, c: -300000 })
    expect(sum(Object.values(balances))).toBe(0)
  })

  it('handles a full repayment', () => {
    const expenses = [expense('e', 900000, A, [A, B, C])]
    const payments = [payment('p', B, A, 300000)]
    const balances = balanceMap(
      calculateBalances(members, expenses, payments),
    )
    expect(balances).toEqual({ a: 300000, b: 0, c: -300000 })
  })

  it('handles overpayment beyond the current debt', () => {
    const expenses = [expense('e', 900000, A, [A, B, C])]
    const payments = [payment('p', B, A, 500000)]
    const balances = balanceMap(
      calculateBalances(members, expenses, payments),
    )
    // B overpaid: now A owes B 200k back.
    expect(balances).toEqual({ a: 100000, b: 200000, c: -300000 })
    expect(sum(Object.values(balances))).toBe(0)
  })
})

describe('calculateSettlements', () => {
  it('two debtors pay one creditor', () => {
    const balances = [
      { memberId: A, amount: 500000 },
      { memberId: B, amount: -200000 },
      { memberId: C, amount: -300000 },
    ]
    const settlements = calculateSettlements(balances)
    expect(settlements).toEqual([
      { fromMemberId: C, toMemberId: A, amount: 300000 },
      { fromMemberId: B, toMemberId: A, amount: 200000 },
    ])
    expect(sum(settlements.map((s) => s.amount))).toBe(500000)
  })

  it('one debtor pays two creditors', () => {
    const balances = [
      { memberId: A, amount: 300000 },
      { memberId: B, amount: 200000 },
      { memberId: C, amount: -500000 },
    ]
    const settlements = calculateSettlements(balances)
    expect(settlements).toEqual([
      { fromMemberId: C, toMemberId: A, amount: 300000 },
      { fromMemberId: C, toMemberId: B, amount: 200000 },
    ])
    expect(sum(settlements.map((s) => s.amount))).toBe(500000)
  })

  it('returns nothing when everyone is settled', () => {
    const balances = [
      { memberId: A, amount: 0 },
      { memberId: B, amount: 0 },
      { memberId: C, amount: 0 },
    ]
    expect(calculateSettlements(balances)).toEqual([])
  })
})

describe('edit and delete recalculation', () => {
  it('recalculates after editing an expense', () => {
    let expenses = [expense('e', 900000, A, [A, B, C])]
    // "Edit" by replacing the source expense entirely.
    expenses = [expense('e', 600000, A, [A, B, C])]
    const balances = balanceMap(calculateBalances(members, expenses, []))
    expect(balances).toEqual({ a: 400000, b: -200000, c: -200000 })
    expect(sum(Object.values(balances))).toBe(0)
  })

  it('recalculates after deleting an expense', () => {
    const expenses = [
      expense('e1', 900000, A, [A, B, C]),
      expense('e2', 300000, B, [A, B, C]),
    ]
    const afterDelete = expenses.filter((e) => e.id !== 'e2')
    const balances = balanceMap(calculateBalances(members, afterDelete, []))
    expect(balances).toEqual({ a: 600000, b: -300000, c: -300000 })
  })

  it('recalculates after editing a payment', () => {
    const expenses = [expense('e', 900000, A, [A, B, C])]
    let payments = [payment('p', B, A, 200000)]
    payments = [payment('p', B, A, 300000)] // edited amount
    const balances = balanceMap(
      calculateBalances(members, expenses, payments),
    )
    expect(balances).toEqual({ a: 300000, b: 0, c: -300000 })
  })

  it('recalculates after deleting a payment', () => {
    const expenses = [expense('e', 900000, A, [A, B, C])]
    const payments: Payment[] = []
    const balances = balanceMap(
      calculateBalances(members, expenses, payments),
    )
    expect(balances).toEqual({ a: 600000, b: -300000, c: -300000 })
  })
})

describe('seed data integrity', () => {
  it('has balances that sum to exactly zero', () => {
    const data = createSeedData()
    const balances = calculateBalances(
      data.members,
      data.expenses,
      data.payments,
    )
    expect(sum(balances.map((b) => b.amount))).toBe(0)
  })

  it('produces settlements that match total debt', () => {
    const data = createSeedData()
    const balances = calculateBalances(
      data.members,
      data.expenses,
      data.payments,
    )
    const settlements = calculateSettlements(balances)
    const totalDebt = sum(
      balances.filter((b) => b.amount < 0).map((b) => -b.amount),
    )
    expect(sum(settlements.map((s) => s.amount))).toBe(totalDebt)
  })
})

describe('currency helpers', () => {
  it('formats VND with dot grouping', () => {
    expect(formatVND(900000)).toBe('900.000đ')
    expect(formatVND(4500000)).toBe('4.500.000đ')
    expect(formatVND(0)).toBe('0đ')
    expect(formatVND(-200000)).toBe('-200.000đ')
  })

  it('formats signed VND for balances', () => {
    expect(formatVNDSigned(500000)).toBe('+500.000đ')
    expect(formatVNDSigned(-200000)).toBe('-200.000đ')
    expect(formatVNDSigned(0)).toBe('0đ')
  })

  it('parses user money input into integers', () => {
    expect(parseVND('1.000.000')).toBe(1000000)
    expect(parseVND('1,000,000')).toBe(1000000)
    expect(parseVND('900000')).toBe(900000)
    expect(Number.isNaN(parseVND('abc'))).toBe(true)
  })
})
