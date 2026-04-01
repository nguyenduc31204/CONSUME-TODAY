import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { ToastContainer } from '@/components/ui/Toast'

interface AppShellProps {
  children: ReactNode
}

/**
 * AppShell — Wraps every page with:
 * - Bottom navigation (always visible, including Camera FAB)
 * - Toast container (global notification layer)
 * - Safe area padding for mobile
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* Page content with bottom padding to avoid nav overlap */}
      <main className="flex-1 overflow-y-auto pb-24">{children}</main>

      {/* Bottom Navigation — always visible */}
      <BottomNav />

      {/* Global Toast notifications */}
      <ToastContainer />
    </div>
  )
}
