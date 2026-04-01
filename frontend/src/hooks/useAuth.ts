import { useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

/** Hook: Authentication actions */
export function useAuth() {
  const { user, isAuthenticated, accessToken, logout: clearAuth } = useAuthStore()
  const addToast = useUiStore((s) => s.addToast)

  const loginWithGoogle = useCallback(() => {
    // Redirect to Google OAuth — Phase 2 will implement full flow
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/auth/callback`
    const scope = 'openid email profile'
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`

    window.location.href = googleAuthUrl
  }, [])

  const handleAuthCallback = useCallback(async (code: string) => {
    // Exchange code for tokens — Phase 2 implementation
    addToast('Đang đăng nhập...', 'info')
    console.log('Auth callback with code:', code)
  }, [addToast])

  const logout = useCallback(() => {
    clearAuth()
    addToast('Đã đăng xuất', 'info')
  }, [clearAuth, addToast])

  return {
    user,
    isAuthenticated,
    accessToken,
    loginWithGoogle,
    handleAuthCallback,
    logout,
  }
}
