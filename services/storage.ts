// Persistence layer. This is deliberately isolated from the business logic and
// the UI so the backing store can change without touching calculations or
// component actions.

import { createSeedData } from '@/lib/seed'
import type { AppData } from '@/lib/types'

const STORAGE_KEY = 'split3:data:v1'

export interface StorageAdapter {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
  reset(): Promise<AppData>
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

/**
 * localStorage-backed adapter. Safe to import on the server: it no-ops when
 * `window` is unavailable and only touches storage inside its methods.
 */
export const localStorageAdapter: StorageAdapter = {
  async load(): Promise<AppData> {
    if (typeof window === 'undefined') return createSeedData()
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        const seed = createSeedData()
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
        return seed
      }
      const parsed: unknown = JSON.parse(raw)
      if (!isValidData(parsed)) {
        const seed = createSeedData()
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
        return seed
      }
      return parsed
    } catch {
      return createSeedData()
    }
  },

  async save(data: AppData): Promise<void> {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Ignore quota / serialization errors in the MVP.
    }
  },

  async reset(): Promise<AppData> {
    const seed = createSeedData()
    if (typeof window === 'undefined') return seed
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    } catch {
      // Ignore quota / serialization errors in the MVP.
    }
    return seed
  },
}

export const mongoStorageAdapter: StorageAdapter = {
  async load(): Promise<AppData> {
    try {
      const response = await fetch('/api/data', {
        cache: 'no-store',
      })

      if (!response.ok) return localStorageAdapter.load()

      const parsed: unknown = await response.json()
      if (!isValidData(parsed)) return localStorageAdapter.load()

      return parsed
    } catch {
      return localStorageAdapter.load()
    }
  },

  async save(data: AppData): Promise<void> {
    try {
      const response = await fetch('/api/data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        await localStorageAdapter.save(data)
      }
    } catch {
      await localStorageAdapter.save(data)
    }
  },

  async reset(): Promise<AppData> {
    try {
      const response = await fetch('/api/data', {
        method: 'DELETE',
        cache: 'no-store',
      })

      if (!response.ok) return localStorageAdapter.reset()

      const parsed: unknown = await response.json()
      if (!isValidData(parsed)) return localStorageAdapter.reset()

      await localStorageAdapter.save(parsed)
      return parsed
    } catch {
      return localStorageAdapter.reset()
    }
  },
}

/** Remove all persisted data (used by "reset to demo data"). */
export function clearStorage(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
