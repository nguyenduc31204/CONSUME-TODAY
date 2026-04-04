import { useRef, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Camera, Image, Home, Calendar, BarChart3, User } from 'lucide-react'
import { cn } from '@/utils/cn'

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
 * - Camera FAB: centered, large; long-press or tap shows option menu
 *   - "Chụp ảnh" → opens device camera
 *   - "Chọn ảnh từ thư viện" → opens photo library
 */
export function BottomNav() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // File input: opens device CAMERA (capture="environment")
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  // File input: opens PHOTO LIBRARY (no capture attribute)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  // Listen for memoir:focus-camera events (e.g. from empty state CTA)
  useEffect(() => {
    const handler = () => {
      setMenuOpen(true)
    }
    window.addEventListener('memoir:focus-camera', handler)
    return () => window.removeEventListener('memoir:focus-camera', handler)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    window.dispatchEvent(new CustomEvent('memoir:upload', { detail: { file } }))
    e.target.value = ''
    setMenuOpen(false)
  }

  const handleCameraClick = () => {
    if (menuOpen) {
      setMenuOpen(false)
      cameraInputRef.current?.click()
    } else {
      setMenuOpen(true)
    }
  }

  const handleMenuCamera = () => {
    setMenuOpen(false)
    cameraInputRef.current?.click()
  }

  const handleMenuGallery = () => {
    setMenuOpen(false)
    galleryInputRef.current?.click()
  }

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-camera-menu]')) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpen])

  // Listen for retry events from CardPopup error state
  useEffect(() => {
    const openCamera = () => {
      setMenuOpen(false)
      cameraInputRef.current?.click()
    }
    const openGallery = () => {
      setMenuOpen(false)
      galleryInputRef.current?.click()
    }
    window.addEventListener('memoir:retry-camera', openCamera)
    window.addEventListener('memoir:retry-gallery', openGallery)
    return () => {
      window.removeEventListener('memoir:retry-camera', openCamera)
      window.removeEventListener('memoir:retry-gallery', openGallery)
    }
  }, [])

  return (
    <>
      {/* Hidden file input — CAMERA only */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />

      {/* Hidden file input — GALLERY only */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
        role="navigation"
        aria-label="Điều hướng chính"
      >
        {/* Safe area bottom padding (iOS) */}
        <div className="pb-safe flex items-center justify-around px-2 pt-2 relative">

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

          {/* Spacer — Camera FAB + menu sits here in the center */}
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

          {/* Camera FAB — shows menu on tap */}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2" data-camera-menu>
            {/* Options menu — appears above FAB */}
            {menuOpen && (
              <div className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* Chụp ảnh */}
                <button
                  onClick={handleMenuCamera}
                  className="flex items-center gap-3 whitespace-nowrap rounded-xl bg-white px-4 py-3 shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-memoir-100">
                    <Camera className="h-4 w-4 text-memoir-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Chụp ảnh</p>
                    <p className="text-xs text-gray-400">Mở camera</p>
                  </div>
                </button>

                {/* Chọn từ thư viện */}
                <button
                  onClick={handleMenuGallery}
                  className="flex items-center gap-3 whitespace-nowrap rounded-xl bg-white px-4 py-3 shadow-lg border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-memoir-100">
                    <Image className="h-4 w-4 text-memoir-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Chọn ảnh</p>
                    <p className="text-xs text-gray-400">Từ thư viện</p>
                  </div>
                </button>

                {/* Arrow pointing down to FAB */}
                <div className="self-center w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
              </div>
            )}

            {/* Camera FAB */}
            <button
              onClick={handleCameraClick}
              className={cn(
                'flex h-14 w-14 items-center justify-center',
                'rounded-full',
                'bg-gradient-to-br from-memoir-400 to-memoir-600',
                'shadow-[0_4px_20px_rgba(147,51,234,0.45)]',
                'ring-4 ring-white',
                'transition-all duration-200',
                menuOpen
                  ? 'ring-2 ring-memoir-400 bg-memoir-500'
                  : 'hover:scale-105 hover:shadow-[0_6px_28px_rgba(147,51,234,0.55)]',
                'active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-memoir-400 focus:ring-offset-2',
              )}
              aria-label="Chụp ảnh"
              title="Chụp ảnh"
            >
              <Camera
                className={cn(
                  'h-7 w-7 text-white drop-shadow transition-transform',
                  menuOpen && 'rotate-45',
                )}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}