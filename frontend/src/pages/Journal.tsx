import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Grid3X3, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/stores/authStore'
import { transactionsApi } from '@/api/transactions'
import { formatVND } from '@/utils/formatters'
import { PhotoCard } from '@/components/common/PhotoCard'
import { CalendarSkeleton } from '@/components/ui/Skeleton'
import type { Transaction } from '@/types/transaction'

type ViewMode = 'calendar' | 'grid'

// ── Helpers ────────────────────────────────────────────────────

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {}
  for (const t of transactions) {
    // Prefer transaction_date, fallback to created_at.
    // API returns naive datetimes (no TZ suffix), so parse as YYYY-MM-DD directly
    // to avoid JS treating them as local time (UTC+7) and shifting to previous day.
    let dateStr: string
    if (t.transaction_date) {
      dateStr = t.transaction_date.substring(0, 10)
    } else {
      dateStr = t.created_at.substring(0, 10)
    }
    if (!groups[dateStr]) groups[dateStr] = []
    groups[dateStr].push(t)
  }
  return groups
}

// ── Calendar Day Cell ───────────────────────────────────────────

interface CalendarDayProps {
  day: number | null
  dateKey: string | null  // YYYY-MM-DD
  isToday: boolean
  transactions: Transaction[]
  onClick: (dateKey: string, txns: Transaction[]) => void
}

function CalendarDay({ day, dateKey, isToday, transactions, onClick }: CalendarDayProps) {
  if (day === null) return <div className="aspect-square" />

  const hasPhotos = transactions.length > 0
  const photoCount = transactions.length
  const coverPhoto = transactions[0]?.thumbnail_url ?? transactions[0]?.image_url ?? null

  return (
    <button
      onClick={() => dateKey && onClick(dateKey, transactions)}
      disabled={!dateKey}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-xl transition-all',
        'hover:ring-2 hover:ring-memoir-300',
        'focus:outline-none focus:ring-2 focus:ring-memoir-500',
        'disabled:cursor-default disabled:hover:ring-0',
        isToday ? 'bg-memoir-50 ring-1 ring-memoir-200' : 'bg-white',
        hasPhotos ? 'shadow-sm' : '',
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
      {hasPhotos && coverPhoto && (
        
        <img
          src={coverPhoto}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
      )}

      {/* Bottom gradient + amount */}
      {hasPhotos && !coverPhoto && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent h-1/2" />
      )}

      {/* "+N" badge */}
      {photoCount > 1 && (
        <span className="absolute right-0.5 top-0.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-memoir-500 px-1 text-[10px] font-bold text-white shadow-sm">
          +{photoCount}
        </span>
      )}
    </button>
  )
}

// ── Day Popup ──────────────────────────────────────────────────

interface DayPopupProps {
  dateKey: string
  transactions: Transaction[]
  onClose: () => void
}

function DayPopup({ dateKey, transactions, onClose }: DayPopupProps) {
  const navigate = useNavigate()
  const dateLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const handleSelect = (t: Transaction) => {
    onClose()
    navigate(`/transactions/${t.id}`)
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
            <p className="text-xs text-gray-400 mt-0.5">{transactions.length} kỷ niệm</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* 3-column photo grid */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="grid grid-cols-3 gap-1.5">
            {transactions.map((t) => {
              const imageUrl = t.thumbnail_url ?? t.image_url
              const isLifeLog = t.is_life_log || t.amount === 0

              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
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

                  {/* Amount overlay — bottom-left */}
                  {!isLifeLog && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1.5">
                      <span className="text-[10px] font-bold text-white leading-tight">
                        {formatVND(t.amount)}
                      </span>
                    </div>
                  )}

                  {/* Life log indicator */}
                  {isLifeLog && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/30 to-transparent px-1.5 py-1">
                      <span className="text-[9px] font-medium text-white/80">Life Log</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Journal Page ───────────────────────────────────────────────

export default function Journal() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [popup, setPopup] = useState<{ dateKey: string; txns: Transaction[] } | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const { start: startDate, end: endDate } = getMonthRange(year, month)

  const accessToken = useAuthStore((s) => s.accessToken)

  // Fetch transactions for the current month
  const { data, isLoading } = useQuery({
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
    enabled: !!accessToken,
  })

  const transactions: Transaction[] = data?.items ?? []
  const byDate = useMemo(() => groupByDate(transactions), [transactions])

  // Calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const calendarCells: { day: number | null; dateKey: string | null }[] = [
    ...Array(startPadding).fill(null).map(() => ({ day: null, dateKey: null })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return { day: d, dateKey }
    }),
  ]

  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDay = today.getDate()

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const handleDayClick = (dateKey: string, txns: Transaction[]) => {
    if (txns.length === 1) {
      // Single photo — could open detail, for now just show popup
      setPopup({ dateKey, txns })
    } else {
      setPopup({ dateKey, txns })
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

      {isLoading ? (
        <div className="px-4 pb-4"><CalendarSkeleton /></div>
      ) : viewMode === 'calendar' ? (
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
            <h2 className="text-base font-semibold text-gray-800 capitalize">{monthName}</h2>
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
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map(({ day, dateKey }, idx) => (
              <CalendarDay
                key={idx}
                day={day}
                dateKey={dateKey}
                isToday={isCurrentMonth && day === todayDay}
                transactions={dateKey ? (byDate[dateKey] ?? []) : []}
                onClick={handleDayClick}
              />
            ))}
          </div>

          {/* Month summary */}
          {transactions.length > 0 && (
            <div className="mt-4 rounded-xl bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-xs text-gray-400">
                {transactions.length} kỷ niệm trong tháng
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── Grid View ──────────────────────────────── */
        <div className="flex-1 px-4 pb-4">
          {transactions.length === 0 ? (
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

      {/* Day Popup */}
      {popup && (
        <DayPopup
          dateKey={popup.dateKey}
          transactions={popup.txns}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
