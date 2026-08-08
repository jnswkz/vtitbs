import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGO_URI ?? process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB ?? 'split3'

declare global {
  // eslint-disable-next-line no-var
  var mongoClientPromise: Promise<MongoClient> | undefined
}

export function hasMongoConfig(): boolean {
  return Boolean(uri)
}

export async function getMongoDb(): Promise<Db> {
  if (!uri) {
    throw new Error('Missing MONGO_URI or MONGODB_URI environment variable')
  }

  if (!globalThis.mongoClientPromise) {
    const client = new MongoClient(uri)
    globalThis.mongoClientPromise = client.connect()
  }

  const client = await globalThis.mongoClientPromise
  return client.db(dbName)
}
