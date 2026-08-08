// Core data model for Split 3.
// All monetary amounts are stored as integers in VND (đồng) to avoid
// floating point errors. Never store money as a float.

export interface Member {
  id: string
  name: string
  /** Optional avatar URL. When absent, the first letter of the name is used. */
  avatar?: string
}

export interface ParticipantShare {
  memberId: string
  /** Integer VND this participant is responsible for in the expense. */
  amount: number
}

export interface Expense {
  id: string
  title: string
  /** Total amount of the expense, integer VND. */
  amount: number
  /** Member who paid the money up front. */
  payerId: string
  /** Members who split this expense. */
  participantIds: string[]
  /**
   * Explicit per-participant breakdown, persisted at creation time so the
   * split stays consistent even when the amount does not divide evenly.
   * The sum of all shares always equals `amount`.
   */
  participantShares: ParticipantShare[]
  createdAt: string
  note?: string
}

export interface Payment {
  id: string
  fromMemberId: string
  toMemberId: string
  /** Integer VND transferred as a debt repayment. */
  amount: number
  createdAt: string
  note?: string
}

export interface AppData {
  members: Member[]
  expenses: Expense[]
  payments: Payment[]
}

/** Net balance for a single member (integer VND). */
export interface Balance {
  memberId: string
  /**
   * balance > 0  -> member should receive money
   * balance < 0  -> member owes money
   * balance == 0 -> settled
   */
  amount: number
}

/** A single "who pays whom" instruction derived from balances. */
export interface Settlement {
  fromMemberId: string
  toMemberId: string
  amount: number
}

/** A unified timeline entry (expense or payment). */
export type Transaction =
  | ({ kind: 'expense' } & Expense)
  | ({ kind: 'payment' } & Payment)
