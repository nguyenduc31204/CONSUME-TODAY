import { BarChart3 } from 'lucide-react'

/**
 * Reports — "Nhìn lại" Screen
 *
 * MVP placeholder: Shows "under development" state.
 * Phase 5: Pie charts (spending by category) + Bar charts (weekly/monthly).
 */
export default function Reports() {
  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Nhìn lại</h1>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-memoir-50">
          <BarChart3 className="h-12 w-12 text-memoir-300" />
        </div>

        <h2 className="mb-2 text-lg font-semibold text-gray-900">Đang phát triển</h2>
        <p className="mb-8 max-w-xs text-sm text-gray-500">
          Biểu đồ chi tiêu theo tuần, tháng và danh mục sẽ có ở đây. Hãy chụp thật nhiều ảnh để có dữ liệu nhé!
        </p>

        {/* Mock chart placeholders */}
        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <p className="mb-3 text-sm font-medium text-gray-700">Chi tiêu tháng này</p>
            <div className="space-y-2">
              {[
                { label: 'Ăn uống', pct: 65, color: '#F97316' },
                { label: 'Mua sắm', pct: 20, color: '#EC4899' },
                { label: 'Di chuyển', pct: 10, color: '#3B82F6' },
                { label: 'Khác', pct: 5, color: '#9333EA' },
              ].map(({ label, pct, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-500">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="w-10 text-xs text-gray-400 text-right">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
