/**
 * Tasks API — /api/v1/tasks endpoints.
 */

import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'

// ── Types ───────────────────────────────────────────────────────

export interface TaskItem {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null  // "YYYY-MM-DD"
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  related_transaction_id: string | null
  related_circle_post_id: string | null
  reminder_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Denormalized related data
  related_transaction_amount: number | null
  related_transaction_merchant: string | null
  related_transaction_image: string | null
  related_circle_post_caption: string | null
  related_circle_post_image: string | null
}

export interface TaskListResponse {
  items: TaskItem[]
  total: number
  limit: number
  offset: number
}

export interface CreateTaskData {
  title: string
  description?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  related_transaction_id?: string
  related_circle_post_id?: string
  reminder_at?: string
}

export interface UpdateTaskData {
  title?: string
  description?: string | null
  due_date?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  reminder_at?: string | null
}

// ── API ────────────────────────────────────────────────────────

export const tasksApi = {
  /**
   * GET /api/v1/tasks
   */
  async list(params?: {
    status?: string
    due_date?: string
    limit?: number
    offset?: number
  }): Promise<ApiResponse<TaskListResponse>> {
    return apiClient.get<TaskListResponse>('/tasks', params as Record<string, string>)
  },

  /**
   * POST /api/v1/tasks
   */
  async create(data: CreateTaskData): Promise<ApiResponse<TaskItem>> {
    return apiClient.post<TaskItem>('/tasks', data)
  },

  /**
   * GET /api/v1/tasks/:id
   */
  async get(id: string): Promise<ApiResponse<{ task: TaskItem }>> {
    return apiClient.get<{ task: TaskItem }>(`/tasks/${id}`)
  },

  /**
   * PATCH /api/v1/tasks/:id
   */
  async update(id: string, data: UpdateTaskData): Promise<ApiResponse<{ task: TaskItem }>> {
    return apiClient.patch<{ task: TaskItem }>(`/tasks/${id}`, data)
  },

  /**
   * PATCH /api/v1/tasks/:id/complete
   */
  async complete(id: string, completed = true): Promise<ApiResponse<{ task: TaskItem }>> {
    return apiClient.patch<{ task: TaskItem }>(`/tasks/${id}/complete`, { completed })
  },

  /**
   * DELETE /api/v1/tasks/:id
   */
  async delete(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/tasks/${id}`)
  },
}
