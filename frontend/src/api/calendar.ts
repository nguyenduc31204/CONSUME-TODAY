/**
 * Calendar API — /calendar/month + /calendar/day endpoints.
 */

import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarDayData {
  date: string // "YYYY-MM-DD"
  count: number
  thumbnails: string[]
}

export interface CalendarMonthData {
  year: number
  month: number
  days: CalendarDayData[]
}

export interface TransactionInDay {
  id: string
  image_url?: string
  thumbnail_url?: string
  amount: number
  merchant_name?: string
  category_name?: string
  category_icon?: string
  category_color?: string
  is_life_log: boolean
  transaction_date?: string
}

export interface CalendarDayDataDetail {
  date: string
  total_expense: number
  total_income: number
  transaction_count: number
  transactions: TransactionInDay[]
}

// ── API ─────────────────────────────────────────────────────────────────────────

export const calendarApi = {
  /**
   * GET /api/v1/calendar/month?year=&month=
   */
  async getMonth(
    year: number,
    month: number,
  ): Promise<ApiResponse<CalendarMonthData>> {
    return apiClient.get<CalendarMonthData>('/calendar/month', { year, month })
  },

  /**
   * GET /api/v1/calendar/day?date=YYYY-MM-DD
   */
  async getDay(date: string): Promise<ApiResponse<CalendarDayDataDetail>> {
    return apiClient.get<CalendarDayDataDetail>('/calendar/day', { date })
  },
}
