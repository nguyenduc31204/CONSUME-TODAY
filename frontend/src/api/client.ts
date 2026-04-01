import type { ApiResponse } from '@/types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

/**
 * Generic fetch-based API client.
 * All methods return the standard { success, data, message } envelope.
 * Automatically handles JSON headers and authorization.
 */
export class ApiClient {
  private baseUrl: string
  private authToken: string | null = null

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  private async request<T>(
    method: string,
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    try {
      const response = await fetch(url, {
        method,
        ...options,
        headers,
      })

      const data: ApiResponse<T> = await response.json()
      return data
    } catch (err) {
      // Network error
      return {
        success: false,
        data: null,
        message: err instanceof Error ? err.message : 'Network error',
      }
    }
  }

  async get<T>(path: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    const searchParams = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : ''
    return this.request<T>('GET', path + searchParams)
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, {
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, {
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, {
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path)
  }

  /**
   * Upload a file via multipart/form-data.
   * Does NOT set Content-Type: application/json.
   */
  async upload<T>(
    path: string,
    file: File,
    additionalFields?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const formData = new FormData()
    formData.append('file', file)

    if (additionalFields) {
      for (const [key, value] of Object.entries(additionalFields)) {
        formData.append(key, value)
      }
    }

    const headers: Record<string, string> = {}
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers,
      })
      return await response.json()
    } catch (err) {
      return {
        success: false,
        data: null,
        message: err instanceof Error ? err.message : 'Upload failed',
      }
    }
  }
}

export const apiClient = new ApiClient()
