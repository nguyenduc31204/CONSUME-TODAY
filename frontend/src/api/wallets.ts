import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type { Wallet, WalletCreateData, WalletUpdateData } from '@/types/wallet'

export const walletsApi = {
  /** List all wallets */
  async list(): Promise<ApiResponse<Wallet[]>> {
    return apiClient.get('/wallets')
  },

  /** Get a single wallet */
  async get(id: string): Promise<ApiResponse<Wallet>> {
    return apiClient.get(`/wallets/${id}`)
  },

  /** Create a new wallet */
  async create(data: WalletCreateData): Promise<ApiResponse<Wallet>> {
    return apiClient.post('/wallets', data)
  },

  /** Update a wallet */
  async update(id: string, data: WalletUpdateData): Promise<ApiResponse<Wallet>> {
    return apiClient.patch(`/wallets/${id}`, data)
  },

  /** Set wallet as default */
  async setDefault(id: string): Promise<ApiResponse<Wallet>> {
    return apiClient.post(`/wallets/${id}/set-default`)
  },

  /** Soft-delete a wallet */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/wallets/${id}`)
  },
}
