import { Settings, CreditCard, Tag, LogOut, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

const MENU_ITEMS = [
  { label: 'Quản lý ví', icon: CreditCard, description: 'Tạo và chỉnh sửa ví tiền' },
  { label: 'Danh mục', icon: Tag, description: 'Quản lý danh mục chi tiêu' },
  { label: 'Cài đặt', icon: Settings, description: 'Ngôn ngữ, tiền tệ, thông báo' },
] as const

/**
 * Profile — "Cá nhân" Screen
 *
 * MVP placeholder: User info + navigation to wallet/category/settings.
 * Phase 5: Full profile, settings, wallet management.
 */
export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Cá nhân</h1>

      {/* User profile card */}
      <Card className="mb-6 flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-memoir-100">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-memoir-600">
              {user?.name?.[0]?.toUpperCase() || '👤'}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">
            {user?.name || 'Khách'}
          </h2>
          <p className="text-sm text-gray-500 truncate">{user?.email || 'Chưa đăng nhập'}</p>
        </div>
        <span className="rounded-full bg-memoir-50 px-3 py-1 text-xs font-medium text-memoir-600">
          Free
        </span>
      </Card>

      {/* Menu items */}
      <div className="space-y-2">
        {MENU_ITEMS.map(({ label, icon: Icon, description }) => (
          <button
            key={label}
            className={cn(
              'w-full flex items-center gap-4 rounded-2xl bg-white px-5 py-4',
              'shadow-sm border border-gray-100',
              'text-left transition-all hover:shadow-md hover:border-gray-200',
              'focus:outline-none focus:ring-2 focus:ring-memoir-500',
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-memoir-50">
              <Icon className="h-5 w-5 text-memoir-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-8">
        <Button
          variant="ghost"
          className="w-full text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>

      {/* App info */}
      <div className="mt-8 text-center text-xs text-gray-400">
        <p>MemoirFinance v1.0.0</p>
        <p className="mt-0.5">Lưu giữ khoảnh khắc bằng hình ảnh</p>
      </div>
    </div>
  )
}
