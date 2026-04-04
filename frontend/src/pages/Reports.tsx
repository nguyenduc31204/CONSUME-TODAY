import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, RefreshCw, BarChart3, ClipboardList } from 'lucide-react'
import { reportsApi } from '@/api/reports'
import { formatVND } from '@/utils/formatters'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/utils/cn'
import { TasksContent } from '@/components/tasks/TasksContent'
import type { ReportPeriod } from '@/types/report'

// ── Sub-tab types ───────────────────────────────────────────────

type SubTab = 'reports' | 'tasks'

// ── Period Toggle ────────────────────────────────────────────────

const PERIODS: { label: string; value: ReportPeriod }[] = [
  { label: 'Tuần này', value: 'week' },
  { label: 'Tháng này', value: 'month' },
  { label: 'Tháng trước', value: 'last_month' },
]

// ── Custom Pie Label ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomPieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight="600" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ── Chart Tooltip ───────────────────────────────────────────────

function CategoryTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; amount: number; count: number; color: string } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-900">{d.name}</p>
      <p className="text-xs text-gray-500">{formatVND(d.amount)} · {d.count} giao dịch</p>
    </div>
  )
}

function DayTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const date = label ? new Date(label + 'T12:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }) : ''
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-gray-500">{date}</p>
      <p className="text-sm font-semibold text-gray-900">{formatVND(payload[0].value)}</p>
    </div>
  )
}

// ── Empty Chart Placeholders ──────────────────────────────────────

function EmptyPieChart() {
  return (
    <div className="relative flex items-center justify-center h-52">
      <PieChart width={200} height={200}>
        <Pie
          data={[{ name: 'empty', value: 1 }]}
          cx="50%" cy="50%"
          innerRadius={60}
          outerRadius={90}
          dataKey="value"
          startAngle={90} endAngle={-270}
          stroke="none"
        >
          <Cell fill="#f3f4f6" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <BarChart3 className="h-8 w-8 text-gray-300 mb-1" />
        <p className="text-xs text-gray-400">Chưa có dữ liệu</p>
      </div>
    </div>
  )
}

function EmptyBarChart() {
  return (
    <div className="flex flex-col items-center justify-center h-40">
      <BarChart3 className="h-8 w-8 text-gray-300 mb-1" />
      <p className="text-xs text-gray-400">Chưa có dữ liệu</p>
    </div>
  )
}

// ── Loading Skeleton ─────────────────────────────────────────────

function SkeletonChart() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-52 rounded-2xl bg-gray-100" />
      <div className="h-40 rounded-2xl bg-gray-100" />
    </div>
  )
}

// ── Reports Page ─────────────────────────────────────────────────

export default function Reports() {
  const [period] = useState<ReportPeriod>('week')
  const [subTab, setSubTab] = useState<SubTab>('reports')
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['reports', period],
    queryFn: async () => {
      const res = await reportsApi.getSummary({ period })
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    enabled: !!accessToken,
    staleTime: 15_000,
    // Tự động refetch mỗi 15 giây để cập nhật liên tục
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  })

  const hasData = data && data.total_count > 0

  // Build chart data
  const pieData = data?.by_category.map((c) => ({
    name: c.name,
    amount: c.amount,
    count: c.count,
    color: c.color ?? '#9333EA',
  })) ?? []

  const barData = data?.by_day.map((d) => ({
    date: d.date,
    amount: d.amount,
    count: d.count,
    label: new Date(d.date + 'T12:00:00').toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }),
  })) ?? []

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nhìn lại</h1>
        {isFetching && !isLoading && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {/* Sub-tab Navigation */}
      <div className="mb-5 flex items-center gap-1 rounded-full bg-gray-100 p-1">
        <button
          onClick={() => setSubTab('reports')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all',
            subTab === 'reports' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Báo cáo
        </button>
        <button
          onClick={() => setSubTab('tasks')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all',
            subTab === 'tasks' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Nhiệm vụ
        </button>
      </div>

      {/* Content */}
      {subTab === 'tasks' ? (
        <TasksContent />
      ) : isLoading ? (
        <SkeletonChart />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-gray-500">Không thể tải báo cáo</p>
          <button
            onClick={() => refetch()}
            className="text-sm font-medium text-memoir-500 hover:underline"
          >
            Thử lại
          </button>
        </div>
      ) : !hasData ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-memoir-50">
            <BarChart3 className="h-12 w-12 text-memoir-300" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            Chưa có chi tiêu nào
          </h2>
          <p className="max-w-xs text-sm text-gray-500">
            Hãy chụp ảnh hóa đơn để bắt đầu ghi nhận chi tiêu. AI sẽ tự động phân loại cho bạn!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Total Spending Card ─────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-br from-memoir-500 to-memoir-700 p-5 text-white shadow-lg">
            <p className="mb-1 text-sm font-medium text-white/70">Tổng chi tiêu</p>
            <p className="text-3xl font-bold">{formatVND(data.total_amount)}</p>
            <p className="mt-1 text-xs text-white/60">
              {data.total_count} giao dịch ·{' '}
              {PERIODS.find((p) => p.value === period)?.label.toLowerCase()}
            </p>

            {/* Comparison vs previous period */}
            {data.vs_previous_period.amount_change_pct !== null && (
              <div className="mt-3 flex items-center gap-1.5">
                {data.vs_previous_period.amount_change_pct < 0 ? (
                  <TrendingDown className="h-4 w-4 text-green-300" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-300" />
                )}
                <span className={`text-xs font-medium ${
                  data.vs_previous_period.amount_change_pct < 0 ? 'text-green-300' : 'text-red-300'
                }`}>
                  {data.vs_previous_period.amount_change_pct > 0 ? '▲' : '▼'}{' '}
                  {Math.abs(data.vs_previous_period.amount_change_pct)}%
                  <span className="ml-1 text-white/50">so với kỳ trước</span>
                </span>
              </div>
            )}
          </div>

          {/* ── Pie Chart: by Category ─────────────────── */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">Chi tiêu theo danh mục</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      dataKey="amount"
                      nameKey="name"
                      startAngle={90} endAngle={-270}
                      labelLine={false}
                      label={CustomPieLabel}
                      strokeWidth={2}
                      stroke="white"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CategoryTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Category Legend */}
                <div className="mt-4 space-y-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <div
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="flex-1 text-xs text-gray-600">{entry.name}</span>
                      <span className="text-xs font-medium text-gray-900">{formatVND(entry.amount)}</span>
                      <span className="w-10 text-right text-xs text-gray-400">
                        {(entry.amount / data.total_amount * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyPieChart />
            )}
          </div>

          {/* ── Bar Chart: by Day ──────────────────────── */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">Chi tiêu theo ngày</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}Tr`
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
                      return `${v}`
                    }}
                  />
                  <Tooltip content={<DayTooltip />} cursor={{ fill: '#f9fafb' }} />
                  <Bar
                    dataKey="amount"
                    fill="#9333EA"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyBarChart />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
