import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

interface GoogleAuthRequest {
  code: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export const authApi = {
  /** Exchange Google OAuth code for JWT tokens */
  async googleAuth(code: string): Promise<ApiResponse<TokenResponse>> {
    return apiClient.post('/auth/google', { code } as GoogleAuthRequest)
  },

  /** Login with email + password */
  async loginWithEmail(credentials: LoginRequest): Promise<ApiResponse<TokenResponse>> {
    return apiClient.post('/auth/login', credentials)
  },

  /** Register with email + password + name */
  async register(data: RegisterRequest): Promise<ApiResponse<TokenResponse>> {
    return apiClient.post('/auth/register', data)
  },

  /** Refresh access token */
  async refresh(refreshToken: string): Promise<ApiResponse<TokenResponse>> {
    return apiClient.post('/auth/refresh', { refresh_token: refreshToken })
  },

  /** Logout (client discards tokens) */
  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post('/auth/logout')
  },
}
