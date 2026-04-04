import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Grid3X3, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/stores/authStore'
import { transactionsApi } from '@/api/transactions'
import { formatVND } from '@/utils/formatters'
import { PhotoCard } from '@/components/common/PhotoCard'
import { getProxyImageUrl } from '@/utils/imageUrl'
import { useCalendarMonth, useCalendarDay } from '@/hooks/useCalendar'
import type { Transaction } from '@/types/transaction'
import type { CalendarDayData } from '@/api/calendar'

type ViewMode = 'calendar' | 'grid'

// ── Helpers ───────────────────────────────────────────────────

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

// ── Calendar Day Cell ───────────────────────────────────────────

interface CalendarDayProps {
  day: number | null
  dateKey: string | null
  isToday: boolean
  dayData?: CalendarDayData
  onClick: (dateKey: string) => void
}

function CalendarDay({ day, dateKey, isToday, dayData, onClick }: CalendarDayProps) {
  if (day === null) return <div className="aspect-square" />

  const count = dayData?.count ?? 0
  const thumbnail = dayData?.thumbnails?.[0]

  return (
    <button
      onClick={() => dateKey && onClick(dateKey)}
      disabled={!dateKey || count === 0}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-xl transition-all',
        'hover:ring-2 hover:ring-memoir-300',
        'focus:outline-none focus:ring-2 focus:ring-memoir-500',
        'disabled:cursor-default disabled:hover:ring-0',
        isToday ? 'bg-memoir-50 ring-1 ring-memoir-200' : count > 0 ? 'bg-gray-50' : 'bg-white',
        count > 0 ? 'shadow-sm' : '',
      )}
    >
      <span
        className={cn(
          'absolute inset-0 z-10 flex items-center justify-center text-sm',
          isToday ? 'font-bold text-memoir-600' : 'text-gray-700',
        )}
      >
        {day}
      </span>

      {/* Photo thumbnail */}
      {count > 0 && thumbnail && (
        <img
          src={getProxyImageUrl(thumbnail)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
      )}

      {/* "+N" badge */}
      {count > 1 && (
        <span className="absolute right-0.5 top-0.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-memoir-500 px-1 text-[10px] font-bold text-white shadow-sm">
          +{count}
        </span>
      )}
    </button>
  )
}

// ── Day Detail Sheet ───────────────────────────────────────────

interface DaySheetProps {
  dateKey: string
  onClose: () => void
}

function DaySheet({ dateKey, onClose }: DaySheetProps) {
  const navigate = useNavigate()
  const { data, isLoading } = useCalendarDay(dateKey)

  const dateLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const handleSelect = (id: string) => {
    onClose()
    navigate(`/transactions/${id}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 capitalize">{dateLabel}</h2>
            {data && (
              <p className="text-xs text-gray-400 mt-0.5">
                {data.total_expense > 0 && <span className="text-red-500">-{formatVND(data.total_expense)}</span>}
                {data.total_income > 0 && <span className="ml-2 text-emerald-500">+{formatVND(data.total_income)}</span>}
                {data.total_expense === 0 && data.total_income === 0 && (
                  <span className="text-memoir-500">{data.transaction_count} kỷ niệm</span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : !data || data.transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="text-4xl">📷</div>
              <p className="text-sm text-gray-500">Không có kỷ niệm nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {data.transactions.map((t) => {
                const imageUrl = getProxyImageUrl(t.thumbnail_url ?? t.image_url)
                const isLifeLog = t.is_life_log || t.amount === 0

                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t.id)}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-memoir-400 transition-transform active:scale-95"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={t.merchant_name ?? 'Kỷ niệm'}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-memoir-50">
                        <span className="text-2xl">{isLifeLog ? '📷' : '💳'}</span>
                      </div>
                    )}

                    {/* Amount overlay */}
                    {!isLifeLog && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1.5">
                        <span className="text-[10px] font-bold text-white leading-tight">
                          {formatVND(t.amount)}
                        </span>
                      </div>
                    )}

                    {/* Life log */}
                    {isLifeLog && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/30 to-transparent px-1.5 py-1">
                        <span className="text-[9px] font-medium text-white/80">Life Log</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Journal Page ───────────────────────────────────────────────

export default function Journal() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const { start: startDate, end: endDate } = getMonthRange(year, month)

  const accessToken = useAuthStore((s) => s.accessToken)

  // ── Calendar month view (dot indicators via /calendar/month API)
  const {
    data: monthData,
    isLoading: isMonthLoading,
  } = useCalendarMonth(year, month + 1) // JS month is 0-indexed, API expects 1-indexed

  // ── Grid view (all transactions for month)
  const { data: listData, isLoading: isListLoading } = useQuery({
    queryKey: ['transactions', 'month', year, month],
    queryFn: async () => {
      const res = await transactionsApi.list({
        start_date: startDate,
        end_date: endDate,
        limit: 100,
      })
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    enabled: !!accessToken && viewMode === 'grid',
  })

  const transactions: Transaction[] = listData?.items ?? []

  // Build dayData map from calendar/month response
  const dayDataMap = useMemo<Record<string, CalendarDayData>>(() => {
    if (!monthData?.days) return {}
    const map: Record<string, CalendarDayData> = {}
    for (const d of monthData.days) {
      map[d.date] = d
    }
    return map
  }, [monthData])

  // Calendar grid cells
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const calendarCells = useMemo(() => {
    const cells: { day: number | null; dateKey: string | null }[] = []
    // Padding for first week (Sunday = 0)
    for (let i = 0; i < startPadding; i++) {
      cells.push({ day: null, dateKey: null })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ day: d, dateKey })
    }
    return cells
  }, [year, month, startPadding, daysInMonth])

  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDay = today.getDate()

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))
  const goToday = () => setCurrentMonth(new Date())

  const handleDayClick = (dateKey: string) => {
    const dayInfo = dayDataMap[dateKey]
    if (dayInfo && dayInfo.count > 0) {
      setSelectedDate(dateKey)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header + Toggle */}
      <div className="sticky top-0 z-10 bg-cream px-4 pt-4 pb-2">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Nhật ký</h1>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                viewMode === 'calendar'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lịch</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                viewMode === 'grid'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lưới</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        /* ── Calendar View ───────────────────────────── */
        <div className="flex-1 px-4 pb-4">
          {/* Month navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="rounded-full p-2 hover:bg-gray-100 transition-colors"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-800 capitalize">{monthName}</h2>
              {!isCurrentMonth && (
                <button
                  onClick={goToday}
                  className="text-xs font-medium text-memoir-500 hover:underline"
                >
                  Hôm nay
                </button>
              )}
            </div>
            <button
              onClick={nextMonth}
              className="rounded-full p-2 hover:bg-gray-100 transition-colors"
              aria-label="Tháng sau"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium text-gray-400">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {isMonthLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map(({ day, dateKey }, idx) => (
                <CalendarDay
                  key={idx}
                  day={day}
                  dateKey={dateKey}
                  isToday={isCurrentMonth && day === todayDay}
                  dayData={dateKey ? dayDataMap[dateKey] : undefined}
                  onClick={handleDayClick}
                />
              ))}
            </div>
          )}

          {/* Month summary */}
          {monthData && (
            <div className="mt-4 rounded-xl bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-xs text-gray-400">
                {monthData.days.reduce((sum, d) => sum + d.count, 0)} kỷ niệm trong tháng
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── Grid View ──────────────────────────────── */
        <div className="flex-1 px-4 pb-4">
          {isListLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="text-5xl">📷</div>
              <p className="text-sm font-medium text-gray-500">Chưa có ảnh nào</p>
              <p className="text-xs text-gray-400">Chụp ảnh để lưu kỷ niệm!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {transactions.map((t) => (
                <PhotoCard key={t.id} transaction={t} compact />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Day Detail Sheet */}
      {selectedDate && (
        <DaySheet dateKey={selectedDate} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  )
}
