/**
 * TaskDetailSheet — Slide-up sheet for viewing/editing/deleting a task.
 * Shows task details + inline edit + delete confirmation.
 */

import { useState, useEffect } from 'react'
import { X, CheckCircle2, Circle, Clock, AlertTriangle, Trash2, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatVND } from '@/utils/formatters'
import { getProxyImageUrl } from '@/utils/imageUrl'
import type { TaskItem } from '@/api/tasks'
import type { UpdateTaskData } from '@/api/tasks'

// ── Priority config ───────────────────────────────────────────────

const PRIORITIES = [
  { value: 'low',    label: 'Thấp',      color: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
  { value: 'medium', label: 'Trung bình', color: 'bg-blue-50 text-blue-600',   dot: 'bg-blue-500' },
  { value: 'high',   label: 'Cao',        color: 'bg-orange-50 text-orange-600',dot: 'bg-orange-500' },
  { value: 'urgent', label: 'Khẩn cấp',   color: 'bg-red-50 text-red-600',      dot: 'bg-red-500' },
] as const

// ── Props ────────────────────────────────────────────────────────

interface TaskDetailSheetProps {
  task: TaskItem
  onClose: () => void
  onToggle: (id: string, completed: boolean) => void
  onUpdate: (payload: { id: string; data: UpdateTaskData }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isUpdating?: boolean
  isDeleting?: boolean
}

// ── Sheet ───────────────────────────────────────────────────────

export function TaskDetailSheet({
  task,
  onClose,
  onToggle,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: TaskDetailSheetProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Local edit state
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [priority, setPriority] = useState(task.priority)
  const [priorityOpen, setPriorityOpen] = useState(false)

  const isCompleted = task.status === 'completed'
  const isOverdue = task.due_date && !isCompleted && new Date(task.due_date) < new Date(new Date().toDateString())
  const currentPriority = PRIORITIES.find((p) => p.value === task.priority) ?? PRIORITIES[1]

  const relatedTxImg = task.related_transaction_image
    ? getProxyImageUrl(task.related_transaction_image)
    : null

  // Reset on task change
  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setDueDate(task.due_date ?? '')
    setPriority(task.priority)
    setMode('view')
    setShowDeleteConfirm(false)
    setPriorityOpen(false)
  }, [task.id])

  const handleSave = async () => {
    if (!title.trim()) return
    await onUpdate({
      id: task.id,
      data: {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        priority: priority as UpdateTaskData['priority'],
      },
    })
    setMode('view')
  }

  const handleDelete = async () => {
    await onDelete(task.id)
    onClose()
  }

  const handlePrioritySelect = (val: typeof priority) => {
    setPriority(val)
    setPriorityOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300"
        style={{ maxHeight: '90vh' }}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Status toggle */}
            <button
              onClick={() => onToggle(task.id, !isCompleted)}
              disabled={isUpdating}
              className={cn(
                'flex-shrink-0 transition-all',
                isCompleted
                  ? 'text-emerald-500'
                  : isOverdue
                  ? 'text-red-400 hover:text-red-500'
                  : 'text-gray-300 hover:text-memoir-400',
              )}
              aria-label={isCompleted ? 'Reopen task' : 'Complete task'}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-7 w-7" strokeWidth={1.5} />
              ) : (
                <Circle className="h-7 w-7" strokeWidth={1.5} />
              )}
            </button>

            {/* Title or edit */}
            {mode === 'view' ? (
              <h2 className={cn(
                'text-lg font-bold leading-snug',
                isCompleted ? 'line-through text-gray-400' : 'text-gray-900',
              )}>
                {task.title}
              </h2>
            ) : (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 text-lg font-bold text-gray-900 bg-transparent border-b-2 border-memoir-400 outline-none pb-0.5"
                autoFocus
              />
            )}
          </div>

          <div className="flex items-center gap-1">
            {mode === 'view' ? (
              <>
                <button
                  onClick={() => setMode('edit')}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-memoir-600 bg-memoir-50 hover:bg-memoir-100 transition-colors"
                >
                  Sửa
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-gray-100 transition-colors ml-1"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setMode('view'); setTitle(task.title); setPriority(task.priority); }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={isUpdating || !title.trim()}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    title.trim()
                      ? 'bg-memoir-500 text-white hover:bg-memoir-600'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                  )}
                >
                  {isUpdating ? 'Đang lưu...' : 'Lưu'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Status badge */}
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Hoàn thành
                {task.completed_at && (
                  <span className="text-emerald-400">
                    · {new Date(task.completed_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </span>
            ) : isOverdue ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Quá hạn
                <span className="text-red-400">
                  · {new Date(task.due_date! + 'T12:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
                </span>
              </span>
            ) : null}
          </div>

          {/* ── Edit mode fields ─────────────────────────── */}
          {mode === 'edit' ? (
            <>
              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Mô tả</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Chi tiết nhiệm vụ..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400 focus:border-memoir-400 resize-none transition-shadow"
                />
              </div>

              {/* Due date */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Ngày đến hạn
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-memoir-400 focus:border-memoir-400 transition-shadow"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Mức ưu tiên</label>
                <div className="relative">
                  <button
                    onClick={() => setPriorityOpen(!priorityOpen)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-shadow',
                      'focus:outline-none focus:ring-2 focus:ring-memoir-400',
                      priorityOpen ? 'border-memoir-400 ring-2 ring-memoir-400 bg-white' : 'border-gray-200 bg-gray-50 text-gray-900',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', PRIORITIES.find(p => p.value === priority)?.dot)} />
                      {PRIORITIES.find(p => p.value === priority)?.label}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', priorityOpen && 'rotate-180')} />
                  </button>

                  {priorityOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-lg z-10 overflow-hidden">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => handlePrioritySelect(p.value)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors',
                            priority === p.value ? 'bg-memoir-50 text-memoir-700' : 'hover:bg-gray-50 text-gray-700',
                          )}
                        >
                          <span className={cn('h-2 w-2 rounded-full', p.dot)} />
                          {p.label}
                          {priority === p.value && (
                            <CheckCircle2 className="ml-auto h-4 w-4 text-memoir-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ── View mode ─────────────────────────────── */
            <>
              {/* Description */}
              {task.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
              )}

              {/* Meta chips */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Due date */}
                {task.due_date && (
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                    isOverdue ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600',
                  )}>
                    <Clock className="h-3 w-3" />
                    {new Date(task.due_date + 'T12:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })}
                  </span>
                )}

                {/* Priority */}
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                  currentPriority.color,
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', currentPriority.dot)} />
                  {currentPriority.label}
                </span>
              </div>

              {/* Related transaction */}
              {relatedTxImg && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-400 mb-2">
                    Liên kết kỷ niệm
                  </p>
                  <div className="relative rounded-2xl overflow-hidden border border-gray-100">
                    <img
                      src={relatedTxImg}
                      alt={task.related_transaction_merchant ?? 'Kỷ niệm liên kết'}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      {task.related_transaction_amount != null && (
                        <span className="text-sm font-bold text-white">
                          {formatVND(task.related_transaction_amount)}
                        </span>
                      )}
                      {task.related_transaction_merchant && (
                        <span className="ml-2 text-xs text-white/80">{task.related_transaction_merchant}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-2 border-t border-gray-100 space-y-1">
                <p className="text-xs text-gray-400">
                  Tạo lúc: {new Date(task.created_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {task.updated_at !== task.created_at && (
                  <p className="text-xs text-gray-400">
                    Cập nhật: {new Date(task.updated_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer: Delete ──────────────────────────────── */}
        {mode === 'view' && (
          <div className="flex-shrink-0 px-5 pb-6 pt-2 border-t border-gray-100">
            {showDeleteConfirm ? (
              /* Inline delete confirmation */
              <div className="flex items-center gap-3 animate-in fade-in duration-200">
                <span className="flex-1 text-xs text-gray-500">Xóa nhiệm vụ này?</span>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Không
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors group"
              >
                <Trash2 className="h-4 w-4" />
                Xóa nhiệm vụ
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
