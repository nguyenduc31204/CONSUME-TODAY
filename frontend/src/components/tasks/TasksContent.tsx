/**
 * TasksContent — Tasks view for integration into Reports page sub-tab.
 * Features:
 * - Filter tabs: Tất cả · Hôm nay · Sắp tới · Quá hạn · Đã xong
 * - Task cards with tap → TaskDetailSheet
 * - Floating add button
 * - Full loading skeleton + empty states
 */

import { useMemo, useState } from 'react'
import { Plus, ListTodo, CalendarDays, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTasks, useCreateTask, useCompleteTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { TaskCard } from './TaskCard'
import { TaskCreateDialog } from './TaskCreateDialog'
import { TaskDetailSheet } from './TaskDetailSheet'
import type { CreateTaskData, TaskItem } from '@/api/tasks'

// ── Filter tabs ────────────────────────────────────────────────

type FilterTab = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'

const FILTER_TABS: { id: FilterTab; label: string; icon: React.ElementType }[] = [
  { id: 'all',       label: 'Tất cả',   icon: ListTodo },
  { id: 'today',     label: 'Hôm nay',  icon: CalendarDays },
  { id: 'upcoming',  label: 'Sắp tới', icon: ArrowRight },
  { id: 'overdue',   label: 'Quá hạn', icon: AlertTriangle },
  { id: 'completed', label: 'Đã xong',  icon: CheckCircle2 },
]

// ── Skeleton ──────────────────────────────────────────────────

function TaskCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 animate-pulse">
      <div className="h-5 w-5 rounded-full bg-gray-200 flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-3 w-1/3 rounded bg-gray-100" />
      </div>
      <div className="h-14 w-14 rounded-xl bg-gray-200 flex-shrink-0" />
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────

interface TaskSectionProps {
  title: string
  tasks: TaskItem[]
  isLoading: boolean
  onToggle: (id: string, completed: boolean) => void
  onOpen: (task: TaskItem) => void
  emptyLabel?: string
}

function TaskSection({ title, tasks, isLoading, onToggle, onOpen, emptyLabel }: TaskSectionProps) {
  if (isLoading) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
          <span className="h-4 w-4 rounded-full bg-gray-200 animate-pulse" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <TaskCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center">
          <p className="text-xs text-gray-400">{emptyLabel ?? 'Không có nhiệm vụ'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={onToggle} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────

function TasksEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      {/* Illustration */}
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-memoir-50">
          <ListTodo className="h-10 w-10 text-memoir-300" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
          <Plus className="h-4 w-4 text-memoir-500" />
        </div>
      </div>

      <div>
        <p className="text-base font-semibold text-gray-800">Chưa có nhiệm vụ nào</p>
        <p className="mt-1 text-sm text-gray-400 max-w-xs">
          Tạo nhiệm vụ để ghi nhớ những việc quan trọng, gắn với kỷ niệm của bạn
        </p>
      </div>

      <button
        onClick={onAdd}
        className={cn(
          'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold',
          'bg-memoir-500 text-white hover:bg-memoir-600 active:scale-95',
          'shadow-md shadow-memoir-500/20 transition-all',
        )}
      >
        <Plus className="h-4 w-4" />
        Tạo nhiệm vụ đầu tiên
      </button>
    </div>
  )
}

// ── TasksContent ──────────────────────────────────────────────

export function TasksContent() {
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading, refetch } = useTasks()
  const createTask = useCreateTask()
  const completeTask = useCompleteTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const tasks = useMemo(() => data?.items ?? [], [data?.items])

  // ── Group tasks ───────────────────────────────────────────
  const today = new Date().toDateString()

  const filteredTasks = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'cancelled')

    const overdue = active.filter(
      (t) => t.due_date && t.status !== 'completed' && new Date(t.due_date + 'T12:00:00') < new Date(new Date().toDateString() + 'T12:00:00')
    )
    const done = tasks.filter((t) => t.status === 'completed')

    switch (filterTab) {
      case 'today':
        return active.filter(
          (t) => t.due_date && new Date(t.due_date + 'T12:00:00').toDateString() === today
        )
      case 'upcoming':
        return active.filter(
          (t) => t.due_date && new Date(t.due_date + 'T12:00:00').toDateString() > today
        )
      case 'overdue':
        return overdue
      case 'completed':
        return done
      default:
        return active.filter((t) => t.status !== 'completed')
    }
  }, [tasks, filterTab, today])

  // Count badges for each tab
  const tabCounts = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'cancelled')
    const done = tasks.filter((t) => t.status === 'completed')
    const overdueCount = active.filter(
      (t) => t.due_date && t.status !== 'completed' && new Date(t.due_date + 'T12:00:00') < new Date(new Date().toDateString() + 'T12:00:00')
    ).length
    return {
      all: active.filter((t) => t.status !== 'completed').length,
      today: active.filter((t) => t.due_date && new Date(t.due_date + 'T12:00:00').toDateString() === today).length,
      upcoming: active.filter((t) => t.due_date && new Date(t.due_date + 'T12:00:00').toDateString() > today).length,
      overdue: overdueCount,
      completed: done.length,
    }
  }, [tasks, today])

  // ── Handlers ───────────────────────────────────────────────

  const handleToggle = async (id: string, completed: boolean) => {
    await completeTask.mutateAsync({ id, completed })
  }

  const handleUpdate = async (payload: { id: string; data: Parameters<typeof updateTask.mutateAsync>[0]['data'] }) => {
    const updated = await updateTask.mutateAsync(payload)
    setSelectedTask(updated)
    refetch()
  }

  const handleDelete = async (id: string) => {
    await deleteTask.mutateAsync(id)
    setSelectedTask(null)
  }

  const handleCreate = async (formData: CreateTaskData) => {
    await createTask.mutateAsync(formData)
    setShowCreate(false)
  }

  // ── Render ─────────────────────────────────────────────────

  const sectionTitle = {
    all: 'Nhiệm vụ',
    today: 'Hôm nay',
    upcoming: 'Sắp tới',
    overdue: 'Quá hạn',
    completed: 'Đã hoàn thành',
  }[filterTab]

  return (
    <div>
      {/* ── Filter tabs ─────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {FILTER_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setFilterTab(id)}
            className={cn(
              'flex items-center gap-1.5 flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
              filterTab === id
                ? 'bg-memoir-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:text-gray-700',
              tabCounts[id] === 0 && filterTab !== id && 'opacity-50',
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
            {tabCounts[id] > 0 && (
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-[18px] text-center',
                filterTab === id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600',
              )}>
                {tabCounts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Task list ───────────────────────────────────── */}
      {tasks.length === 0 && !isLoading ? (
        <TasksEmpty onAdd={() => setShowCreate(true)} />
      ) : (
        <TaskSection
          title={sectionTitle}
          tasks={filteredTasks}
          isLoading={isLoading}
          onToggle={handleToggle}
          onOpen={setSelectedTask}
          emptyLabel={
            filterTab === 'today' ? 'Không có nhiệm vụ nào hôm nay' :
            filterTab === 'upcoming' ? 'Không có nhiệm vụ sắp tới' :
            filterTab === 'overdue' ? 'Không có nhiệm vụ quá hạn' :
            filterTab === 'completed' ? 'Chưa hoàn thành nhiệm vụ nào' :
            undefined
          }
        />
      )}

      {/* ── FAB: Add button ───────────────────────────────── */}
      <button
        onClick={() => setShowCreate(true)}
        className={cn(
          'fixed right-4 bottom-24 z-30',
          'flex items-center gap-2 rounded-full px-4 py-3',
          'bg-memoir-500 text-white',
          'shadow-lg shadow-memoir-500/30',
          'hover:bg-memoir-600 hover:shadow-xl hover:shadow-memoir-500/40',
          'active:scale-95 transition-all duration-150',
        )}
        aria-label="Thêm nhiệm vụ"
      >
        <Plus className="h-5 w-5" />
        <span className="text-sm font-semibold">Thêm nhiệm vụ</span>
      </button>

      {/* ── Create dialog ─────────────────────────────────── */}
      {showCreate && (
        <TaskCreateDialog
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          isLoading={createTask.isPending}
        />
      )}

      {/* ── Detail sheet ─────────────────────────────────── */}
      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isUpdating={updateTask.isPending}
          isDeleting={deleteTask.isPending}
        />
      )}
    </div>
  )
}
