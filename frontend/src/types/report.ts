export interface CategorySummary {
  id: string | null
  name: string
  icon: string | null
  color: string | null
  amount: number
  count: number
  pct: number
}

export interface DaySummary {
  date: string // YYYY-MM-DD
  amount: number
  count: number
}

export interface PeriodComparison {
  amount_change_pct: number | null
  count_change_pct: number | null
}

export interface ReportSummary {
  total_amount: number
  total_count: number
  vs_previous_period: PeriodComparison
  by_category: CategorySummary[]
  by_day: DaySummary[]
}

export type ReportPeriod = 'week' | 'month' | 'last_month' | 'custom'
