/**
 * TaskCreateDialog — Modal to create a new task.
 * Fields: title, description, due_date, priority.
 * Optional: link to a transaction.
 */

import { useState } from 'react'
import { X, Calendar, Flag } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { CreateTaskData } from '@/api/tasks'

// ── Priority options ────────────────────────────────────────────

const PRIORITIES = [
  { value: 'low',    label: 'Thấp',   color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  { value: 'medium', label: 'Trung bình', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
  { value: 'high',   label: 'Cao',   color: 'bg-orange-50 text-orange-600', dot: 'bg-orange-500' },
  { value: 'urgent', label: 'Khẩn cấp', color: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
] as const

// ── Props ───────────────────────────────────────────────────────

interface TaskCreateDialogProps {
  onClose: () => void
  onSubmit: (data: CreateTaskData) => void
  isLoading?: boolean
  initialData?: {
    related_transaction_id?: string
    related_circle_post_id?: string
  }
}

// ── Component ───────────────────────────────────────────────────

export function TaskCreateDialog({ onClose, onSubmit, isLoading, initialData }: TaskCreateDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<string>('medium')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrors({ title: 'Tiêu đề không được để trống' })
      return
    }
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      priority: priority as CreateTaskData['priority'],
      ...(initialData?.related_transaction_id && { related_transaction_id: initialData.related_transaction_id }),
      ...(initialData?.related_circle_post_id && { related_circle_post_id: initialData.related_circle_post_id }),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Thêm nhiệm vụ</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors({}) }}
              placeholder="Ví dụ: Mua quà sinh nhật mẹ"
              maxLength={255}
              className={cn(
                'w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm text-gray-900',
                'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400',
                errors.title ? 'border-red-400' : 'border-gray-200',
              )}
              autoFocus
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chi tiết thêm (không bắt buộc)"
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400 resize-none"
            />
          </div>

          {/* Due date + Priority row */}
          <div className="flex gap-3">
            {/* Due date */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                <Calendar className="inline h-3 w-3 mr-1" />
                Ngày đến hạn
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-memoir-400"
              />
            </div>

            {/* Priority */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                <Flag className="inline h-3 w-3 mr-1" />
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-memoir-400"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Related transaction hint */}
          {(initialData?.related_transaction_id || initialData?.related_circle_post_id) && (
            <div className="flex items-center gap-2 rounded-xl bg-memoir-50 px-3 py-2 text-xs text-memoir-600">
              <span>📷</span>
              <span>Đang liên kết với một kỷ niệm</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all',
                'bg-memoir-500 text-white hover:bg-memoir-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isLoading ? 'Đang thêm...' : 'Thêm nhiệm vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
