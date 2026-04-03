import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'

export interface UserStats {
  total_transactions: number
  total_spent: number
  total_images: number
}

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar_url?: string
  has_password: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UpdateProfilePayload {
  name?: string
  avatar_url?: string | null
}

export const usersApi = {
  async getMyStats(): Promise<ApiResponse<UserStats>> {
    return apiClient.get<UserStats>('/users/me/stats')
  },

  async getMyProfile(): Promise<ApiResponse<UserProfile>> {
    return apiClient.get<UserProfile>('/users/me')
  },

  async updateMyProfile(data: UpdateProfilePayload): Promise<ApiResponse<UserProfile>> {
    return apiClient.patch<UserProfile>('/users/me', data)
  },

  /**
   * Upload avatar image → R2 → returns updated UserProfile.
   * The backend handles square-crop + resize to 256x256 + JPEG.
   */
  async uploadAvatar(file: File): Promise<ApiResponse<UserProfile>> {
    return apiClient.upload<UserProfile>('/users/me/avatar', file)
  },
}
