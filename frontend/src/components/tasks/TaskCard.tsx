/**
 * TaskCard — Compact task card. Tap opens TaskDetailSheet.
 * Shows: status icon, title, description preview, priority badge, due date, thumbnail.
 */

import { CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatVND } from '@/utils/formatters'
import { getProxyImageUrl } from '@/utils/imageUrl'
import type { TaskItem } from '@/api/tasks'

// ── Priority config ───────────────────────────────────────────────

const PRIORITY_CONFIG = {
  low:    { label: 'Thấp',       color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
  medium: { label: 'Trung bình', color: 'bg-blue-50 text-blue-600',  dot: 'bg-blue-500' },
  high:   { label: 'Cao',        color: 'bg-orange-50 text-orange-600',dot: 'bg-orange-500' },
  urgent: { label: 'Khẩn cấp',  color: 'bg-red-50 text-red-600',     dot: 'bg-red-500' },
} as const

// ── TaskCard ─────────────────────────────────────────────────────

interface TaskCardProps {
  task: TaskItem
  onToggle: (id: string, completed: boolean) => void
  onOpen: (task: TaskItem) => void
}

export function TaskCard({ task, onToggle, onOpen }: TaskCardProps) {
  const isCompleted = task.status === 'completed'
  const isOverdue = !!(
    task.due_date &&
    !isCompleted &&
    new Date(task.due_date + 'T12:00:00') < new Date(new Date().toDateString() + 'T12:00:00')
  )
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium

  const imgSrc = task.related_transaction_image
    ? getProxyImageUrl(task.related_transaction_image)
    : task.related_circle_post_image
      ? getProxyImageUrl(task.related_circle_post_image)
      : null

  const relatedTxLabel =
    task.related_transaction_amount != null
      ? `${formatVND(task.related_transaction_amount)}${task.related_transaction_merchant ? ` · ${task.related_transaction_merchant}` : ''}`
      : task.related_circle_post_caption ?? null

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(task.id, !isCompleted)
  }

  return (
    <button
      onClick={() => onOpen(task)}
      className={cn(
        'group w-full flex items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left',
        'shadow-sm hover:shadow-md border-gray-100 hover:border-gray-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-memoir-400',
        'transition-all duration-150 active:scale-[0.99]',
        isCompleted && 'opacity-60',
      )}
    >
      {/* Status toggle */}
      <div onClick={handleToggle} className="flex-shrink-0 pt-0.5 -ml-1 pr-1">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        ) : isOverdue ? (
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
        ) : (
          <Circle className="h-5 w-5 text-gray-200 group-hover:text-memoir-300 transition-colors flex-shrink-0" />
        )}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Title + description */}
        <p className={cn(
          'text-sm font-semibold leading-snug',
          isCompleted ? 'line-through text-gray-400' : 'text-gray-900',
        )}>
          {task.title}
        </p>

        {task.description && (
          <p className="mt-0.5 text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Meta chips */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Priority */}
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            priority.color,
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', priority.dot)} />
            {priority.label}
          </span>

          {/* Due date */}
          {task.due_date && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              isOverdue ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500',
            )}>
              <Clock className="h-2.5 w-2.5" />
              {new Date(task.due_date + 'T12:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
            </span>
          )}

          {/* Related transaction */}
          {relatedTxLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 truncate max-w-[120px]">
              💳 {relatedTxLabel}
            </span>
          )}

          {/* Completed date */}
          {isCompleted && task.completed_at && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
              ✅ {new Date(task.completed_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>

      {/* Thumbnail */}
      {imgSrc && (
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl">
          <img
            src={imgSrc}
            alt=""
            className="h-full w-full object-cover"
          />
          {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
      )}
    </button>
  )
}
