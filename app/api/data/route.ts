import { NextResponse } from 'next/server'

import { isBankingQrImage } from '@/lib/banking-qr'
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

function isAuthorized(password: unknown): boolean {
  const expected = process.env.RESET_PASSWORD
  return (
    typeof expected === 'string' &&
    expected.length > 0 &&
    typeof password === 'string' &&
    password === expected
  )
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
    const existing = await collection.findOne({ _id: DOCUMENT_ID })
    const members = existing?.members ?? createSeedData().members

    await collection.updateOne(
      { _id: DOCUMENT_ID },
      {
        $set: {
          members,
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

export async function PATCH(request: Request) {
  if (!hasMongoConfig()) {
    return NextResponse.json(
      { error: 'Missing MONGO_URI or MONGODB_URI environment variable' },
      { status: 500 },
    )
  }

  try {
    const body: unknown = await request.json()
    const { password, names, bankingQrImages } = body as {
      password?: unknown
      names?: unknown
      bankingQrImages?: unknown
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

    const collection = await getCollection()
    const current = await ensureSeedData()
    const members = current.members.map((member) => ({
      ...member,
      name: names[member.id]?.trim() ? names[member.id].trim() : member.name,
      bankingQrImage:
        bankingQrImages?.[member.id] ?? member.bankingQrImage,
    }))

    await collection.updateOne(
      { _id: DOCUMENT_ID },
      {
        $set: {
          members,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return NextResponse.json({
      members,
      expenses: current.expenses,
      payments: current.payments,
    })
  } catch (error) {
    console.error('Failed to rename MongoDB members', error)
    return NextResponse.json(
      { error: 'Failed to rename members' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
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

    const collection = await getCollection()
    const current = await ensureSeedData()
    const cleared: AppData = {
      members: current.members,
      expenses: [],
      payments: [],
    }

    await collection.updateOne(
      { _id: DOCUMENT_ID },
      {
        $set: {
          ...cleared,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return NextResponse.json(cleared)
  } catch (error) {
    console.error('Failed to reset MongoDB app data', error)
    return NextResponse.json(
      { error: 'Failed to reset app data' },
      { status: 500 },
    )
  }
}
