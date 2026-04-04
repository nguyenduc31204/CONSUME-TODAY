/**
 * Images API — /api/v1/images endpoints.
 */

import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'

export interface ImageResponse {
  id: string
  url: string
  thumbnail_url: string | null
  filename: string
  mime_type: string
  file_size: number
  width: number | null
  height: number | null
  created_at: string
}

export const imagesApi = {
  upload(file: File): Promise<ApiResponse<ImageResponse>> {
    return apiClient.upload<ImageResponse>('/images/upload', file)
  },
}
