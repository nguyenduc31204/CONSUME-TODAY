/**
 * useCalendar — React Query hooks for calendar endpoints.
 * Supports offline-first with useOfflineQuery.
 */

import { useQuery } from '@tanstack/react-query'
import { calendarApi } from '@/api/calendar'

/** Hook: Calendar month view (dot indicators) */
export function useCalendarMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['calendar', 'month', year, month],
    queryFn: async () => {
      const res = await calendarApi.getMonth(year, month)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

/** Hook: Calendar day detail (transactions in a day) */
export function useCalendarDay(date: string) {
  return useQuery({
    queryKey: ['calendar', 'day', date],
    queryFn: async () => {
      const res = await calendarApi.getDay(date)
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
