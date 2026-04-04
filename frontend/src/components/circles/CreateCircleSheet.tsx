/**
 * CreateCircleSheet — Modal tạo Circle mới.
 * Fields: name, description, type, visibility, max_members.
 */

import { useState } from 'react'
import { X, Users, Lock, Link2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { CreateCircleData } from '@/api/circles'

// ── Type options ─────────────────────────────────────────────

const CIRCLE_TYPES = [
  {
    value: 'private' as const,
    label: 'Riêng tư',
    icon: Lock,
    desc: 'Chỉ thành viên nhóm mới thấy',
  },
  {
    value: 'family' as const,
    label: 'Gia đình',
    icon: Users,
    desc: 'Dành cho gia đình và người thân',
  },
  {
    value: 'friends' as const,
    label: 'Bạn bè',
    icon: Users,
    desc: 'Chia sẻ kỷ niệm với bạn bè',
  },
]

const VISIBILITIES = [
  {
    value: 'members_only' as const,
    label: 'Riêng tư',
    icon: Lock,
    desc: 'Chỉ thành viên',
  },
  {
    value: 'link_shared' as const,
    label: 'Chia sẻ link',
    icon: Link2,
    desc: 'Ai có link đều xem được',
  },
]

// ── Props ────────────────────────────────────────────────────

interface CreateCircleSheetProps {
  onClose: () => void
  onSubmit: (data: CreateCircleData) => void
  isLoading?: boolean
}

// ── Sheet ───────────────────────────────────────────────────

export function CreateCircleSheet({ onClose, onSubmit, isLoading }: CreateCircleSheetProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [circleType, setCircleType] = useState<CreateCircleData['circle_type']>('private')
  const [visibility, setVisibility] = useState<CreateCircleData['visibility']>('members_only')
  const [maxMembers, setMaxMembers] = useState(10)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrors({ name: 'Tên nhóm không được để trống' })
      return
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      circle_type: circleType,
      visibility,
      max_members: maxMembers,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Tạo nhóm kỷ niệm</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Tên nhóm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors({}) }}
              placeholder="Ví dụ: Gia đình Nguyễn"
              maxLength={100}
              autoFocus
              className={cn(
                'w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm text-gray-900',
                'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400',
                errors.name ? 'border-red-400' : 'border-gray-200',
              )}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu ngắn về nhóm..."
              rows={2}
              maxLength={500}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400 resize-none"
            />
          </div>

          {/* Circle type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Loại nhóm</label>
            <div className="grid grid-cols-3 gap-2">
              {CIRCLE_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCircleType(value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all',
                    circleType === value
                      ? 'border-memoir-400 bg-memoir-50 ring-2 ring-memoir-400'
                      : 'border-gray-200 hover:border-gray-300 bg-white',
                  )}
                >
                  <Icon className={cn('h-5 w-5', circleType === value ? 'text-memoir-500' : 'text-gray-400')} />
                  <span className={cn('text-xs font-semibold', circleType === value ? 'text-memoir-700' : 'text-gray-600')}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Quyền xem</label>
            <div className="grid grid-cols-2 gap-2">
              {VISIBILITIES.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVisibility(value)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-3 transition-all',
                    visibility === value
                      ? 'border-memoir-400 bg-memoir-50 ring-2 ring-memoir-400'
                      : 'border-gray-200 hover:border-gray-300 bg-white',
                  )}
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0', visibility === value ? 'text-memoir-500' : 'text-gray-400')} />
                  <div className="text-left">
                    <p className={cn('text-xs font-semibold', visibility === value ? 'text-memoir-700' : 'text-gray-600')}>{label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Max members */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Số thành viên tối đa: <span className="text-memoir-600">{maxMembers}</span>
            </label>
            <input
              type="range"
              min={2}
              max={50}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="w-full accent-memoir-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>2</span><span>50</span>
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
              disabled={isLoading || !name.trim()}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all',
                name.trim() ? 'bg-memoir-500 text-white hover:bg-memoir-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              {isLoading ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
