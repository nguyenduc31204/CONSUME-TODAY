import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { ToastContainer } from '@/components/ui/Toast'
import { CardPopup } from '@/components/common/CardPopup'
import { useUpload } from '@/hooks/useUpload'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { compressImage } from '@/utils/imageCompression'

interface AppShellProps {
  children: ReactNode
}

/**
 * AppShell — Wraps every page with:
 * - Bottom navigation (always visible, including Camera FAB)
 * - Toast container (global notification layer)
 * - Card popup overlay (upload result + auto-save countdown)
 * - Safe area padding for mobile
 */
export function AppShell({ children }: AppShellProps) {
  const { triggerUpload, confirmUpload, startEditing, state } = useUpload()

  // Listen for camera events from BottomNav
  useEffect(() => {
    const handler = async (e: Event) => {
      if (!useAuthStore.getState().accessToken) {
        useUiStore.getState().addToast('Vui lòng đăng nhập để chụp ảnh', 'warning')
        return
      }
      const customEvent = e as CustomEvent<{ file: File }>

      // Compress image before upload to avoid timeout on large mobile photos
      try {
        const compressed = await compressImage(customEvent.detail.file)
        triggerUpload(compressed)
      } catch {
        // Fallback: upload original if compression fails
        triggerUpload(customEvent.detail.file)
      }
    }
    window.addEventListener('memoir:upload', handler)
    return () => window.removeEventListener('memoir:upload', handler)
  }, [triggerUpload])

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* Page content with bottom padding to avoid nav overlap */}
      <main className="flex-1 overflow-y-auto pb-24">{children}</main>

      {/* Bottom Navigation — always visible */}
      <BottomNav />

      {/* Global Toast notifications */}
      <ToastContainer />

      {/* Card Popup Overlay — renders when there's an upload in progress */}
      {state.phase !== 'idle' && (
        <CardPopup
          onConfirm={confirmUpload}
          onEdit={startEditing}
        />
      )}
    </div>
  )
}
