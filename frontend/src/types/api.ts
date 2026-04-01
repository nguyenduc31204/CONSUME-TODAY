/**
 * Standard API Response envelope — matches backend { success, data, message }.
 */

/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string
  code?: string
  details?: Record<string, unknown>
}

/** Paginated list response */
export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: PaginatedData<T>
  message: string
}

/** Error codes from backend */
export const ErrorCodes = {
  UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  NOT_FOUND: 'ERR_NOT_FOUND',
  VALIDATION: 'ERR_VALIDATION',
  CONFLICT: 'ERR_CONFLICT',
  INTERNAL: 'ERR_INTERNAL',
  STORAGE: 'ERR_STORAGE_UNAVAILABLE',
  AI_SERVICE: 'ERR_AI_SERVICE',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
