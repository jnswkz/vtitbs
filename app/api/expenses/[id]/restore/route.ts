import { NextResponse } from 'next/server'

import {
  assertFreshVersion,
  restoreExpenseMutation,
  VersionConflictError,
} from '@/lib/app-data'
import { hasMongoConfig } from '@/lib/mongodb'
import {
  ensureAppData,
  isAuthorized,
  requestMetadata,
  saveMutation,
} from '@/lib/data-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function conflict(error: VersionConflictError) {
  return NextResponse.json(
    { error: 'Stale data. Reload latest data before saving.', latest: error.latest },
    { status: 409 },
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: 'Missing MONGO_URI or MONGODB_URI environment variable' },
      { status: 500 },
    )
  }

  try {
    const { id } = await params
    const body: unknown = await request.json().catch(() => ({}))
    const { baseVersion, password } = body as {
      baseVersion?: unknown
      password?: unknown
    }

    if (!isAuthorized(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const current = await ensureAppData()
    assertFreshVersion(current, baseVersion)
    const result = restoreExpenseMutation(current, id, requestMetadata(request))
    const data = await saveMutation(result)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof VersionConflictError) return conflict(error)
    if (
      error instanceof Error &&
      ['Deleted expense not found', 'Expense already active'].includes(
        error.message,
      )
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('Failed to restore expense', error)
    return NextResponse.json(
      { error: 'Failed to restore expense' },
      { status: 500 },
    )
  }
}
