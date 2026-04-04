/**
 * CircleFundCard — Shows fund balance, total income, total expense.
 */

import type { CircleFundData } from '@/api/circles'

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ'
}

interface CircleFundCardProps {
  fund: CircleFundData | undefined
  isLoading: boolean
  memberCount: number
}

export function CircleFundCard({ fund, isLoading, memberCount }: CircleFundCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!fund) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center py-6">
        <p className="text-sm text-gray-400">Chưa có dữ liệu quỹ</p>
      </div>
    )
  }

  const netChange = fund.total_income - fund.total_expense
  const netLabel = netChange >= 0 ? `+${formatVND(netChange)}` : formatVND(netChange)
  const netColor = netChange >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-memoir-500 to-memoir-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <span className="text-sm font-semibold text-white">Quỹ chung</span>
        </div>
        <span className="text-xs text-white/70">
          {memberCount} thành viên
        </span>
      </div>

      {/* Balance */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs text-gray-400 mb-1">Số dư</p>
        <p className="text-2xl font-bold text-gray-900">{formatVND(fund.balance)}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        <div className="flex flex-col items-center py-3 px-2">
          <span className="text-xs text-gray-400 mb-1">Tổng thu</span>
          <span className="text-sm font-bold text-green-600">+{formatVND(fund.total_income)}</span>
        </div>
        <div className="flex flex-col items-center py-3 px-2">
          <span className="text-xs text-gray-400 mb-1">Tổng chi</span>
          <span className="text-sm font-bold text-red-500">-{formatVND(fund.total_expense)}</span>
        </div>
        <div className="flex flex-col items-center py-3 px-2">
          <span className="text-xs text-gray-400 mb-1">Thay đổi</span>
          <span className={`text-sm font-bold ${netColor}`}>{netLabel}</span>
        </div>
      </div>
    </div>
  )
}