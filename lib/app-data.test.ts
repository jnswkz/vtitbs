import { describe, expect, it } from 'vitest'

import {
  addExpenseMutation,
  assertFreshVersion,
  deleteExpenseMutation,
  resetDataMutation,
  restoreExpenseMutation,
  updateExpenseMutation,
  VersionConflictError,
} from './app-data'
import { createSeedData } from './seed'

describe('app data mutations', () => {
  it('adds a bill without dropping existing bills', () => {
    const current = createSeedData()
    const result = addExpenseMutation(current, {
      title: 'Cafe',
      amount: 120000,
      payerId: current.members[0].id,
      participantIds: current.members.map((member) => member.id),
    })

    expect(result.data.expenses).toHaveLength(current.expenses.length + 1)
    expect(result.data.expenses.map((expense) => expense.id)).toEqual(
      expect.arrayContaining(current.expenses.map((expense) => expense.id)),
    )
    expect(result.data.version).toBe(current.version + 1)
    expect(result.auditEvent.action).toBe('expense.created')
  })

  it('updates one bill without overwriting unrelated newer bills', () => {
    const added = addExpenseMutation(createSeedData(), {
      title: 'Cafe',
      amount: 120000,
      payerId: 'member-an',
      participantIds: ['member-an', 'member-binh'],
    }).data

    const updated = updateExpenseMutation(added, 'seed-expense-1', {
      title: 'Ăn tối updated',
      amount: 910000,
      payerId: 'member-an',
      participantIds: ['member-an', 'member-binh', 'member-cuong'],
    }).data

    expect(updated.expenses.some((expense) => expense.title === 'Cafe')).toBe(
      true,
    )
    expect(
      updated.expenses.find((expense) => expense.id === 'seed-expense-1')
        ?.amount,
    ).toBe(910000)
  })

  it('rejects stale base versions before mutation', () => {
    const current = createSeedData()

    expect(() => assertFreshVersion(current, current.version - 1)).toThrow(
      VersionConflictError,
    )
    expect(current.expenses).toHaveLength(3)
  })

  it('soft deletes a bill and writes an audit event', () => {
    const current = createSeedData()
    const result = deleteExpenseMutation(current, 'seed-expense-2')

    expect(result.data.expenses.map((expense) => expense.id)).not.toContain(
      'seed-expense-2',
    )
    expect(result.data.deletedExpenses[0].id).toBe('seed-expense-2')
    expect(result.auditEvent.action).toBe('expense.deleted')
    expect(result.auditEvent.before).toMatchObject({ id: 'seed-expense-2' })
  })

  it('restores a soft-deleted bill to active expenses', () => {
    const deleted = deleteExpenseMutation(createSeedData(), 'seed-expense-2').data
    const restored = restoreExpenseMutation(deleted, 'seed-expense-2').data

    expect(restored.expenses.map((expense) => expense.id)).toContain(
      'seed-expense-2',
    )
    expect(restored.deletedExpenses.map((expense) => expense.id)).not.toContain(
      'seed-expense-2',
    )
  })

  it('reset clears active transactions but preserves deleted records', () => {
    const deleted = deleteExpenseMutation(createSeedData(), 'seed-expense-2').data
    const result = resetDataMutation(deleted)

    expect(result.data.expenses).toEqual([])
    expect(result.data.payments).toEqual([])
    expect(result.data.deletedExpenses).toHaveLength(1)
    expect(result.auditEvent.action).toBe('data.reset')
    expect(result.auditEvent.before).toMatchObject({
      expenses: expect.any(Array),
      payments: expect.any(Array),
    })
  })
})
