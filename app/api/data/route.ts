import { NextResponse } from 'next/server'

import { getMongoDb, hasMongoConfig } from '@/lib/mongodb'
import { createSeedData } from '@/lib/seed'
import type { AppData } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLLECTION = 'app_data'
const DOCUMENT_ID = 'default'

type AppDataDocument = AppData & {
  _id: typeof DOCUMENT_ID
  updatedAt: Date
}

function isValidData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Partial<AppData>
  return (
    Array.isArray(data.members) &&
    Array.isArray(data.expenses) &&
    Array.isArray(data.payments)
  )
}

async function getCollection() {
  const db = await getMongoDb()
  return db.collection<AppDataDocument>(COLLECTION)
}

async function ensureSeedData(): Promise<AppData> {
  const collection = await getCollection()
  const existing = await collection.findOne({ _id: DOCUMENT_ID })

  if (existing) {
    const { members, expenses, payments } = existing
    return { members, expenses, payments }
  }

  const seed = createSeedData()
  await collection.insertOne({
    _id: DOCUMENT_ID,
    ...seed,
    updatedAt: new Date(),
  })
  return seed
}

export async function GET() {
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: 'Missing MONGO_URI or MONGODB_URI environment variable' },
      { status: 500 },
    )
  }

  try {
    const data = await ensureSeedData()
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
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: 'Missing MONGO_URI or MONGODB_URI environment variable' },
      { status: 500 },
    )
  }

  try {
    const body: unknown = await request.json()
    if (!isValidData(body)) {
      return NextResponse.json({ error: 'Invalid app data' }, { status: 400 })
    }

    const collection = await getCollection()
    const data = body

    await collection.updateOne(
      { _id: DOCUMENT_ID },
      {
        $set: {
          members: data.members,
          expenses: data.expenses,
          payments: data.payments,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to save MongoDB app data', error)
    return NextResponse.json(
      { error: 'Failed to save app data' },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: 'Missing MONGO_URI or MONGODB_URI environment variable' },
      { status: 500 },
    )
  }

  try {
    const seed = createSeedData()
    const collection = await getCollection()

    await collection.updateOne(
      { _id: DOCUMENT_ID },
      {
        $set: {
          members: seed.members,
          expenses: seed.expenses,
          payments: seed.payments,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return NextResponse.json(seed)
  } catch (error) {
    console.error('Failed to reset MongoDB app data', error)
    return NextResponse.json(
      { error: 'Failed to reset app data' },
      { status: 500 },
    )
  }
}
