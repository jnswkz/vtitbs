// Demo data used to seed a fresh install and to exercise the calculation
// engine. Amounts are integer VND.

import { splitAmountEqually } from './calculation'
import type { AppData, Expense } from './types'

export const DEFAULT_MEMBER_IDS = {
  an: 'member-an',
  binh: 'member-binh',
  cuong: 'member-cuong',
} as const

function buildExpense(
  id: string,
  title: string,
  amount: number,
  payerId: string,
  participantIds: string[],
  createdAt: string,
): Expense {
  return {
    id,
    title,
    amount,
    payerId,
    participantIds,
    participantShares: splitAmountEqually(amount, participantIds),
    createdAt,
  }
}

export function createSeedData(): AppData {
  const { an, binh, cuong } = DEFAULT_MEMBER_IDS

  return {
    members: [
      { id: an, name: 'An' },
      { id: binh, name: 'Bình' },
      { id: cuong, name: 'Cường' },
    ],
    expenses: [
      buildExpense(
        'seed-expense-1',
        'Ăn tối',
        900000,
        an,
        [an, binh, cuong],
        '2026-01-05T19:30:00.000Z',
      ),
      buildExpense(
        'seed-expense-2',
        'Grab',
        180000,
        binh,
        [an, binh],
        '2026-01-06T09:15:00.000Z',
      ),
      buildExpense(
        'seed-expense-3',
        'Khách sạn',
        1200000,
        cuong,
        [an, binh, cuong],
        '2026-01-06T21:00:00.000Z',
      ),
    ],
    payments: [
      {
        id: 'seed-payment-1',
        fromMemberId: binh,
        toMemberId: an,
        amount: 100000,
        createdAt: '2026-01-07T08:00:00.000Z',
        note: 'Trả bớt tiền ăn tối',
      },
    ],
  }
}
