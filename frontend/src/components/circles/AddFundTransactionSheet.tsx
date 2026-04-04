/**
 * AddFundTransactionSheet — Modal nhập chi tiêu / thu nhập vào quỹ chung của Circle.
 */

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { CreateFundTransactionData } from '@/api/circles'

type TxType = 'expense' | 'income'
type SplitType = 'equal' | 'single' | 'custom'

interface AddFundTransactionSheetProps {
  onClose: () => void
  onSubmit: (data: CreateFundTransactionData) => void
  isLoading?: boolean
  memberCount?: number
}

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

const CATEGORIES = Object.keys(CATEGORY_ICONS)

function getEmoji(name: string) {
  for (const [key, val] of Object.entries(CATEGORY_ICONS)) {
    if (name.includes(key)) return val
  }
  return '📦'
}

export function AddFundTransactionSheet({
  onClose,
  onSubmit,
  isLoading,
  memberCount = 1,
}: AddFundTransactionSheetProps) {
  const [txType, setTxType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

    const parsedAmount = parseInt(amount.replace(/\D/g, ''), 10)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = 'Nhập số tiền hợp lệ'
    }
    if (!description.trim()) {
      errs.description = 'Nhập mô tả'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    onSubmit({
      type: txType,
      amount: parsedAmount,
      description: description.trim(),
      category: category || undefined,
      transaction_date: date,
      transaction_time: time || undefined,
      split_type: splitType,
    })
  }

  const splitLabel = {
    equal: `Chia đều ${memberCount} người`,
    single: 'Một người chịu',
    custom: 'Chia tùy ý',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Giao dịch quỹ</h2>
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
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Số tiền <span className="text-red-400">*</span>
            </label>
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

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Mô tả <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors({}) }}
              placeholder="Ví dụ: Ăn tối cả nhà, Lương tháng..."
              maxLength={255}
              className={cn(
                'w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-900',
                'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400',
                errors.description ? 'border-red-300 bg-red-50' : 'border-gray-200',
              )}
            />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Danh mục</label>
            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-left hover:border-gray-300 transition-colors"
            >
              <span className={category ? 'text-gray-800' : 'text-gray-400'}>
                {category ? `${getEmoji(category)} ${category}` : 'Chọn danh mục'}
              </span>
              <span className="text-gray-400 text-xs">▼</span>
            </button>
            {showCategoryPicker && (
              <div className="mt-1 rounded-xl border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategory(cat); setShowCategoryPicker(false) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
                  >
                    <span>{getEmoji(cat)}</span>
                    <span className={category === cat ? 'font-semibold text-memoir-700' : 'text-gray-800'}>
                      {cat}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Split type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cách chia</label>
            <div className="flex gap-2">
              {(['equal', 'single', 'custom'] as SplitType[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSplitType(st)}
                  className={cn(
                    'flex-1 rounded-xl border py-2 text-xs font-medium transition-colors',
                    splitType === st
                      ? 'bg-memoir-500 text-white border-memoir-500'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {splitLabel[st]}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time */}
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
