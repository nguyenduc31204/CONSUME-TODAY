import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type { ReportSummary, ReportPeriod } from '@/types/report'

export interface ReportParams {
  period?: ReportPeriod
  start_date?: string
  end_date?: string
  wallet_id?: string
}

export const reportsApi = {
  /**
   * Get spending summary report.
   * period: "week" | "month" | "last_month" | "custom"
   * For "custom" period, provide start_date and end_date (YYYY-MM-DD).
   */
  async getSummary(params?: ReportParams): Promise<ApiResponse<ReportSummary>> {
    return apiClient.get('/reports/summary', params as Record<string, string>)
  },
}
