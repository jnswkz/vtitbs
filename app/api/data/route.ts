import { NextResponse } from 'next/server'

import {
  assertFreshVersion,
  isValidData,
  renameMembersMutation,
  resetDataMutation,
  VersionConflictError,
} from '@/lib/app-data'
import { isBankingQrImage } from '@/lib/banking-qr'
import { hasMongoConfig } from '@/lib/mongodb'
import {
  ensureAppData,
  isAuthorized,
  requestMetadata,
  saveMutation,
} from '@/lib/data-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function mongoConfigError() {
  return NextResponse.json(
    { error: 'Missing MONGO_URI or MONGODB_URI environment variable' },
    { status: 500 },
  )
}

function isValidNames(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((name) => typeof name === 'string')
  )
}

function isValidBankingQrImages(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every(isBankingQrImage)
  )
}

function conflict(error: VersionConflictError) {
  return NextResponse.json(
    { error: 'Stale data. Reload latest data before saving.', latest: error.latest },
    { status: 409 },
  )
}

export async function GET() {
  if (!hasMongoConfig()) return mongoConfigError()

  try {
    const data = await ensureAppData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to load MongoDB app data', error)
    return NextResponse.json(
      { error: 'Failed to load app data' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  if (!hasMongoConfig()) return mongoConfigError()

  try {
    const body: unknown = await request.json()
    if (!isValidData(body)) {
      return NextResponse.json({ error: 'Invalid app data' }, { status: 400 })
    }

    return NextResponse.json(
      {
        error:
          'Whole-document saves are disabled. Use atomic expense/payment endpoints.',
      },
      { status: 405 },
    )
  } catch (error) {
    console.error('Rejected whole-document save', error)
    return NextResponse.json(
      { error: 'Failed to save app data' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  if (!hasMongoConfig()) return mongoConfigError()

  try {
    const body: unknown = await request.json()
    const { password, names, bankingQrImages, baseVersion } = body as {
      password?: unknown
      names?: unknown
      bankingQrImages?: unknown
      baseVersion?: unknown
    }

    if (!isAuthorized(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    if (!isValidNames(names)) {
      return NextResponse.json({ error: 'Invalid member names' }, { status: 400 })
    }

    if (
      bankingQrImages !== undefined &&
      !isValidBankingQrImages(bankingQrImages)
    ) {
      return NextResponse.json(
        { error: 'Invalid banking QR images' },
        { status: 400 },
      )
    }

    const current = await ensureAppData()
    assertFreshVersion(current, baseVersion)
    const result = renameMembersMutation(
      current,
      names,
      bankingQrImages,
      requestMetadata(request),
    )
    const data = await saveMutation(result)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof VersionConflictError) return conflict(error)
    console.error('Failed to rename MongoDB members', error)
    return NextResponse.json(
      { error: 'Failed to rename members' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  if (!hasMongoConfig()) return mongoConfigError()

  try {
    const body: unknown = await request.json().catch(() => ({}))
    const { password, baseVersion } = body as {
      password?: unknown
      baseVersion?: unknown
    }

    if (!isAuthorized(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const current = await ensureAppData()
    assertFreshVersion(current, baseVersion)
    const result = resetDataMutation(current, requestMetadata(request))
    const data = await saveMutation(result)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof VersionConflictError) return conflict(error)
    console.error('Failed to reset MongoDB app data', error)
    return NextResponse.json(
      { error: 'Failed to reset app data' },
      { status: 500 },
    )
  }
}
