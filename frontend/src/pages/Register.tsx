import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Camera, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function Register() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const addToast = useUiStore((s) => s.addToast)

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((err) => ({ ...err, [field]: '' }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Vui lòng nhập tên'
    if (!form.email.trim()) errs.email = 'Vui lòng nhập email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Email không hợp lệ'
    if (!form.password) errs.password = 'Vui lòng nhập mật khẩu'
    else if (form.password.length < 6)
      errs.password = 'Mật khẩu phải có ít nhất 6 ký tự'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    try {
      const res = await authApi.register({
        email: form.email,
        password: form.password,
        name: form.name,
      })
      if (!res.success || !res.data) {
        addToast(res.message || 'Đăng ký thất bại', 'error')
        return
      }
      // Backend returns: { success, data: { tokens: { access_token, ... }, user: { ... } } }
      const raw = res.data as unknown as Record<string, unknown>
      const access_token = raw.tokens
        ? (raw.tokens as Record<string, string>).access_token
        : (raw.access_token as string | undefined)
      if (!access_token) {
        addToast('Phản hồi đăng ký không hợp lệ', 'error')
        return
      }
      // Decode JWT payload
      try {
        const payload = JSON.parse(atob(access_token.split('.')[1]))
        setUser({
          id: payload.sub ?? '',
          email: payload.email ?? form.email,
          name: payload.name ?? form.name,
          avatar: payload.picture ?? undefined,
        })
      } catch {
        setUser({ id: '', email: form.email, name: form.name })
      }
      setAccessToken(access_token)
      addToast('Đăng ký thành công!', 'success')
      navigate('/home', { replace: true })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-memoir-500 shadow-lg">
          <Camera className="h-8 w-8 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bắt đầu ghi nhận kỷ niệm của bạn
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
      >
        <Input
          label="Tên của bạn"
          type="text"
          placeholder="Nguyễn Văn A"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          autoComplete="email"
        />
        <div className="relative">
          <Input
            label="Mật khẩu"
            type={showPw ? 'text' : 'password'}
            placeholder="Ít nhất 6 ký tự"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            autoComplete="new-password"
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
          Tạo tài khoản
        </Button>
      </form>

      {/* Already have account */}
      <p className="mt-5 text-sm text-gray-500">
        Đã có tài khoản?{' '}
        <Link
          to="/login"
          className="font-medium text-memoir-500 hover:underline"
        >
          Đăng nhập
        </Link>
      </p>

      {/* Back link */}
      <p className="mt-3 text-xs text-gray-400">
        <Link to="/login" className="hover:text-gray-500">
          ← Quay lại đăng nhập
        </Link>
      </p>
    </div>
  )
}
