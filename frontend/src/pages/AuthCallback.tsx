import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { Spinner } from '@/components/ui/Spinner'

/**
 * AuthCallback — Handles the OAuth redirect from Google.
 *
 * Flow:
 *   1. Google redirects to /auth/callback?code=...
 *   2. This page exchanges the code for JWT tokens
 *   3. Stores tokens in authStore
 *   4. Navigates to /home
 *
 * Note: In production this code comes from Google's redirect.
 * In dev, you may simulate it with a mock code or use the backend's
 * direct Google auth URL which returns tokens directly.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error || !code) {
      addToast('Đăng nhập thất bại. Vui lòng thử lại.', 'error')
      navigate('/login', { replace: true })
      return
    }

    const doAuth = async () => {
      const res = await authApi.googleAuth(code, `${window.location.origin}/auth/callback`)

      if (!res.success || !res.data) {
        addToast(res.message || 'Đăng nhập thất bại', 'error')
        navigate('/login', { replace: true })
        return
      }

      // Backend returns: { success, data: { tokens: { access_token, ... }, user: { ... } } }
      const raw = res.data as unknown as Record<string, unknown>
      const access_token = raw.tokens
        ? (raw.tokens as Record<string, string>).access_token
        : (raw.access_token as string | undefined)
      if (!access_token) {
        addToast('Phản hồi đăng nhập không hợp lệ', 'error')
        navigate('/login', { replace: true })
        return
      }

      // Decode JWT payload (base64) to get user info — backend may also
      // expose a /auth/me endpoint, but decoding is synchronous and fast.
      // The actual user object is stored in authStore after decoding.
      try {
        const payload = JSON.parse(atob(access_token.split('.')[1]))
        setUser({
          id: payload.sub ?? '',
          email: payload.email ?? '',
          name: payload.name ?? payload.email ?? 'User',
          avatar: payload.picture ?? undefined,
        })
      } catch {
        // Fallback — store raw token; /auth/me can populate user later
        setUser(null)
      }

      setAccessToken(access_token)
      // TODO: store refresh_token in secure httpOnly cookie via backend (Phase 2)
      // For now it's kept in memory; Phase 2 will implement proper refresh flow.

      addToast('Đăng nhập thành công!', 'success')
      navigate('/home', { replace: true })
    }

    doAuth()
  }, [navigate, setUser, setAccessToken, addToast])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream">
      <Spinner size="lg" />
      <p className="mt-4 text-sm text-gray-500">Đang đăng nhập...</p>
    </div>
  )
}
