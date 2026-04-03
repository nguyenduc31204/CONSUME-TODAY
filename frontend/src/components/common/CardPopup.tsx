import { useEffect, useRef, useState } from 'react'
import { X, Edit3, Check, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/utils/cn'
import { useUploadStore } from '@/stores/uploadStore'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { transactionsApi } from '@/api/transactions'
import type { UploadTransactionResponse, TransactionEditResponse, WalletSummary, CategorySummary, UploadState } from '@/types/upload'
import type { TransactionUpdateData } from '@/types/transaction'
import { Spinner } from '@/components/ui/Spinner'
import { getProxyImageUrl } from '@/utils/imageUrl'

// ── Helpers ────────────────────────────────────────────────────

function formatAmount(amount: number | null): string {
  if (amount === null || amount === 0) return '0đ'
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Ăn uống': '🍜',
  'Mua sắm': '🛍️',
  'Di chuyển': '🚗',
  'Giải trí': '🎬',
  'Hóa đơn & Tiện ích': '🏠',
  'Sức khỏe': '💊',
  'Khác': '📌',
}

function getEmoji(name: string | null): string {
  if (!name) return '📌'
  return CATEGORY_EMOJI[name] ?? '📌'
}

function getWalletColor(_name: string): string {
  return '#9333EA'
}

// ── Countdown Bar ──────────────────────────────────────────────

function CountdownBar({ seconds, onExpire, onCancel }: {
  seconds: number
  onExpire: () => void
  onCancel: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current!)
          onExpire()
          return 0
        }
        return r - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [onExpire])

  const pct = (remaining / seconds) * 100

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-memoir-400 to-memoir-600 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
        {remaining}s
      </span>
      <button
        onClick={onCancel}
        className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        Hủy
      </button>
    </div>
  )
}

// ── Quick Edit Form ─────────────────────────────────────────────

interface QuickEditFormProps {
  data: UploadTransactionResponse
  onSave: (updates: TransactionUpdateData) => Promise<void>
  onCancel: () => void
}

function QuickEditForm({ data, onSave, onCancel }: QuickEditFormProps) {
  const [amount, setAmount] = useState<string>(
    data.ocr_result.amount !== null ? String(data.ocr_result.amount) : ''
  )
  const [merchant, setMerchant] = useState(data.ocr_result.merchant ?? '')
  const [note, setNote] = useState(data.ocr_result.note ?? '')
  const [selectedWalletId, setSelectedWalletId] = useState(data.wallet_id)
  const [isIncome, setIsIncome] = useState(false)
  // Pre-select OCR-suggested category if no DB category was loaded yet
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    data.ocr_result.category?.id ?? null
  )
  const [saving, setSaving] = useState(false)

  const { data: editData, isLoading } = useQuery<TransactionEditResponse, Error, TransactionEditResponse>({
    queryKey: ['transaction-edit', data.transaction_id],
    queryFn: async () => {
      const res = await transactionsApi.getForEdit(data.transaction_id)
      if (!res.success || !res.data) throw new Error(res.message)
      return res.data
    },
    enabled: !!useAuthStore.getState().accessToken,
  })

  const wallets: WalletSummary[] = editData?.wallets ?? [
    { id: data.wallet_id, name: data.wallet_name, color: '#9333EA', icon: 'wallet', is_default: true }
  ]
  const categories: CategorySummary[] = editData?.categories ?? [
    ...(data.ocr_result.category ? [{
      id: 'ocr-suggested',
      name: data.ocr_result.category.name,
      emoji: getEmoji(data.ocr_result.category.name),
      color: '#9333EA',
    }] : [])
  ]

  const handleSave = async () => {
    setSaving(true)
    try {
      // If user explicitly selected a DB category, use it.
      // Otherwise, if OCR already assigned a category_id, keep it.
      // Only send category_id if we have a real UUID (not null).
      const categoryIdToSave =
        selectedCategoryId ?? data.ocr_result.category?.id ?? undefined

      await onSave({
        amount: amount ? parseInt(amount, 10) : undefined,
        merchant_name: merchant || undefined,
        note: note || undefined,
        wallet_id: selectedWalletId,
        category_id: categoryIdToSave,
        is_income: isIncome,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Edit3 className="h-4 w-4" />
          Sửa thông tin
        </h3>
        <button onClick={onCancel} className="p-1 rounded-full hover:bg-gray-100">
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="space-y-3">
          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Số tiền</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={cn(
                'w-full px-3 py-2 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2',
                isIncome
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 focus:ring-emerald-300'
                  : 'border-gray-200 text-gray-900 focus:ring-memoir-300',
              )}
              inputMode="numeric"
            />
          </div>

          {/* Expense / Income toggle */}
          <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setIsIncome(false)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
                !isIncome
                  ? 'bg-white text-red-500 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <TrendingDown className="h-4 w-4" />
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => setIsIncome(true)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
                isIncome
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-emerald-600',
              )}
            >
              <TrendingUp className="h-4 w-4" />
              Thu nhập
            </button>
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cửa hàng</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Tên cửa hàng"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-memoir-300"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thêm ghi chú..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-memoir-300"
            />
          </div>

          {/* Wallet selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ví</label>
            <div className="relative">
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-8 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-memoir-300 bg-white"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Category selector */}
          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Danh mục</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategoryId(c.id === 'ocr-suggested' ? null : c.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                      (selectedCategoryId === c.id || (selectedCategoryId === null && c.id === 'ocr-suggested'))
                        ? 'bg-memoir-100 text-memoir-700 ring-2 ring-memoir-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                  >
                    <span>{c.emoji}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-memoir-500 text-white font-medium hover:bg-memoir-600 disabled:opacity-60 transition-colors"
        >
          {saving ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}
          Lưu
        </button>
      </div>
    </div>
  )
}

// ── Main Card Popup ─────────────────────────────────────────────

interface CardPopupProps {
  onConfirm: () => void
  onEdit: () => void
}

export function CardPopup({ onConfirm, onEdit }: CardPopupProps) {
  const { state, stopEditing, setDone } = useUploadStore()
  const addToast = useUiStore((s) => s.addToast)
  const queryClient = useQueryClient()

  if (state.phase === 'idle') return null

  const data = state.phase === 'uploading' || state.phase === 'error' || state.phase === 'done' || state.phase === 'compressing'
    ? null
    : (state as Extract<UploadState, { data: unknown }>).data

  const file = state.phase === 'preview' || state.phase === 'editing' || state.phase === 'compressing' || state.phase === 'uploading'
    ? (state as Extract<UploadState, { file: File }>).file
    : null

  const isUploading = state.phase === 'uploading'
  const isCompressing = state.phase === 'compressing'
  const isPreview = state.phase === 'preview'
  const isEditing = state.phase === 'editing'
  const isSaving = state.phase === 'saving'
  const isError = state.phase === 'error'
  const errorMessage = isError ? state.message : null

  // Preview thumbnail URL from upload response or local file
  const previewUrl = getProxyImageUrl(
    data?.image.thumbnail_url ?? data?.image.url,
  ) ?? (file ? URL.createObjectURL(file) : null)

  const ocr = data?.ocr_result

  const autoSaveSeconds = data?.auto_save_in_seconds ?? 3

  const handleExpire = () => {
    if (isPreview) {
      onConfirm()
    }
  }

  const handleSave = async (updates: TransactionUpdateData) => {
    if (!data) return
    if (!useAuthStore.getState().accessToken) {
      addToast('Vui lòng đăng nhập', 'warning')
      return
    }
    const res = await transactionsApi.update(data.transaction_id, updates)
    if (res.success) {
      addToast('Đã lưu!', 'success')
      setDone(data)
      // Refresh both transactions and reports
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['wallets'] })
    } else {
      addToast(res.message || 'Lưu thất bại', 'error')
    }
  }

  const handleDismiss = () => {
    // User closed without saving — if we have data, mark done; otherwise just reset
    if (data) {
      setDone(data)
    } else {
      // was uploading or error — just close
      useUploadStore.getState().reset()
    }
  }

  if (isCompressing || isUploading) {
    const phase = isCompressing ? 'Đang nén ảnh...' : 'Đang tải lên...'
    const sub = isCompressing
      ? 'Tối ưu ảnh để gửi nhanh hơn'
      : 'AI đang bóc tách thông tin'
    const previewSrc = file ? URL.createObjectURL(file) : null
    return (
      <Overlay onClose={handleDismiss}>
        <div className="flex flex-col items-center gap-4 py-8 px-6">
          <div className="relative">
            {previewSrc && (
              <img
                src={previewSrc}
                alt="Đang xử lý..."
                className="w-32 h-32 rounded-2xl object-cover opacity-60"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">{phase}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        </div>
      </Overlay>
    )
  }

  if (isSaving) {
    return (
      <Overlay onClose={() => {}}>
        <div className="flex flex-col items-center gap-4 py-8 px-6">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-gray-700">Đang lưu...</p>
        </div>
      </Overlay>
    )
  }

  if (isError) {
    return (
      <Overlay onClose={handleDismiss}>
        <div className="flex flex-col items-center gap-5 py-8 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">Xử lý thất bại</p>
            <p className="text-sm text-gray-500 mt-1">{errorMessage ?? 'Đã xảy ra lỗi khi tải ảnh lên.'}</p>
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                useUploadStore.getState().reset()
                window.dispatchEvent(new CustomEvent('memoir:retry-camera'))
              }}
              className="flex-1 py-2.5 rounded-xl bg-memoir-500 text-white font-medium hover:bg-memoir-600 transition-colors text-sm"
            >
              Thử lại
            </button>
          </div>
        </div>
      </Overlay>
    )
  }

  if (!data || !previewUrl) return null

  return (
    <Overlay onClose={handleDismiss}>
      <div className="flex flex-col max-h-[85vh]">
        {/* Image */}
        <div className="relative flex-shrink-0">
          
          <img
            src={previewUrl}
            alt={ocr?.merchant ?? 'Ảnh kỷ niệm'}
            className={cn(
              'w-full h-48 object-cover rounded-t-2xl',
              isEditing && 'h-32',
            )}
          />
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Life log badge */}
          {ocr?.is_life_log && (
            <div className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white uppercase tracking-wide">
              Life Log
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {isEditing ? (
            <QuickEditForm
              data={data}
              onSave={handleSave}
              onCancel={() => stopEditing()}
            />
          ) : (
            <>
              {/* Merchant */}
              <div className="text-center">
                {ocr?.merchant ? (
                  <h2 className="text-lg font-bold text-gray-900">{ocr.merchant}</h2>
                ) : ocr?.reason ? (
                  <h2 className="text-base font-semibold text-gray-700 italic">{ocr.reason}</h2>
                ) : (
                  <h2 className="text-base font-semibold text-gray-400">Kỷ niệm</h2>
                )}
              </div>

              {/* Amount + Category */}
              <div className="flex items-center justify-center gap-3">
                <span className={cn(
                  'text-3xl font-bold',
                  ocr?.is_life_log ? 'text-gray-300' : 'text-gray-900'
                )}>
                  {formatAmount(ocr?.amount ?? null)}
                </span>
                {ocr?.category && (
                  <span className={cn(
                    'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                    ocr.is_life_log ? 'bg-gray-100 text-gray-400' : 'bg-memoir-50 text-memoir-600'
                  )}>
                    <span>{getEmoji(ocr.category.name)}</span>
                    <span>{ocr.category.name}</span>
                  </span>
                )}
              </div>

              {/* Wallet */}
              <div className="flex items-center justify-center">
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: `${getWalletColor(data.wallet_name)}15`,
                    color: getWalletColor(data.wallet_name),
                  }}
                >
                  💰 {data.wallet_name}
                </span>
              </div>

              {/* Tap to edit hint */}
              <p className="text-center text-xs text-gray-400 mt-1">
                Chạm để sửa · {autoSaveSeconds}s tự động lưu
              </p>

              {/* Countdown bar */}
              <CountdownBar
                seconds={autoSaveSeconds}
                onExpire={handleExpire}
                onCancel={handleDismiss}
              />

              {/* Edit button */}
              <button
                onClick={onEdit}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                <Edit3 className="h-4 w-4" />
                Sửa thông tin
              </button>
            </>
          )}
        </div>
      </div>
    </Overlay>
  )
}

// ── Overlay ─────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          'bg-white rounded-2xl shadow-2xl w-full max-w-sm',
          'animate-in slide-in-from-bottom-4 fade-in duration-300',
          'sm:animate-in sm:slide-in-from-bottom-4 sm:fade-in',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
