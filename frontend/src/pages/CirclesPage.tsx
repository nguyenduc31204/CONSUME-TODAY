/**
 * CirclesPage — Grid of user's Circles + Create button + Join by code.
 * Route: /circles
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Lock, Link2, X, CheckCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useCircles, useCreateCircle, useJoinCircleByCode } from '@/hooks/useCircles'
import { CircleCard } from '@/components/circles/CircleCard'
import { CreateCircleSheet } from '@/components/circles/CreateCircleSheet'
import type { CreateCircleData } from '@/api/circles'

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

function CirclesEmpty({ onAdd, onJoin }: { onAdd: () => void; onJoin: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center px-4">
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

      <div className="flex gap-3">
        <button
          onClick={onJoin}
          className={cn(
            'flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all',
            'border border-memoir-200 text-memoir-600 hover:bg-memoir-50 active:scale-95',
          )}
        >
          <Link2 className="h-4 w-4" />
          Tham gia nhóm
        </button>
        <button
          onClick={onAdd}
          className={cn(
            'flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold',
            'bg-memoir-500 text-white hover:bg-memoir-600 active:scale-95',
            'shadow-md shadow-memoir-500/20 transition-all',
          )}
        >
          <Plus className="h-4 w-4" />
          Tạo nhóm
        </button>
      </div>

      <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1.5">
        <Lock className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-xs text-amber-600 font-medium">
          Miễn phí: tối đa 3 nhóm
        </p>
      </div>
    </div>
  )
}

// ── Join by Code Sheet ──────────────────────────────────────────

function JoinByCodeSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const joinCircle = useJoinCircleByCode()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 6) {
      setError('Mã mời gồm 6 ký tự')
      return
    }
    setError('')
    try {
      const result = await joinCircle.mutateAsync(trimmed)
      if (!result) return
      if (result.approved) {
        onClose()
        navigate(`/circles/${result.circle_id}`)
      } else {
        setSubmitted(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mã không hợp lệ')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Nhập mã tham gia</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                  <CheckCircle className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Yêu cầu đã gửi!</p>
                  <p className="mt-1 text-xs text-gray-400">Trưởng nhóm sẽ duyệt trong ít phút.</p>
                </div>
              </div>
            ) : (
              <>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mã mời</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="VD: ABC123"
                  maxLength={6}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-center font-mono text-xl font-bold tracking-widest',
                    'focus:outline-none focus:ring-2 focus:ring-memoir-400 transition-all',
                    error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50',
                  )}
                  autoFocus
                />
                {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
              </>
            )}
          </div>
          {submitted ? (
            <button
              onClick={onClose}
              className="w-full rounded-xl py-3 text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              Đóng
            </button>
          ) : (
            <button
              type="submit"
              disabled={joinCircle.isPending || code.trim().length !== 6}
              className={cn(
                'w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-95',
                code.trim().length === 6
                  ? 'bg-memoir-500 text-white hover:bg-memoir-600 shadow-md shadow-memoir-500/25'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              {joinCircle.isPending ? 'Đang tham gia...' : 'Tham gia nhóm'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

// ── CirclesPage ────────────────────────────────────────────────

export default function CirclesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
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
              <p className="mt-0.5 text-xs text-gray-400">{circles.length} nhóm</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Join by code */}
            <button
              onClick={() => setShowJoin(true)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all',
                'border border-memoir-200 text-memoir-600 hover:bg-memoir-50 active:scale-95',
              )}
            >
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Tham gia</span>
            </button>

            {/* Create */}
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
          <CirclesEmpty onAdd={() => setShowCreate(true)} onJoin={() => setShowJoin(true)} />
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

      {/* ── Join by code sheet ──────────────────────────────── */}
      {showJoin && <JoinByCodeSheet onClose={() => setShowJoin(false)} />}
    </div>
  )
}
