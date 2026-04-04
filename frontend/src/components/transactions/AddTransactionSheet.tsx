/**
 * AddTransactionSheet — Modal nhập chi tiêu/thu nhập thủ công (không ảnh).
 * Phase 9c: Chi tiêu không ảnh.
 */

import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useWallets } from '@/hooks/useWallets'
import { useCategories } from '@/hooks/useCategories'
import type { TransactionCreateData } from '@/types/transaction'

// ── Type toggle ───────────────────────────────────────────────

type TxType = 'expense' | 'income'

// ── Props ──────────────────────────────────────────────────────

interface AddTransactionSheetProps {
  onClose: () => void
  onSubmit: (data: TransactionCreateData) => void
  isLoading?: boolean
  defaultDate?: string
}

// ── Category icons ─────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  'Ăn uống': '🍜',
  'Di chuyển': '🚗',
  'Mua sắm': '🛍️',
  'Giải trí': '🎬',
  'Nhà cửa': '🏠',
  'Sức khỏe': '💊',
  'Giáo dục': '📚',
  'Khác': '📦',
}

function getEmoji(name: string | null | undefined) {
  if (!name) return '📦'
  for (const [key, val] of Object.entries(CATEGORY_ICONS)) {
    if (name.includes(key)) return val
  }
  return '📦'
}

// ── Sheet ─────────────────────────────────────────────────────

export function AddTransactionSheet({
  onClose,
  onSubmit,
  isLoading,
  defaultDate,
}: AddTransactionSheetProps) {
  const [txType, setTxType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [merchant, setMerchant] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showWalletPicker, setShowWalletPicker] = useState(false)

  const { data: wallets } = useWallets()
  const { data: categories } = useCategories(selectedWalletId ?? undefined)

  const walletOptions = wallets ?? []
  const categoryOptions = categories ?? []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

    const parsedAmount = parseInt(amount.replace(/\D/g, ''), 10)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = 'Nhập số tiền hợp lệ'
    }
    if (!selectedWalletId) {
      errs.wallet = 'Chọn ví'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    onSubmit({
      amount: parsedAmount,
      merchant_name: merchant.trim() || undefined,
      category_id: selectedCategoryId ?? undefined,
      wallet_id: selectedWalletId!,
      transaction_date: date,
      transaction_time: time || undefined,
      note: note.trim() || undefined,
      is_income: txType === 'income',
      is_life_log: false,
    })
  }

  const selectedWallet = walletOptions.find((w) => w.id === selectedWalletId)
  const selectedCategory = categoryOptions.find((c) => c.id === selectedCategoryId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Thêm chi tiêu nhanh</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setTxType('expense')}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold transition-colors',
                txType === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50',
              )}
            >
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => setTxType('income')}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold transition-colors',
                txType === 'income'
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50',
              )}
            >
              Thu nhập
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Số tiền <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '')
                  setAmount(raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '')
                  setErrors({})
                }}
                placeholder="0"
                className={cn(
                  'w-full rounded-xl border bg-gray-50 px-4 py-3 pr-12 text-2xl font-bold text-right',
                  'focus:outline-none focus:ring-2 focus:ring-memoir-400 transition-all',
                  errors.amount ? 'border-red-300 bg-red-50' : 'border-gray-200',
                )}
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">đ</span>
            </div>
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cửa hàng / Tên</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder={txType === 'income' ? 'Ví dụ: Lương tháng' : 'Ví dụ: Cà phê Highlands'}
              maxLength={100}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Danh mục</label>
            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-left hover:border-gray-300 transition-colors"
            >
              <span className={selectedCategory ? 'text-gray-800' : 'text-gray-400'}>
                {selectedCategory ? `${getEmoji(selectedCategory.name)} ${selectedCategory.name}` : 'Chọn danh mục'}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {showCategoryPicker && (
              <div className="mt-1 rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { setSelectedCategoryId(null); setShowCategoryPicker(false) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-gray-50"
                >
                  Bỏ chọn
                </button>
                {categoryOptions.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setSelectedCategoryId(cat.id); setShowCategoryPicker(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors',
                      selectedCategoryId === cat.id ? 'bg-memoir-50' : '',
                    )}
                  >
                    <span>{getEmoji(cat.name)}</span>
                    <span className={selectedCategoryId === cat.id ? 'font-semibold text-memoir-700' : 'text-gray-800'}>
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Wallet */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ví <span className="text-red-400">*</span></label>
            <button
              type="button"
              onClick={() => setShowWalletPicker(!showWalletPicker)}
              className={cn(
                'w-full flex items-center justify-between rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-left hover:border-gray-300 transition-colors',
                errors.wallet ? 'border-red-300' : 'border-gray-200',
              )}
            >
              <span className={selectedWallet ? 'text-gray-800' : 'text-gray-400'}>
                {selectedWallet ? `${selectedWallet.name} · ${selectedWallet.balance?.toLocaleString('vi-VN')}đ` : 'Chọn ví'}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {errors.wallet && <p className="mt-1 text-xs text-red-500">{errors.wallet}</p>}
            {showWalletPicker && (
              <div className="mt-1 rounded-xl border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                {walletOptions.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => { setSelectedWalletId(w.id); setShowWalletPicker(false); setErrors({}) }}
                    className={cn(
                      'w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors',
                      selectedWalletId === w.id ? 'bg-memoir-50' : '',
                    )}
                  >
                    <span className={selectedWalletId === w.id ? 'font-semibold text-memoir-700' : 'text-gray-800'}>
                      {w.name}
                    </span>
                    {w.balance !== undefined && (
                      <span className="ml-2 text-xs text-gray-400">
                        {w.balance.toLocaleString('vi-VN')}đ
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date + Time row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ngày</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-memoir-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Giờ</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-memoir-400"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú thêm..."
              rows={2}
              maxLength={255}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all',
                txType === 'income'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-memoir-500 text-white hover:bg-memoir-600',
                isLoading ? 'opacity-50 cursor-not-allowed' : 'shadow-md',
              )}
            >
              {isLoading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
