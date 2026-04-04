/**
 * CircleSettings — Settings tab for a Circle (owner only).
 * Allows editing name, description, visibility, cover image.
 */

import { useState } from 'react'
import { X, Trash2, AlertTriangle, Lock, Link2, Camera } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useUpdateCircle, useDeleteCircle } from '@/hooks/useCircles'
import { CoverUploadSheet } from './CoverUploadSheet'
import type { CircleDetailData, UpdateCircleData } from '@/api/circles'
import { getProxyImageUrl } from '@/utils/imageUrl'

// ── Visibility options ────────────────────────────────────────

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

// ── CircleSettings ────────────────────────────────────────────

interface CircleSettingsProps {
  circle: CircleDetailData['circle']
  onClose: () => void
  onDeleted: () => void
}

export function CircleSettings({ circle, onClose, onDeleted }: CircleSettingsProps) {
  const [name, setName] = useState(circle.name)
  const [description, setDescription] = useState(circle.description ?? '')
  const [visibility, setVisibility] = useState<CircleDetailData['circle']['visibility']>(circle.visibility)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCoverUpload, setShowCoverUpload] = useState(false)
  const [coverUrl, setCoverUrl] = useState(circle.cover_image_url)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateCircle = useUpdateCircle()
  const deleteCircle = useDeleteCircle()

  const handleSave = async () => {
    if (!name.trim()) {
      setErrors({ name: 'Tên nhóm không được để trống' })
      return
    }
    const data: UpdateCircleData = {
      name: name.trim(),
      description: description.trim() || null,
      visibility,
    }
    await updateCircle.mutateAsync({ id: circle.id, data })
    onClose()
  }

  const handleDelete = async () => {
    await deleteCircle.mutateAsync(circle.id)
    onDeleted()
  }

  const handleCoverUploaded = async (url: string) => {
    const data: UpdateCircleData = { cover_image_url: url || null }
    await updateCircle.mutateAsync({ id: circle.id, data })
    setCoverUrl(url || null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Cài đặt nhóm</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors" aria-label="Đóng">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Cover image */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ảnh bìa</label>
            <button
              onClick={() => setShowCoverUpload(true)}
              className={cn(
                'relative w-full h-24 rounded-xl overflow-hidden',
                'border-2 border-dashed border-gray-200',
                'flex items-center justify-center gap-2',
                'hover:border-memoir-300 hover:bg-memoir-50/30 transition-all cursor-pointer',
              )}
            >
              {coverUrl ? (
                <img
                  src={getProxyImageUrl(coverUrl)}
                  alt="Ảnh bìa"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">Thêm ảnh bìa</span>
                </div>
              )}
              {coverUrl && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-lg">
                    Đổi ảnh bìa
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Tên nhóm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors({}) }}
              maxLength={100}
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
              rows={2}
              maxLength={500}
              placeholder="Giới thiệu ngắn về nhóm..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memoir-400 resize-none"
            />
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

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={updateCircle.isPending}
            className={cn(
              'w-full rounded-xl py-2.5 text-sm font-semibold transition-all',
              'bg-memoir-500 text-white hover:bg-memoir-600 active:scale-[0.98]',
              updateCircle.isPending && 'opacity-60 cursor-not-allowed',
            )}
          >
            {updateCircle.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>

          {/* Delete danger zone */}
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Xóa nhóm vĩnh viễn</p>
                <p className="mt-0.5 text-xs text-red-400">
                  Tất cả ảnh, bài viết và thành viên sẽ bị xóa. Hành động này không thể hoàn tác.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa nhóm
                  </button>
                ) : (
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleteCircle.isPending}
                      className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                    >
                      {deleteCircle.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cover upload sheet */}
      {showCoverUpload && (
        <CoverUploadSheet
          circleName={circle.name}
          currentCoverUrl={coverUrl}
          onClose={() => setShowCoverUpload(false)}
          onUploaded={handleCoverUploaded}
        />
      )}
    </div>
  )
}
