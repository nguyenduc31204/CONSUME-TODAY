import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
]

const CURRENCIES = [
  { value: 'VND', label: 'Việt Nam Đồng', symbol: '₫', locale: 'vi-VN' },
  { value: 'USD', label: 'US Dollar', symbol: '$', locale: 'en-US' },
  { value: 'EUR', label: 'Euro', symbol: '€', locale: 'de-DE' },
]

interface SettingsState {
  language: string
  currency: string
  notifications: boolean
  autoSaveSeconds: number
}

function loadSettings(): SettingsState {
  const stored = localStorage.getItem('memoir-settings')
  return stored
    ? JSON.parse(stored)
    : {
        language: 'vi',
        currency: 'VND',
        notifications: true,
        autoSaveSeconds: 3,
      }
}

function saveSettings(s: SettingsState) {
  localStorage.setItem('memoir-settings', JSON.stringify(s))
}

export default function Settings() {
  const navigate = useNavigate()
  const addToast = useUiStore((s) => s.addToast)
  const { logout } = useAuth()
  const user = useAuthStore((s) => s.user)

  const [settings, setSettings] = useState<SettingsState>(loadSettings)
  const [showLangModal, setShowLangModal] = useState(false)
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  function updateSetting<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveSettings(next)
    addToast('Đã lưu cài đặt', 'success')
  }

  function handleLogout() {
    setShowLogoutConfirm(false)
    logout()
    navigate('/login', { replace: true })
  }

  const currentLang = LANGUAGES.find((l) => l.value === settings.language) ?? LANGUAGES[0]
  const currentCurrency = CURRENCIES.find((c) => c.value === settings.currency) ?? CURRENCIES[0]

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cream border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Cài đặt</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Account section */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Tài khoản</p>
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            {user ? (
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-memoir-100 overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-memoir-600">
                      {user.name?.[0]?.toUpperCase() ?? '👤'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4">
                <p className="text-sm text-gray-500">Chưa đăng nhập</p>
              </div>
            )}
          </div>
        </section>

        {/* Preferences section */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Tùy chọn</p>
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {/* Language */}
            <button
              onClick={() => setShowLangModal(true)}
              className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{currentLang.flag}</span>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Ngôn ngữ</p>
                  <p className="text-xs text-gray-500">{currentLang.label}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </button>

            {/* Currency */}
            <button
              onClick={() => setShowCurrencyModal(true)}
              className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{currentCurrency.symbol}</span>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Đơn vị tiền tệ</p>
                  <p className="text-xs text-gray-500">{currentCurrency.label}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </button>

            {/* Auto-save countdown */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-gray-900">Tự động lưu</p>
                <p className="text-xs text-gray-500">
                  Sau {settings.autoSaveSeconds} giây không tương tác
                </p>
              </div>
              <div className="flex items-center gap-1">
                {[0, 3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => updateSetting('autoSaveSeconds', sec)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      settings.autoSaveSeconds === sec
                        ? 'bg-memoir-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                  >
                    {sec === 0 ? 'Tắt' : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-gray-900">Thông báo</p>
                <p className="text-xs text-gray-500">Nhắc nhở khi có giao dịch mới</p>
              </div>
              <button
                onClick={() => updateSetting('notifications', !settings.notifications)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  settings.notifications ? 'bg-memoir-500' : 'bg-gray-200',
                )}
                aria-checked={settings.notifications}
                role="switch"
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    settings.notifications ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* About section */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Về ứng dụng</p>
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="font-medium text-gray-900">Phiên bản</p>
              <p className="text-sm text-gray-500">v1.0.0</p>
            </div>
            <button className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <p className="font-medium text-gray-900">Điều khoản sử dụng</p>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </button>
            <button className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <p className="font-medium text-gray-900">Chính sách bảo mật</p>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </button>
          </div>
        </section>

        {/* Danger zone */}
        {user && (
          <section>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowLogoutConfirm(true)}
            >
              Đăng xuất
            </Button>
          </section>
        )}
      </div>

      {/* Language Modal */}
      <Modal isOpen={showLangModal} onClose={() => setShowLangModal(false)} title="Ngôn ngữ">
        <div className="space-y-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() => { updateSetting('language', lang.value); setShowLangModal(false) }}
              className={cn(
                'flex w-full items-center gap-4 rounded-xl px-4 py-3 transition-colors',
                settings.language === lang.value
                  ? 'bg-memoir-50 ring-1 ring-memoir-200'
                  : 'hover:bg-gray-50',
              )}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="flex-1 text-left font-medium text-gray-900">{lang.label}</span>
              {settings.language === lang.value && (
                <span className="h-2 w-2 rounded-full bg-memoir-500" />
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* Currency Modal */}
      <Modal isOpen={showCurrencyModal} onClose={() => setShowCurrencyModal(false)} title="Đơn vị tiền tệ">
        <div className="space-y-2">
          {CURRENCIES.map((currency) => (
            <button
              key={currency.value}
              onClick={() => { updateSetting('currency', currency.value); setShowCurrencyModal(false) }}
              className={cn(
                'flex w-full items-center gap-4 rounded-xl px-4 py-3 transition-colors',
                settings.currency === currency.value
                  ? 'bg-memoir-50 ring-1 ring-memoir-200'
                  : 'hover:bg-gray-50',
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold">
                {currency.symbol}
              </span>
              <span className="flex-1 text-left">
                <span className="font-medium text-gray-900">{currency.label}</span>
                <span className="ml-2 text-xs text-gray-400">{currency.value}</span>
              </span>
              {settings.currency === currency.value && (
                <span className="h-2 w-2 rounded-full bg-memoir-500" />
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* Logout Confirm */}
      <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Đăng xuất">
        <p className="text-sm text-gray-600 mb-6">
          Bạn có chắc muốn đăng xuất khỏi MemoirFinance?
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setShowLogoutConfirm(false)}>
            Hủy
          </Button>
          <Button variant="destructive" className="flex-1" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </Modal>
    </div>
  )
}
