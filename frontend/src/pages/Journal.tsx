import { useState } from 'react'
import { Calendar, Grid3X3, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

type ViewMode = 'calendar' | 'grid'

/**
 * Journal — "Nhật ký" Screen
 *
 * Two views:
 * - Calendar: month grid with 1 photo/day cell, "+N" badge
 * - Grid: Instagram-style photo gallery with amount overlay
 * Toggle between views via button at top.
 */
export default function Journal() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Generate calendar days for current month
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay() // 0=Sun
  const daysInMonth = lastDay.getDate()

  const monthName = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  // Generate day cells (padding + actual days)
  const calendarCells: (number | null)[] = [
    ...Array(startPadding).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

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
            {calendarCells.map((day, idx) => {
              if (!day) {
                return <div key={`pad-${idx}`} className="aspect-square" />
              }

              const isToday =
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear()

              // TODO Phase 4: Replace with real photos
              const hasPhotos = false
              const photoCount = 0

              return (
                <button
                  key={day}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-xl transition-all',
                    'hover:ring-2 hover:ring-memoir-300',
                    'focus:outline-none focus:ring-2 focus:ring-memoir-500',
                    isToday ? 'bg-memoir-50 ring-1 ring-memoir-200' : 'bg-white',
                  )}
                >
                  <span
                    className={cn(
                      'absolute inset-0 flex items-center justify-center text-sm',
                      isToday ? 'font-bold text-memoir-600' : 'text-gray-700',
                    )}
                  >
                    {day}
                  </span>

                  {/* Placeholder photo thumbnail — Phase 4 */}
                  {hasPhotos && (
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent">
                      <div className="h-full bg-gray-200 opacity-50" />
                    </div>
                  )}

                  {/* "+N" badge */}
                  {photoCount > 1 && (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-memoir-500 px-1 text-[10px] font-bold text-white">
                      +{photoCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Placeholder message */}
          <div className="mt-8 text-center text-gray-400">
            <p className="text-sm">Chưa có ảnh nào trong tháng này</p>
            <p className="mt-1 text-xs">Chụp ảnh để lưu kỷ niệm!</p>
          </div>
        </div>
      ) : (
        /* ── Grid View ──────────────────────────────── */
        <div className="flex-1 px-4 pb-4">
          {/* Placeholder grid — Phase 4: real photos */}
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'aspect-square rounded-lg bg-gray-100',
                  'flex items-center justify-center',
                  'text-gray-300 text-2xl',
                )}
              >
                📷
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-gray-400">
            <p className="text-sm">Ảnh của bạn sẽ hiển thị ở đây</p>
            <p className="mt-1 text-xs">Chế độ lưới xếp ảnh theo thời gian</p>
          </div>
        </div>
      )}
    </div>
  )
}
