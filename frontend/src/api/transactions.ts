import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type { Transaction, TransactionListParams, TransactionCreateData, TransactionUpdateData } from '@/types/transaction'
import type { PaginatedData } from '@/types/api'
import type { UploadTransactionResponse, TransactionEditResponse } from '@/types/upload'

export const transactionsApi = {
  /** List transactions with optional filters */
  async list(params?: TransactionListParams): Promise<ApiResponse<PaginatedData<Transaction>>> {
    return apiClient.get('/transactions', params as Record<string, string>)
  },

  /** Get a single transaction */
  async get(id: string): Promise<ApiResponse<Transaction>> {
    return apiClient.get(`/transactions/${id}`)
  },

  /** Upload image → AI OCR → create pending transaction */
  async upload(
    file: File,
    walletId?: string,
  ): Promise<ApiResponse<UploadTransactionResponse>> {
    return apiClient.upload<UploadTransactionResponse>(
      '/transactions/upload',
      file,
      walletId ? { wallet_id: walletId } : undefined,
    )
  },

  /** Confirm a pending transaction (auto-save after countdown) */
  async confirm(id: string): Promise<ApiResponse<Transaction>> {
    return apiClient.post<Transaction>(`/transactions/${id}/confirm`)
  },

  /** Get transaction data + available wallets + categories for Quick Edit */
  async getForEdit(id: string): Promise<ApiResponse<TransactionEditResponse>> {
    return apiClient.get<TransactionEditResponse>(`/transactions/${id}/edit`)
  },

  /** Convert a life-log entry to a financial expense */
  async convertToExpense(
    id: string,
    data: { amount: number; category_id: string; merchant_name?: string },
  ): Promise<ApiResponse<Transaction>> {
    return apiClient.post<Transaction>(`/transactions/${id}/convert-to-expense`, data)
  },

  /** Update a transaction (human-in-the-loop edit) */
  async update(id: string, data: TransactionUpdateData): Promise<ApiResponse<Transaction>> {
    return apiClient.patch<Transaction>(`/transactions/${id}`, data)
  },

  /** Soft-delete a transaction */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/transactions/${id}`)
  },

  /** Add income to a life-log entry (creates expense + adds balance to wallet) */
  async addIncome(
    id: string,
    data: { amount: number; wallet_id?: string; note?: string },
  ): Promise<ApiResponse<Transaction>> {
    return apiClient.post<Transaction>(`/transactions/${id}/add-income`, data)
  },

  /** Create a manual transaction without uploading an image (Phase 9c) */
  async createManual(data: TransactionCreateData): Promise<ApiResponse<Transaction>> {
    return apiClient.post<Transaction>('/transactions/manual', data)
  },
}
