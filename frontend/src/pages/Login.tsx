import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Camera, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            callback: (response: { error?: string; access_token?: string; code?: string }) => void
            redirect_uri?: string
            scope?: string
          }) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

function _storeUserFromToken(accessToken: string, fallbackEmail: string, fallbackName: string) {
  const setUser = useAuthStore.getState().setUser
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    setUser({
      id: payload.sub ?? '',
      email: payload.email ?? fallbackEmail,
      name: payload.name ?? fallbackEmail ?? 'User',
      avatar: payload.picture ?? undefined,
    })
  } catch {
    setUser({ id: '', email: fallbackEmail, name: fallbackName })
  }
}

export default function Login() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const addToast = useUiStore((s) => s.addToast)

  // ── Email/password form state ─────────────────────────────
  const [tab, setTab] = useState<'google' | 'email'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [pwError, setPwError] = useState('')

  // ── Google GIS state ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [googleClient, setGoogleClient] = useState<any>(null)

  // Load Google GIS script once
  const [gisLoaded] = useState(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId || clientId === 'your_google_client_id_here') return false
    const existing = document.getElementById('google-gis-script')
    if (existing) return true
    const script = document.createElement('script')
    script.id = 'google-gis-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google) {
        setGoogleClient(
          window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            redirect_uri: 'postmessage',
            scope: 'openid email profile',
            callback: handleGoogleCallback,
          }),
        )
      }
    }
    document.head.appendChild(script)
    return false
  })

  function handleGoogleCallback(response: { error?: string; access_token?: string; code?: string }) {
    if (response.error) {
      addToast('Đăng nhập bị hủy', 'warning')
      return
    }
    const code = (response as unknown as { code?: string }).code
    if (!code) {
      addToast('Không nhận được mã xác thực', 'error')
      return
    }
    doGoogleAuth(code)
  }

  async function doGoogleAuth(code: string) {
    const res = await authApi.googleAuth(code)
    if (!res.success || !res.data) {
      addToast(res.message || 'Đăng nhập thất bại', 'error')
      return
    }
    // Backend returns: { success, data: { tokens: { access_token, ... }, user: { ... } } }
    const raw = res.data as unknown as Record<string, unknown>
    const access_token = raw.tokens
      ? (raw.tokens as Record<string, string>).access_token
      : (raw.access_token as string | undefined)
    if (!access_token) {
      addToast('Phản hồi đăng nhập không hợp lệ', 'error')
      return
    }
    _storeUserFromToken(access_token, '', '')
    setAccessToken(access_token)
    addToast('Đăng nhập thành công!', 'success')
    navigate('/home', { replace: true })
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setPwError('')
    if (!email.trim()) { setEmailError('Vui lòng nhập email'); return }
    if (!password) { setPwError('Vui lòng nhập mật khẩu'); return }
    setIsLoading(true)
    try {
      const res = await authApi.loginWithEmail({ email, password })
      if (!res.success || !res.data) {
        addToast(res.message || 'Đăng nhập thất bại', 'error')
        return
      }
      // Backend returns: { success, data: { tokens: { access_token, ... }, user: { ... } } }
      const raw = res.data as unknown as Record<string, unknown>
      const access_token = raw.tokens
        ? (raw.tokens as Record<string, string>).access_token
        : (raw.access_token as string | undefined)
      if (!access_token) {
        addToast('Phản hồi đăng nhập không hợp lệ', 'error')
        return
      }
      _storeUserFromToken(access_token, email, email.split('@')[0])
      setAccessToken(access_token)
      addToast('Đăng nhập thành công!', 'success')
      navigate('/home', { replace: true })
    } finally {
      setIsLoading(false)
    }
  }

  function triggerGoogleLogin() {
    if (googleClient) {
      googleClient.requestAccessToken()
    } else {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId || clientId === 'your_google_client_id_here') {
        addToast('Chưa cấu hình VITE_GOOGLE_CLIENT_ID', 'warning')
        return
      }
      const redirectUri = `${window.location.origin}/auth/callback`
      const googleAuthUrl = [
        'https://accounts.google.com/o/oauth2/v2/auth',
        `?client_id=${clientId}`,
        `&redirect_uri=${encodeURIComponent(redirectUri)}`,
        '&response_type=code',
        `&scope=${encodeURIComponent('openid email profile')}`,
        '&access_type=offline',
        '&prompt=consent',
      ].join('')
      window.location.href = googleAuthUrl
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-memoir-500 shadow-lg">
          <Camera className="h-8 w-8 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">MemoirFinance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Lưu giữ khoảnh khắc bằng hình ảnh
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex w-full max-w-sm items-center gap-1 rounded-full bg-gray-100 p-1">
        <button
          onClick={() => setTab('email')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${
            tab === 'email'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Email
        </button>
        <button
          onClick={() => setTab('google')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${
            tab === 'google'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Google
        </button>
      </div>

      {/* ── Email/Password Form ─────────────────────────────── */}
      {tab === 'email' ? (
        <form
          onSubmit={handleEmailSubmit}
          className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
        >
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
            error={emailError}
            autoComplete="email"
          />
          <div className="relative">
            <Input
              label="Mật khẩu"
              type={showPw ? 'text' : 'password'}
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError('') }}
              error={pwError}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Đăng nhập
          </Button>

          <p className="text-center text-sm text-gray-500">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className="font-medium text-memoir-500 hover:underline"
            >
              Đăng ký
            </Link>
          </p>
        </form>
      ) : (
        /* ── Google Button ────────────────────────────────── */
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={triggerGoogleLogin}
            disabled={!gisLoaded && !googleClient}
            className="relative flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Đăng nhập với Google</span>
          </button>

          <p className="text-center text-xs text-gray-400">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className="font-medium text-memoir-500 hover:underline"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      )}

      {/* Terms */}
      <p className="mt-6 text-center text-xs text-gray-400 max-w-sm">
        Bằng cách đăng nhập, bạn đồng ý với{' '}
        <span className="underline cursor-pointer">Điều khoản sử dụng</span>{' '}
        và{' '}
        <span className="underline cursor-pointer">Chính sách bảo mật</span>
      </p>
    </div>
  )
}
