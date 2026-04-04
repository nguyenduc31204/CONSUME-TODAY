import { useNavigate } from 'react-router-dom'
import {
  Settings, CreditCard, Tag, LogOut, ChevronRight,
  Receipt, Image, Pencil, Users,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { useUserStats } from '@/hooks/useUserStats'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

const MENU_ITEMS = [
  {
    label: 'Chỉnh sửa hồ sơ',
    description: 'Tên, ảnh đại diện',
    icon: Pencil,
    path: '/profile/edit',
    badge: null,
  },
  {
    label: 'Quản lý ví',
    description: 'Tạo và chỉnh sửa ví tiền',
    icon: CreditCard,
    path: '/profile/wallets',
    badge: null,
  },
  {
    label: 'Danh mục',
    description: 'Quản lý danh mục chi tiêu',
    icon: Tag,
    path: '/profile/categories',
    badge: null,
  },
  {
    label: 'Cài đặt',
    description: 'Ngôn ngữ, tiền tệ, thông báo',
    icon: Settings,
    path: '/profile/settings',
    badge: null,
  },
] as const

function MenuButton({
  label,
  description,
  icon: Icon,
  path,
}: {
  label: string
  description: string
  icon: React.ElementType
  path: string
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(path)}
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
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType
  value: string
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white px-4 py-4 shadow-sm border border-gray-100">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-memoir-50">
        <Icon className="h-4 w-4 text-memoir-500" />
      </div>
      <p className="text-base font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 text-center leading-tight">{label}</p>
    </div>
  )
}

/**
 * Profile — "Cá nhân" Screen
 * Phase 5: Full profile with stats, wallet/category management, settings.
 */
export default function Profile() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const { data: stats, isLoading: statsLoading } = useUserStats()

  const joinedMonth = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Cá nhân</h1>

      {/* User profile card */}
      <Card className="mb-6 flex items-center gap-4 p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-memoir-100 overflow-hidden flex-shrink-0">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl font-bold text-memoir-600">
              {user?.name?.[0]?.toUpperCase() || '👤'}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate text-lg">
            {user?.name || 'Khách'}
          </h2>
          <p className="text-sm text-gray-500 truncate">{user?.email || 'Chưa đăng nhập'}</p>
          {joinedMonth && (
            <p className="mt-0.5 text-xs text-gray-400">Tham gia: {joinedMonth}</p>
          )}
        </div>
        <button
          onClick={() => navigate('/profile/settings')}
          className="flex-shrink-0 rounded-full p-2 hover:bg-gray-100 transition-colors"
          aria-label="Cài đặt"
        >
          <Settings className="h-4 w-4 text-gray-400" />
        </button>
      </Card>

      {/* ── Stats Section ──────────────────────────────── */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Số liệu thống kê</h3>
        <div className="grid grid-cols-2 gap-2">
          {statsLoading ? (
            <>
              <div className="col-span-2 flex justify-center py-4"><Spinner size="sm" /></div>
            </>
          ) : stats ? (
            <>
              <StatCard
                icon={Receipt}
                value={String(stats.total_transactions)}
                label="Giao dịch"
              />
              <StatCard
                icon={Image}
                value={String(stats.total_images)}
                label="Ảnh đã lưu"
              />
            </>
          ) : (
            <>
              <StatCard icon={Receipt} value="—" label="Giao dịch" />
              <StatCard icon={Image} value="—" label="Ảnh đã lưu" />
            </>
          )}
        </div>
      </div>

      {/* ── Circles shortcut ─────────────────────────── */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Nhóm kỷ niệm</h3>
        <button
          onClick={() => navigate('/circles')}
          className={cn(
            'w-full flex items-center gap-4 rounded-2xl bg-white px-5 py-4',
            'shadow-sm border border-gray-100',
            'text-left transition-all hover:shadow-md hover:border-memoir-200',
            'focus:outline-none focus:ring-2 focus:ring-memoir-500',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-memoir-50">
            <Users className="h-5 w-5 text-memoir-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Nhóm kỷ niệm</p>
            <p className="text-xs text-gray-500">Chia sẻ khoảnh khắc với gia đình & bạn bè</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300" />
        </button>
      </div>

      {/* ── Menu Items ─────────────────────────────────── */}
      <div className="mb-4 space-y-2">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Quản lý</h3>
        {MENU_ITEMS.map(({ label, description, icon, path }) => (
          <MenuButton
            key={label}
            label={label}
            description={description}
            icon={icon}
            path={path}
          />
        ))}
      </div>

      {/* ── Divider ────────────────────────────────────── */}
      <div className="my-6 border-t border-gray-100" />

      {/* Logout */}
      <Button
        variant="ghost"
        className="w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        onClick={logout}
      >
        <LogOut className="h-4 w-4" />
        Đăng xuất
      </Button>

      {/* App info */}
      <div className="mt-8 text-center text-xs text-gray-400">
        <p>MemoirFinance v1.0.0</p>
        <p className="mt-0.5">Lưu giữ khoảnh khắc bằng hình ảnh</p>
      </div>
    </div>
  )
}
