import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, ChevronRight, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { transactionsApi } from '@/api/transactions'
import { todayISO } from '@/utils/formatters'
import { formatVND } from '@/utils/formatters'
import { HomeCard } from '@/components/common/HomeCard'
import { HomeCardSkeleton, StatsSkeleton } from '@/components/ui/Skeleton'
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet'
import type { Transaction, TransactionCreateData } from '@/types/transaction'

// ── Helpers ────────────────────────────────────────────────────

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function todayDateLabel(): string {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// ── Stats Row ─────────────────────────────────────────────────

interface StatsRowProps {
  transactions: Transaction[]
}

function StatsRow({ transactions }: StatsRowProps) {
  const expenses = transactions.filter((t) => !t.is_life_log && !t.is_income && t.amount > 0)
  const totalSpend = expenses.reduce((sum, t) => sum + t.amount, 0)
  const lifeLogs = transactions.filter((t) => t.is_life_log || t.amount === 0)

  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      {/* Total spend */}
      <div className="flex flex-col items-center rounded-2xl bg-white px-3 py-4 shadow-sm border border-gray-100">
        <span className="text-xl mb-1">💸</span>
        <span className="text-sm font-bold text-gray-900 leading-tight">
          {totalSpend > 0 ? formatVND(totalSpend) : '—'}
        </span>
        <span className="text-[10px] text-gray-400 mt-0.5">Chi tiêu hôm nay</span>
      </div>
      {/* Record count */}
      <div className="flex flex-col items-center rounded-2xl bg-white px-3 py-4 shadow-sm border border-gray-100">
        <span className="text-xl mb-1">📸</span>
        <span className="text-sm font-bold text-gray-900">{transactions.length}</span>
        <span className="text-[10px] text-gray-400 mt-0.5">Ky niệm</span>
      </div>
      {/* Life log count */}
      <div className="flex flex-col items-center rounded-2xl bg-white px-3 py-4 shadow-sm border border-gray-100">
        <span className="text-xl mb-1">✨</span>
        <span className="text-sm font-bold text-gray-900">{lifeLogs.length}</span>
        <span className="text-[10px] text-gray-400 mt-0.5">Life Logs</span>
      </div>
    </div>
  )
}

// ── Photo Section ──────────────────────────────────────────────

interface PhotoSectionProps {
  title: string
  dateLabel: string
  transactions: Transaction[]
  onViewAll?: () => void
  emptyText?: string
  viewAllHref?: string
}

function PhotoSection({
  title,
  dateLabel,
  transactions,
  onViewAll,
  emptyText = 'Chưa có ảnh nào',
  viewAllHref,
}: PhotoSectionProps) {
  const navigate = useNavigate()

  return (
    <section className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
        </div>
        {(onViewAll || viewAllHref) && (
          <button
            onClick={onViewAll ?? (() => viewAllHref && navigate(viewAllHref))}
            className="flex items-center gap-0.5 text-xs font-medium text-memoir-500 hover:text-memoir-600 transition-colors"
          >
            Xem tất cả
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Photo list or empty */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center rounded-2xl bg-white border border-gray-100">
          <p className="text-sm text-gray-400">{emptyText}</p>
        </div>
      ) : (
        /* Vertical list, centered, 3/4 screen width, square cards */
        <div className="flex flex-col items-center gap-4">
          {transactions.slice(0, 20).map((t) => (
            <div key={t.id} className="w-[75vw] max-w-[320px]">
              <HomeCard transaction={t} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Home Page ─────────────────────────────────────────────────

export default function Home() {
  const user = useAuthStore((s) => s.user)
  const firstName = user?.name?.split(' ')[0] ?? ''
  const today = todayISO()
  const accessToken = useAuthStore((s) => s.accessToken)
  const queryClient = useQueryClient()
  const [showAddTransaction, setShowAddTransaction] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions', 'today'],
    queryFn: async () => {
      const res = await transactionsApi.list({
        start_date: today,
        end_date: today,
        limit: 100,
      })
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    enabled: !!accessToken,
    staleTime: 10_000,
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  })

  const transactions: Transaction[] = data?.items ?? []
  console.log('Today transactions:', transactions)

  // ── Mutation for manual transaction ────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: TransactionCreateData) => transactionsApi.createManual(data),
    onSuccess: () => {
      setShowAddTransaction(false)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Top Header Bar ─────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-memoir-600 to-memoir-700 px-4 pt-6 pb-8 rounded-b-3xl shadow-md">
        {/* Row: greeting + avatar */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white/30"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">
                {firstName ? firstName[0].toUpperCase() : '?'}
              </div>
            )}
            <div>
              <p className="text-sm text-white/80">{greeting()}</p>
              <h1 className="text-xl font-bold text-white leading-tight">
                {user ? firstName : 'Hôm nay'}
              </h1>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowAddTransaction(true)}
              className="flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 px-3 py-2 text-xs font-semibold text-white transition-colors"
              aria-label="Thêm nhanh"
            >
              <Plus className="h-4 w-4" />
              Thêm nhanh
            </button>
            {/* Camera FAB — triggers upload */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('memoir:focus-camera'))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg shadow-black/20 transition-transform active:scale-95 hover:scale-105"
              aria-label="Chụp ảnh"
            >
              <Camera className="h-5 w-5 text-memoir-600" />
            </button>
          </div>
        </div>

        {/* Date label */}
        <p className="text-sm text-white/70 mt-1 ml-12">{todayDateLabel()}</p>
      </div>

      {/* ── Main content (overlaps bottom of header) ──────────── */}
      <div className="px-4 -mt-4">

        {/* Stats */}
        {!isLoading && (
          <StatsRow transactions={transactions} />
        )}

        {/* Loading */}
        {isLoading && (
          <>
            <StatsSkeleton />
            <div className="space-y-2 mt-2">
              {[1, 2, 3].map((i) => (
                <HomeCardSkeleton key={i} />
              ))}
            </div>
          </>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center gap-2 py-8 text-center mb-4">
            <p className="text-sm text-gray-500">Không thể tải dữ liệu</p>
            <button
              onClick={() => refetch()}
              className="text-sm font-medium text-memoir-500 hover:underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && transactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-memoir-50">
              <Camera className="h-10 w-10 text-memoir-300" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Bắt đầu ghi nhận chi tiêu
            </h2>
            <p className="max-w-xs text-sm text-gray-500">
              Chụp ảnh hóa đơn hoặc ly cà phê, AI sẽ tự lo phần con số.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('memoir:focus-camera'))}
              className="mt-6 flex items-center gap-2 rounded-full bg-memoir-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-memoir-500/30 hover:bg-memoir-600 transition-colors"
            >
              <Camera className="h-4 w-4" />
              Chụp ảnh ngay
            </button>
          </div>
        )}

        {/* Today's section */}
        {!isLoading && !isError && transactions.length > 0 && (
          <PhotoSection
            title="Hôm nay"
            dateLabel={todayDateLabel()}
            transactions={transactions}
            viewAllHref="/journal"
          />
        )}
      </div>

      {/* Manual transaction sheet */}
      {showAddTransaction && (
        <AddTransactionSheet
          onClose={() => setShowAddTransaction(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          defaultDate={today}
        />
      )}
    </div>
  )
}
