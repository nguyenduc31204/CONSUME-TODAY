import { Link, useLocation } from 'react-router-dom'
import { Camera, Home, Calendar, BarChart3, User } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useUiStore } from '@/stores/uiStore'

const NAV_ITEMS = [
  { path: '/home', label: 'Hôm nay', icon: Home },
  { path: '/journal', label: 'Nhật ký', icon: Calendar },
  { path: '/reports', label: 'Nhìn lại', icon: BarChart3 },
  { path: '/profile', label: 'Cá nhân', icon: User },
] as const

/**
 * Bottom Navigation Bar
 *
 * Spec:
 * - 4 tabs: Hôm Nay | Nhật ký | Nhìn lại | Cá nhân
 * - Camera FAB: centered, large, always visible, memoir purple
 * - Active tab highlighted with memoir-500 color
 * - Camera FAB opens device camera or photo library
 */
export function BottomNav() {
  const location = useLocation()
  const addToast = useUiStore((s) => s.addToast)

  const handleCameraClick = () => {
    // Create hidden file input to trigger camera or photo library
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    // Prefer rear camera on mobile
    input.setAttribute('capture', 'environment')
    input.style.display = 'none'

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // Phase 3: integrate with upload flow
        console.log('📸 Photo selected:', file.name, file.size, 'bytes')
        addToast(`Đã chọn ảnh: ${file.name}`, 'info')
      }
    }

    input.onerror = () => {
      addToast('Không thể mở camera', 'error')
    }

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      role="navigation"
      aria-label="Điều hướng chính"
    >
      {/* Safe area bottom padding (iOS) */}
      <div className="pb-safe flex items-center justify-around px-2 pt-2">

        {/* Left 2 tabs */}
        {NAV_ITEMS.slice(0, 2).map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-2 transition-all duration-200',
                isActive ? 'text-memoir-500' : 'text-warm-gray hover:text-gray-600',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn('h-6 w-6 transition-transform', isActive && 'scale-110')} />
              <span className="text-[11px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}

        {/* Spacer — Camera FAB sits here in the center */}
        <div className="w-14 flex-shrink-0" aria-hidden="true" />

        {/* Right 2 tabs */}
        {NAV_ITEMS.slice(2, 4).map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-2 transition-all duration-200',
                isActive ? 'text-memoir-500' : 'text-warm-gray hover:text-gray-600',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn('h-6 w-6 transition-transform', isActive && 'scale-110')} />
              <span className="text-[11px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}

        {/* Camera FAB — Always visible, centered, above nav */}
        <button
          onClick={handleCameraClick}
          className={cn(
            'absolute left-1/2 top-0 z-10',
            'flex h-14 w-14 -translate-x-1/2 -translate-y-7',
            'items-center justify-center',
            'rounded-full',
            'bg-gradient-to-br from-memoir-400 to-memoir-600',
            'shadow-[0_4px_20px_rgba(147,51,234,0.45)]',
            'ring-4 ring-white',
            'transition-all duration-200',
            'hover:scale-105 hover:shadow-[0_6px_28px_rgba(147,51,234,0.55)]',
            'active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-memoir-400 focus:ring-offset-2',
          )}
          aria-label="Chụp ảnh"
          title="Chụp ảnh"
        >
          <Camera className="h-7 w-7 text-white drop-shadow" strokeWidth={2} />
        </button>
      </div>
    </nav>
  )
}
