import { NextResponse } from 'next/server'

import {
  addExpenseMutation,
  assertFreshVersion,
  VersionConflictError,
  type ExpenseInput,
} from '@/lib/app-data'
import { hasMongoConfig } from '@/lib/mongodb'
import {
  ensureAppData,
  requestMetadata,
  saveMutation,
} from '@/lib/data-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isExpenseInput(value: unknown): value is ExpenseInput {
  if (typeof value !== 'object' || value === null) return false
  const input = value as Partial<ExpenseInput>
  return (
    typeof input.title === 'string' &&
    typeof input.amount === 'number' &&
    Number.isInteger(input.amount) &&
    input.amount > 0 &&
    typeof input.payerId === 'string' &&
    Array.isArray(input.participantIds) &&
    input.participantIds.length > 0 &&
    input.participantIds.every((id) => typeof id === 'string') &&
    (input.note === undefined || typeof input.note === 'string')
  )
}

function conflict(error: VersionConflictError) {
  return NextResponse.json(
    { error: 'Stale data. Reload latest data before saving.', latest: error.latest },
    { status: 409 },
  )
}

export async function POST(request: Request) {
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: 'Missing MONGO_URI or MONGODB_URI environment variable' },
      { status: 500 },
    )
  }

  try {
    const body: unknown = await request.json()
    const { baseVersion, input } = body as {
      baseVersion?: unknown
      input?: unknown
    }

    if (!isExpenseInput(input)) {
      return NextResponse.json({ error: 'Invalid expense input' }, { status: 400 })
    }

    const current = await ensureAppData()
    assertFreshVersion(current, baseVersion)
    const result = addExpenseMutation(current, input, requestMetadata(request))
    const data = await saveMutation(result)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof VersionConflictError) return conflict(error)
    console.error('Failed to create expense', error)
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 },
    )
  }
}
