// Persistence layer. Mongo-backed writes use atomic API endpoints with optimistic
// concurrency so stale browser tabs cannot overwrite newer transactions.

import {
  addExpenseMutation,
  addPaymentMutation,
  deleteExpenseMutation,
  deletePaymentMutation,
  isValidData,
  normalizeAppData,
  renameMembersMutation,
  resetDataMutation,
  restoreExpenseMutation,
  restorePaymentMutation,
  updateExpenseMutation,
  updatePaymentMutation,
  VersionConflictError,
  type ExpenseInput,
  type PaymentInput,
} from '@/lib/app-data'
import type { AppData } from '@/lib/types'

const STORAGE_KEY = 'split3:data:v1'

export class StorageConflictError extends Error {
  constructor(public latest: AppData) {
    super('Dữ liệu đã thay đổi ở trình duyệt khác. Đã tải lại dữ liệu mới nhất.')
    this.name = 'StorageConflictError'
  }
}

export interface StorageAdapter {
  load(): Promise<AppData>
  addExpense(data: AppData, input: ExpenseInput): Promise<AppData>
  updateExpense(data: AppData, id: string, input: ExpenseInput): Promise<AppData>
  deleteExpense(data: AppData, id: string, password: string): Promise<AppData>
  restoreExpense(data: AppData, id: string, password: string): Promise<AppData>
  addPayment(data: AppData, input: PaymentInput): Promise<AppData>
  updatePayment(data: AppData, id: string, input: PaymentInput): Promise<AppData>
  deletePayment(data: AppData, id: string, password: string): Promise<AppData>
  restorePayment(data: AppData, id: string, password: string): Promise<AppData>
  renameMembers(
    data: AppData,
    names: Record<string, string>,
    password: string,
    bankingQrImages?: Record<string, string>,
  ): Promise<AppData>
  reset(data: AppData, password: string): Promise<AppData>
  exportData(password: string): Promise<unknown>
}

function saveLocal(data: AppData): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore quota / serialization errors in the MVP fallback.
  }
}

async function parseDataResponse(response: Response): Promise<AppData> {
  const parsed: unknown = await response.json()
  if (!isValidData(parsed)) throw new Error('Dữ liệu trả về không hợp lệ.')
  const data = normalizeAppData(parsed)
  saveLocal(data)
  return data
}

async function mutate(
  url: string,
  method: string,
  body: Record<string, unknown>,
): Promise<AppData> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(body),
  })

  if (response.status === 409) {
    const parsed = (await response.json()) as { latest?: unknown }
    const latest = normalizeAppData(parsed.latest)
    saveLocal(latest)
    throw new StorageConflictError(latest)
  }

  if (!response.ok) {
    const parsed = (await response.json().catch(() => ({}))) as {
      error?: string
    }
    throw new Error(parsed.error ?? 'Không thể lưu dữ liệu.')
  }

  return parseDataResponse(response)
}

/**
 * localStorage-backed adapter. It mirrors the same shape as the Mongo adapter,
 * but cannot verify passwords because localStorage is only a network fallback.
 */
export const localStorageAdapter: StorageAdapter = {
  async load(): Promise<AppData> {
    if (typeof window === 'undefined') return createLocalSeed()
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        const seed = createLocalSeed()
        saveLocal(seed)
        return seed
      }
      return normalizeAppData(JSON.parse(raw) as unknown)
    } catch {
      return createLocalSeed()
    }
  },

  async addExpense(data, input) {
    return saveLocalResult(addExpenseMutation(data, input).data)
  },

  async updateExpense(data, id, input) {
    return saveLocalResult(updateExpenseMutation(data, id, input).data)
  },

  async deleteExpense(data, id, _password) {
    return saveLocalResult(deleteExpenseMutation(data, id).data)
  },

  async restoreExpense(data, id, _password) {
    return saveLocalResult(restoreExpenseMutation(data, id).data)
  },

  async addPayment(data, input) {
    return saveLocalResult(addPaymentMutation(data, input).data)
  },

  async updatePayment(data, id, input) {
    return saveLocalResult(updatePaymentMutation(data, id, input).data)
  },

  async deletePayment(data, id, _password) {
    return saveLocalResult(deletePaymentMutation(data, id).data)
  },

  async restorePayment(data, id, _password) {
    return saveLocalResult(restorePaymentMutation(data, id).data)
  },

  async renameMembers(data, names, _password, bankingQrImages) {
    return saveLocalResult(
      renameMembersMutation(data, names, bankingQrImages).data,
    )
  },

  async reset(data, _password) {
    return saveLocalResult(resetDataMutation(data).data)
  },

  async exportData(_password) {
    return {
      exportedAt: new Date().toISOString(),
      data: await this.load(),
      auditEvents: [],
    }
  },
}

function createLocalSeed(): AppData {
  return normalizeAppData(undefined)
}

function saveLocalResult(data: AppData): AppData {
  saveLocal(data)
  return data
}

export const mongoStorageAdapter: StorageAdapter = {
  async load(): Promise<AppData> {
    try {
      const response = await fetch('/api/data', {
        cache: 'no-store',
      })

      if (!response.ok) return localStorageAdapter.load()
      return parseDataResponse(response)
    } catch {
      return localStorageAdapter.load()
    }
  },

  async addExpense(data, input) {
    return mutate('/api/expenses', 'POST', {
      baseVersion: data.version,
      input,
    })
  },

  async updateExpense(data, id, input) {
    return mutate(`/api/expenses/${id}`, 'PATCH', {
      baseVersion: data.version,
      input,
    })
  },

  async deleteExpense(data, id, password) {
    return mutate(`/api/expenses/${id}`, 'DELETE', {
      baseVersion: data.version,
      password,
    })
  },

  async restoreExpense(data, id, password) {
    return mutate(`/api/expenses/${id}/restore`, 'POST', {
      baseVersion: data.version,
      password,
    })
  },

  async addPayment(data, input) {
    return mutate('/api/payments', 'POST', {
      baseVersion: data.version,
      input,
    })
  },

  async updatePayment(data, id, input) {
    return mutate(`/api/payments/${id}`, 'PATCH', {
      baseVersion: data.version,
      input,
    })
  },

  async deletePayment(data, id, password) {
    return mutate(`/api/payments/${id}`, 'DELETE', {
      baseVersion: data.version,
      password,
    })
  },

  async restorePayment(data, id, password) {
    return mutate(`/api/payments/${id}/restore`, 'POST', {
      baseVersion: data.version,
      password,
    })
  },

  async renameMembers(data, names, password, bankingQrImages) {
    return mutate('/api/data', 'PATCH', {
      baseVersion: data.version,
      names,
      password,
      bankingQrImages,
    })
  },

  async reset(data, password) {
    return mutate('/api/data', 'DELETE', {
      baseVersion: data.version,
      password,
    })
  },

  async exportData(password) {
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({ password }),
    })

    if (!response.ok) {
      const parsed = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      throw new Error(parsed.error ?? 'Không thể xuất dữ liệu.')
    }

    return response.json()
  },
}

export async function resetLocalFallback(): Promise<AppData> {
  const data = await localStorageAdapter.load()
  return localStorageAdapter.reset(data, '')
}

export async function renameMembersLocalFallback(
  names: Record<string, string>,
  bankingQrImages?: Record<string, string>,
): Promise<AppData> {
  const data = await localStorageAdapter.load()
  return localStorageAdapter.renameMembers(data, names, '', bankingQrImages)
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
