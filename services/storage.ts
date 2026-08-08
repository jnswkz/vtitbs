// Persistence layer. This is deliberately isolated from the business logic and
// the UI so the backing store can change without touching calculations or
// component actions.

import { createSeedData } from '@/lib/seed'
import type { AppData } from '@/lib/types'

const STORAGE_KEY = 'split3:data:v1'

export interface StorageAdapter {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
  renameMembers(names: Record<string, string>, password: string): Promise<AppData>
  reset(password: string): Promise<AppData>
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

  async renameMembers(
    names: Record<string, string>,
    _password: string,
  ): Promise<AppData> {
    const current = await this.load()
    const renamed: AppData = {
      ...current,
      members: current.members.map((member) =>
        names[member.id]?.trim()
          ? { ...member, name: names[member.id].trim() }
          : member,
      ),
    }
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(renamed))
      }
    } catch {
      // Ignore quota / serialization errors in the MVP.
    }
    return renamed
  },

  async reset(_password: string): Promise<AppData> {
    const current = await this.load()
    const cleared: AppData = {
      members: current.members,
      expenses: [],
      payments: [],
    }
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleared))
      }
    } catch {
      // Ignore quota / serialization errors in the MVP.
    }
    return cleared
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

  async renameMembers(
    names: Record<string, string>,
    password: string,
  ): Promise<AppData> {
    const response = await fetch('/api/data', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ names, password }),
    })

    if (!response.ok) {
      throw new Error('Không thể đổi tên. Kiểm tra lại mật khẩu.')
    }

    const parsed: unknown = await response.json()
    if (!isValidData(parsed)) {
      throw new Error('Dữ liệu trả về không hợp lệ.')
    }

    await localStorageAdapter.save(parsed)
    return parsed
  },

  async reset(password: string): Promise<AppData> {
    const response = await fetch('/api/data', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({ password }),
    })

    if (!response.ok) {
      throw new Error('Không thể xóa dữ liệu. Kiểm tra lại mật khẩu.')
    }

    const parsed: unknown = await response.json()
    if (!isValidData(parsed)) {
      throw new Error('Dữ liệu trả về không hợp lệ.')
    }

    await localStorageAdapter.save(parsed)
    return parsed
  },
}

export async function resetLocalFallback(): Promise<AppData> {
  return localStorageAdapter.reset('')
}

export async function renameMembersLocalFallback(
  names: Record<string, string>,
): Promise<AppData> {
  return localStorageAdapter.renameMembers(names, '')
}

/** Remove all persisted data (used by reset fallback). */
export function clearStorage(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
