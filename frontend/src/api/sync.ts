/**
 * Sync API — offline-first sync endpoints.
 * GET  /sync/delta  — pull changes since timestamp
 * POST /sync/batch  — push batch of queued operations
 */

import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SyncEntityDelta<T> {
  items: T[]
  deleted: string[]
}

export interface SyncDeltaData {
  transactions: SyncEntityDelta<LocalTransactionDTO>
  circle_posts: SyncEntityDelta<LocalCirclePostDTO>
  circles: SyncEntityDelta<LocalCircleDTO>
  server_time: string
}

export interface SyncOperationDTO {
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'transaction' | 'circle_post' | 'comment'
  entityId?: string
  payload?: Record<string, unknown>
  client_id: string
}

export interface SyncBatchRequest {
  operations: SyncOperationDTO[]
}

export interface SyncOperationResult {
  client_id: string
  success: boolean
  server_id?: string
  error?: string
}

export interface SyncBatchResultDTO {
  results: SyncOperationResult[]
  synced_count: number
  failed_count: number
  server_time: string
}

// ── DTOs from backend (snake_case) ───────────────────────────────────────────

export interface LocalTransactionDTO {
  id: string
  user_id: string
  wallet_id: string
  category_id?: string
  image_url?: string
  thumbnail_url?: string
  merchant_name?: string
  amount: number
  currency: string
  transaction_date?: string
  note?: string
  ocr_confidence: number
  is_life_log: boolean
  is_income: boolean
  transaction_status: string
  created_at: string
  updated_at: string
}

export interface LocalCirclePostDTO {
  id: string
  circle_id: string
  author_id: string
  image_url: string
  caption?: string
  ocr_data?: Record<string, unknown>
  is_visible_link: boolean
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface LocalCircleDTO {
  id: string
  name: string
  description?: string
  cover_image_url?: string
  owner_id: string
  visibility: string
  circle_type: string
  max_members: number
  created_at: string
  updated_at: string
}

// ── API Methods ────────────────────────────────────────────────────────────────

export const syncApi = {
  /**
   * GET /api/v1/sync/delta?since={timestamp}
   * Pull all changes since the last sync moment.
   */
  async getDelta(since?: string): Promise<ApiResponse<SyncDeltaData>> {
    const params: Record<string, string> = {}
    if (since) params['since'] = since
    return apiClient.get<SyncDeltaData>('/sync/delta', params)
  },

  /**
   * POST /api/v1/sync/batch
   * Push a batch of offline operations to the server.
   */
  async pushBatch(operations: SyncOperationDTO[]): Promise<ApiResponse<SyncBatchResultDTO>> {
    return apiClient.post<SyncBatchResultDTO>('/sync/batch', { operations })
  },
}