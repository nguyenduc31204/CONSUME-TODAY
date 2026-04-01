import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type { Transaction, TransactionListParams, TransactionUpdateData } from '@/types/transaction'
import type { PaginatedData } from '@/types/api'

export const transactionsApi = {
  /** List transactions with optional filters */
  async list(params?: TransactionListParams): Promise<ApiResponse<PaginatedData<Transaction>>> {
    return apiClient.get('/transactions', params as Record<string, string>)
  },

  /** Get a single transaction */
  async get(id: string): Promise<ApiResponse<Transaction>> {
    return apiClient.get(`/transactions/${id}`)
  },

  /** Upload image → AI OCR → auto-save transaction */
  async uploadImage(file: File, walletId?: string): Promise<ApiResponse<Transaction>> {
    return apiClient.upload('/transactions/upload', file, walletId ? { wallet_id: walletId } : undefined)
  },

  /** Update a transaction (human-in-the-loop edit) */
  async update(id: string, data: TransactionUpdateData): Promise<ApiResponse<Transaction>> {
    return apiClient.patch(`/transactions/${id}`, data)
  },

  /** Soft-delete a transaction */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/transactions/${id}`)
  },
}
