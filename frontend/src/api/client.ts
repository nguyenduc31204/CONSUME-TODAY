import { useAuthStore } from '@/stores/authStore'
import type { ApiResponse } from '@/types/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

/** Navigates to login page after token expiry */
function _redirectToLogin() {
  window.location.href = '/login'
}

/**
 * Generic fetch-based API client.
 * All methods return the standard { success, data, message } envelope.
 * Automatically reads auth token from authStore on every request.
 */
export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl
  }

  private _getToken(): string | null {
    const state = useAuthStore.getState()
    // Silently redirect to login if token is expired (with buffer)
    if (!state.isTokenValid()) {
      if (state.accessToken) {
        // Token was stored but is now expired — force logout
        state.logout()
        _redirectToLogin()
      }
      return null
    }
    return state.accessToken
  }

  private async request<T>(
    method: string,
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const token = this._getToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        method,
        ...options,
        headers,
      })

      // 401 — token invalid or expired on the server side
      if (response.status === 401) {
        const { logout } = useAuthStore.getState()
        logout()
        _redirectToLogin()
        return {
          success: false,
          data: null,
          message: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
        }
      }

      const data: ApiResponse<T> = await response.json()
      return data
    } catch (err) {
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
    const token = this._getToken()
    const formData = new FormData()
    formData.append('file', file)

    if (additionalFields) {
      for (const [key, value] of Object.entries(additionalFields)) {
        formData.append(key, value)
      }
    }

    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers,
      })

      // 401 — token invalid or expired on the server side
      if (response.status === 401) {
        const { logout } = useAuthStore.getState()
        logout()
        _redirectToLogin()
        return {
          success: false,
          data: null,
          message: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
        } as ApiResponse<T>
      }

      const data: ApiResponse<T> = await response.json()
      return data
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
