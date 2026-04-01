import { useQuery } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { transactionsApi } from '@/api/transactions'
import { todayISO } from '@/utils/formatters'
import { PhotoCard } from '@/components/common/PhotoCard'
import { Spinner } from '@/components/ui/Spinner'
import type { Transaction } from '@/types/transaction'

// ── Helpers ────────────────────────────────────────────────────

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

// ── Home Page ─────────────────────────────────────────────────

export default function Home() {
  const user = useAuthStore((s) => s.user)
  const firstName = user?.name?.split(' ')[0] ?? ''

  // Fetch today's transactions
  const today = todayISO()
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
  })

  const transactions: Transaction[] = data?.items ?? []

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {user ? `${greeting()}, ${firstName} 👋` : 'Hôm nay'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-gray-500">Không thể tải dữ liệu</p>
          <button
            onClick={() => refetch()}
            className="text-sm font-medium text-memoir-500 hover:underline"
          >
            Thử lại
          </button>
        </div>
      ) : transactions.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-memoir-50">
            <Camera className="h-12 w-12 text-memoir-300" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            Chưa có kỷ niệm nào hôm nay
          </h2>
          <p className="mb-8 max-w-xs text-sm text-gray-500">
            Bấm nút 📸 để chụp ảnh đầu tiên. AI sẽ tự động ghi nhận chi tiêu cho bạn!
          </p>
        </div>
      ) : (
        /* Photo feed */
        <div className="space-y-4">
          {transactions.map((t) => (
            <PhotoCard key={t.id} transaction={t} />
          ))}
        </div>
      )}

      {/* Pull-to-refresh hint */}
      {transactions.length > 0 && (
        <p className="mt-6 text-center text-xs text-gray-300">
          {transactions.length} kỷ niệm hôm nay
        </p>
      )}
    </div>
  )
}
