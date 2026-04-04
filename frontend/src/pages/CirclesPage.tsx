/**
 * CirclesPage — Grid of user's Circles + Create button.
 * Route: /circles
 */

import { useState } from 'react'
import { Plus, Users, Lock } from 'lucide-react'
import { useCircles, useCreateCircle } from '@/hooks/useCircles'
import { CircleCard } from '@/components/circles/CircleCard'
import { CreateCircleSheet } from '@/components/circles/CreateCircleSheet'
import type { CreateCircleData } from '@/api/circles'
import { cn } from '@/utils/cn'

// ── Skeleton ──────────────────────────────────────────────────

function CircleCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
      <div className="h-36 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
        <div className="h-3 w-1/3 rounded bg-gray-100" />
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────

function CirclesEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center px-4">
      {/* Illustration */}
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-memoir-50">
          <Users className="h-12 w-12 text-memoir-200" />
        </div>
        <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-memoir-500 shadow-lg shadow-memoir-500/30">
          <Plus className="h-5 w-5 text-white" />
        </div>
      </div>

      <div>
        <p className="text-lg font-bold text-gray-800">Chưa có nhóm kỷ niệm nào</p>
        <p className="mt-1.5 text-sm text-gray-400 max-w-xs">
          Tạo nhóm để chia sẻ kỷ niệm với gia đình, bạn bè — hoặc giữ riêng tư cho bạn
        </p>
      </div>

      <button
        onClick={onAdd}
        className={cn(
          'flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold',
          'bg-memoir-500 text-white hover:bg-memoir-600 active:scale-95',
          'shadow-md shadow-memoir-500/20 transition-all',
        )}
      >
        <Plus className="h-4 w-4" />
        Tạo nhóm đầu tiên
      </button>

      {/* Free tier hint */}
      <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1.5">
        <Lock className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-xs text-amber-600 font-medium">
          Miễn phí: tối đa 3 nhóm
        </p>
      </div>
    </div>
  )
}

// ── CirclesPage ────────────────────────────────────────────────

export default function CirclesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useCircles()
  const createCircle = useCreateCircle()

  const circles = data?.items ?? []

  const handleCreate = async (formData: CreateCircleData) => {
    await createCircle.mutateAsync(formData)
    setShowCreate(false)
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur-sm border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nhóm kỷ niệm</h1>
            {circles.length > 0 && (
              <p className="mt-0.5 text-xs text-gray-400">
                {circles.length} nhóm
              </p>
            )}
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowCreate(true)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all',
              'bg-memoir-500 text-white hover:bg-memoir-600 active:scale-95',
              'shadow-md shadow-memoir-500/25',
            )}
          >
            <Plus className="h-4 w-4" />
            Tạo nhóm
          </button>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────── */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <CircleCardSkeleton key={i} />
            ))}
          </div>
        ) : circles.length === 0 ? (
          <CirclesEmpty onAdd={() => setShowCreate(true)} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {circles.map((circle) => (
              <CircleCard key={circle.id} circle={circle} />
            ))}
          </div>
        )}
      </div>

      {/* ── Create sheet ────────────────────────────────────── */}
      {showCreate && (
        <CreateCircleSheet
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          isLoading={createCircle.isPending}
        />
      )}
    </div>
  )
}
