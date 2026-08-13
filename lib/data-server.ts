import { getMongoDb } from '@/lib/mongodb'
import {
  normalizeAppData,
  VersionConflictError,
  type MutationResult,
} from '@/lib/app-data'
import { createSeedData } from '@/lib/seed'
import type { AppData, AuditEvent } from '@/lib/types'

const DATA_COLLECTION = 'app_data'
const AUDIT_COLLECTION = 'audit_events'
const DOCUMENT_ID = 'default'

type AppDataDocument = AppData & {
  _id: typeof DOCUMENT_ID
  updatedAt: Date
}

type AuditDocument = AuditEvent & {
  _id: string
}

export function isAuthorized(password: unknown): boolean {
  const expected = process.env.RESET_PASSWORD
  return (
    typeof expected === 'string' &&
    expected.length > 0 &&
    typeof password === 'string' &&
    password === expected
  )
}

export function requestMetadata(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return {
    userAgent: request.headers.get('user-agent') ?? undefined,
    ip: forwardedFor?.split(',')[0]?.trim(),
  }
}

export async function getDataCollection() {
  const db = await getMongoDb()
  return db.collection<AppDataDocument>(DATA_COLLECTION)
}

export async function getAuditCollection() {
  const db = await getMongoDb()
  return db.collection<AuditDocument>(AUDIT_COLLECTION)
}

export async function ensureAppData(): Promise<AppData> {
  const collection = await getDataCollection()
  const existing = await collection.findOne({ _id: DOCUMENT_ID })

  if (existing) {
    const normalized = normalizeAppData(existing)
    if (
      existing.version !== normalized.version ||
      !Array.isArray(existing.deletedExpenses) ||
      !Array.isArray(existing.deletedPayments)
    ) {
      await collection.updateOne(
        { _id: DOCUMENT_ID },
        {
          $set: {
            ...normalized,
            updatedAt: new Date(),
          },
        },
      )
    }
    return normalized
  }

  const seed = createSeedData()
  await collection.insertOne({
    _id: DOCUMENT_ID,
    ...seed,
    updatedAt: new Date(),
  })
  return seed
}

export async function saveMutation(result: MutationResult): Promise<AppData> {
  const dataCollection = await getDataCollection()
  const auditCollection = await getAuditCollection()
  const previousVersion = result.data.version - 1

  const updateResult = await dataCollection.updateOne(
    { _id: DOCUMENT_ID, version: previousVersion },
    {
      $set: {
        ...result.data,
        updatedAt: new Date(),
      },
    },
  )

  if (updateResult.matchedCount === 0) {
    throw new VersionConflictError(await ensureAppData())
  }

  await auditCollection.insertOne({
    _id: result.auditEvent.id,
    ...result.auditEvent,
  })

  return result.data
}

export async function listAuditEvents(): Promise<AuditEvent[]> {
  const auditCollection = await getAuditCollection()
  const events = await auditCollection
    .find({})
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray()

  return events.map(({ _id: _id, ...event }) => event)
}
