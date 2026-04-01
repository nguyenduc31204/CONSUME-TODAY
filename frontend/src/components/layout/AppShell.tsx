import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { ToastContainer } from '@/components/ui/Toast'
import { CardPopup } from '@/components/common/CardPopup'
import { useUpload } from '@/hooks/useUpload'

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
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ file: File }>
      triggerUpload(customEvent.detail.file)
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
