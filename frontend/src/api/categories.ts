import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type { Category, CategoryCreateData, CategoryUpdateData } from '@/types/category'

export const categoriesApi = {
  /** List categories for a wallet */
  async list(walletId?: string): Promise<ApiResponse<Category[]>> {
    const params = walletId ? { wallet_id: walletId } : undefined
    return apiClient.get('/categories', params as Record<string, string>)
  },

  /** Get a single category */
  async get(id: string): Promise<ApiResponse<Category>> {
    return apiClient.get(`/categories/${id}`)
  },

  /** Create a custom category */
  async create(data: CategoryCreateData): Promise<ApiResponse<Category>> {
    return apiClient.post('/categories', data)
  },

  /** Update a category */
  async update(id: string, data: CategoryUpdateData): Promise<ApiResponse<Category>> {
    return apiClient.patch(`/categories/${id}`, data)
  },

  /** Soft-delete a category */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/categories/${id}`)
  },
}
