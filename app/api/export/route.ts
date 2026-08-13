import { NextResponse } from 'next/server'

import { hasMongoConfig } from '@/lib/mongodb'
import {
  ensureAppData,
  isAuthorized,
  listAuditEvents,
} from '@/lib/data-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: 'Missing MONGO_URI or MONGODB_URI environment variable' },
      { status: 500 },
    )
  }

  try {
    const body: unknown = await request.json().catch(() => ({}))
    const { password } = body as { password?: unknown }

    if (!isAuthorized(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const data = await ensureAppData()
    const auditEvents = await listAuditEvents()
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      data,
      auditEvents,
    })
  } catch (error) {
    console.error('Failed to export app data', error)
    return NextResponse.json(
      { error: 'Failed to export app data' },
      { status: 500 },
    )
  }
}
