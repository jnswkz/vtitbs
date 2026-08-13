import { splitAmountEqually } from './calculation'
import { createSeedData } from './seed'
import type {
  AppData,
  AuditAction,
  AuditEvent,
  DeletedExpense,
  DeletedPayment,
  Expense,
  Member,
  Payment,
} from './types'

export interface AuditMetadata {
  userAgent?: string
  ip?: string
}

export interface ExpenseInput {
  title: string
  amount: number
  payerId: string
  participantIds: string[]
  note?: string
}

export interface PaymentInput {
  fromMemberId: string
  toMemberId: string
  amount: number
  createdAt?: string
  note?: string
}

export interface MutationResult {
  data: AppData
  auditEvent: AuditEvent
}

export class VersionConflictError extends Error {
  constructor(public latest: AppData) {
    super('Stale app data version')
    this.name = 'VersionConflictError'
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function normalizeAppData(value: unknown): AppData {
  if (typeof value !== 'object' || value === null) return createSeedData()
  const data = value as Partial<AppData>
  const seed = createSeedData()
  return {
    members: Array.isArray(data.members) ? (data.members as Member[]) : seed.members,
    expenses: Array.isArray(data.expenses) ? (data.expenses as Expense[]) : [],
    payments: Array.isArray(data.payments) ? (data.payments as Payment[]) : [],
    version:
      typeof data.version === 'number' && Number.isInteger(data.version)
        ? data.version
        : 1,
    deletedExpenses: Array.isArray(data.deletedExpenses)
      ? (data.deletedExpenses as DeletedExpense[])
      : [],
    deletedPayments: Array.isArray(data.deletedPayments)
      ? (data.deletedPayments as DeletedPayment[])
      : [],
  }
}

export function isValidData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Partial<AppData>
  return (
    Array.isArray(data.members) &&
    Array.isArray(data.expenses) &&
    Array.isArray(data.payments)
  )
}

export function assertFreshVersion(data: AppData, baseVersion: unknown): void {
  if (baseVersion !== data.version) {
    throw new VersionConflictError(data)
  }
}

function nextData(data: AppData): AppData {
  return {
    ...data,
    version: data.version + 1,
  }
}

function event(
  action: AuditAction,
  entityType: AuditEvent['entityType'],
  entityId: string,
  version: number,
  before: unknown,
  after: unknown,
  metadata?: AuditMetadata,
): AuditEvent {
  return {
    id: newId(),
    action,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
    version,
    before,
    after,
    metadata,
  }
}

export function makeExpense(input: ExpenseInput): Expense {
  return {
    id: newId(),
    title: input.title.trim(),
    amount: input.amount,
    payerId: input.payerId,
    participantIds: input.participantIds,
    participantShares: splitAmountEqually(input.amount, input.participantIds),
    createdAt: new Date().toISOString(),
    note: input.note?.trim() || undefined,
  }
}

export function makePayment(input: PaymentInput): Payment {
  return {
    id: newId(),
    fromMemberId: input.fromMemberId,
    toMemberId: input.toMemberId,
    amount: input.amount,
    createdAt: input.createdAt ?? new Date().toISOString(),
    note: input.note?.trim() || undefined,
  }
}

export function addExpenseMutation(
  current: AppData,
  input: ExpenseInput,
  metadata?: AuditMetadata,
): MutationResult {
  const expense = makeExpense(input)
  const data = nextData({
    ...current,
    expenses: [...current.expenses, expense],
  })
  return {
    data,
    auditEvent: event(
      'expense.created',
      'expense',
      expense.id,
      data.version,
      undefined,
      expense,
      metadata,
    ),
  }
}

export function updateExpenseMutation(
  current: AppData,
  id: string,
  input: ExpenseInput,
  metadata?: AuditMetadata,
): MutationResult {
  const before = current.expenses.find((expense) => expense.id === id)
  if (!before) throw new Error('Expense not found')
  const after: Expense = {
    ...before,
    title: input.title.trim(),
    amount: input.amount,
    payerId: input.payerId,
    participantIds: input.participantIds,
    participantShares: splitAmountEqually(input.amount, input.participantIds),
    note: input.note?.trim() || undefined,
  }
  const data = nextData({
    ...current,
    expenses: current.expenses.map((expense) =>
      expense.id === id ? after : expense,
    ),
  })
  return {
    data,
    auditEvent: event(
      'expense.updated',
      'expense',
      id,
      data.version,
      before,
      after,
      metadata,
    ),
  }
}

export function deleteExpenseMutation(
  current: AppData,
  id: string,
  metadata?: AuditMetadata,
): MutationResult {
  const before = current.expenses.find((expense) => expense.id === id)
  if (!before) throw new Error('Expense not found')
  const deleted: DeletedExpense = {
    ...before,
    deletedAt: new Date().toISOString(),
  }
  const data = nextData({
    ...current,
    expenses: current.expenses.filter((expense) => expense.id !== id),
    deletedExpenses: [deleted, ...current.deletedExpenses],
  })
  return {
    data,
    auditEvent: event(
      'expense.deleted',
      'expense',
      id,
      data.version,
      before,
      deleted,
      metadata,
    ),
  }
}

export function restoreExpenseMutation(
  current: AppData,
  id: string,
  metadata?: AuditMetadata,
): MutationResult {
  if (current.expenses.some((expense) => expense.id === id)) {
    throw new Error('Expense already active')
  }
  const deleted = current.deletedExpenses.find((expense) => expense.id === id)
  if (!deleted) throw new Error('Deleted expense not found')
  const { deletedAt: _deletedAt, deletedReason: _deletedReason, ...restored } =
    deleted
  const data = nextData({
    ...current,
    expenses: [...current.expenses, restored],
    deletedExpenses: current.deletedExpenses.filter((expense) => expense.id !== id),
  })
  return {
    data,
    auditEvent: event(
      'expense.restored',
      'expense',
      id,
      data.version,
      deleted,
      restored,
      metadata,
    ),
  }
}

export function addPaymentMutation(
  current: AppData,
  input: PaymentInput,
  metadata?: AuditMetadata,
): MutationResult {
  const payment = makePayment(input)
  const data = nextData({
    ...current,
    payments: [...current.payments, payment],
  })
  return {
    data,
    auditEvent: event(
      'payment.created',
      'payment',
      payment.id,
      data.version,
      undefined,
      payment,
      metadata,
    ),
  }
}

export function updatePaymentMutation(
  current: AppData,
  id: string,
  input: PaymentInput,
  metadata?: AuditMetadata,
): MutationResult {
  const before = current.payments.find((payment) => payment.id === id)
  if (!before) throw new Error('Payment not found')
  const after: Payment = {
    ...before,
    fromMemberId: input.fromMemberId,
    toMemberId: input.toMemberId,
    amount: input.amount,
    createdAt: input.createdAt ?? before.createdAt,
    note: input.note?.trim() || undefined,
  }
  const data = nextData({
    ...current,
    payments: current.payments.map((payment) =>
      payment.id === id ? after : payment,
    ),
  })
  return {
    data,
    auditEvent: event(
      'payment.updated',
      'payment',
      id,
      data.version,
      before,
      after,
      metadata,
    ),
  }
}

export function deletePaymentMutation(
  current: AppData,
  id: string,
  metadata?: AuditMetadata,
): MutationResult {
  const before = current.payments.find((payment) => payment.id === id)
  if (!before) throw new Error('Payment not found')
  const deleted: DeletedPayment = {
    ...before,
    deletedAt: new Date().toISOString(),
  }
  const data = nextData({
    ...current,
    payments: current.payments.filter((payment) => payment.id !== id),
    deletedPayments: [deleted, ...current.deletedPayments],
  })
  return {
    data,
    auditEvent: event(
      'payment.deleted',
      'payment',
      id,
      data.version,
      before,
      deleted,
      metadata,
    ),
  }
}

export function restorePaymentMutation(
  current: AppData,
  id: string,
  metadata?: AuditMetadata,
): MutationResult {
  if (current.payments.some((payment) => payment.id === id)) {
    throw new Error('Payment already active')
  }
  const deleted = current.deletedPayments.find((payment) => payment.id === id)
  if (!deleted) throw new Error('Deleted payment not found')
  const { deletedAt: _deletedAt, deletedReason: _deletedReason, ...restored } =
    deleted
  const data = nextData({
    ...current,
    payments: [...current.payments, restored],
    deletedPayments: current.deletedPayments.filter((payment) => payment.id !== id),
  })
  return {
    data,
    auditEvent: event(
      'payment.restored',
      'payment',
      id,
      data.version,
      deleted,
      restored,
      metadata,
    ),
  }
}

export function renameMembersMutation(
  current: AppData,
  names: Record<string, string>,
  bankingQrImages: Record<string, string> | undefined,
  metadata?: AuditMetadata,
): MutationResult {
  const members = current.members.map((member) => ({
    ...member,
    name: names[member.id]?.trim() ? names[member.id].trim() : member.name,
    bankingQrImage: bankingQrImages?.[member.id] ?? member.bankingQrImage,
  }))
  const data = nextData({ ...current, members })
  return {
    data,
    auditEvent: event(
      'members.updated',
      'members',
      'members',
      data.version,
      current.members,
      members,
      metadata,
    ),
  }
}

export function resetDataMutation(
  current: AppData,
  metadata?: AuditMetadata,
): MutationResult {
  const data = nextData({
    ...current,
    expenses: [],
    payments: [],
  })
  return {
    data,
    auditEvent: event(
      'data.reset',
      'data',
      'default',
      data.version,
      {
        expenses: current.expenses,
        payments: current.payments,
      },
      {
        expenses: [],
        payments: [],
      },
      metadata,
    ),
  }
}
