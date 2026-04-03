import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '@/api/categories'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import type { Category, CategoryCreateData } from '@/types/category'
import { cn } from '@/utils/cn'

const CATEGORY_COLORS = [
  '#9333EA', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4', '#64748B',
]

const CATEGORY_EMOJIS = [
  '🍜', '🛍️', '🚗', '🎬', '🏠', '💊', '✈️', '📚',
  '🎓', '🎁', '💇', '🏋️', '🎮', '☕', '🍺', '🎵',
]

export default function CategoryManagement() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)
  const addToast = useUiStore((s) => s.addToast)

  const [showCreate, setShowCreate] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  // Form state
  const [form, setForm] = useState<CategoryCreateData>({
    name: '',
    emoji: '🍜',
    color: CATEGORY_COLORS[0],
  })
  const [saving, setSaving] = useState(false)

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesApi.list()
      if (!res.success) throw new Error(res.message)
      return res.data ?? []
    },
    enabled: !!accessToken,
  })

  const createMutation = useMutation({
    mutationFn: (data: CategoryCreateData) => categoriesApi.create(data),
    onSuccess: (res) => {
      if (res.success) {
        addToast('Đã tạo danh mục', 'success')
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        closeForm()
      } else {
        addToast(res.message || 'Tạo thất bại', 'error')
      }
      setSaving(false)
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
      setSaving(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryCreateData }) => categoriesApi.update(id, data),
    onSuccess: (res) => {
      if (res.success) {
        addToast('Đã cập nhật danh mục', 'success')
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        closeForm()
      } else {
        addToast(res.message || 'Cập nhật thất bại', 'error')
      }
      setSaving(false)
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
      setSaving(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: (res) => {
      if (res.success) {
        addToast('Đã xóa danh mục', 'success')
        queryClient.invalidateQueries({ queryKey: ['categories'] })
      } else {
        addToast(res.message || 'Xóa thất bại', 'error')
      }
      setDeleteTarget(null)
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
      setDeleteTarget(null)
    },
  })

  function openCreate() {
    setForm({ name: '', emoji: '🍜', color: CATEGORY_COLORS[0] })
    setEditingCategory(null)
    setShowCreate(true)
  }

  function openEdit(category: Category) {
    setForm({
      name: category.name,
      emoji: category.emoji,
      color: category.color,
    })
    setEditingCategory(category)
    setShowCreate(true)
  }

  function closeForm() {
    setShowCreate(false)
    setEditingCategory(null)
    setSaving(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      addToast('Vui lòng nhập tên danh mục', 'warning')
      return
    }
    setSaving(true)
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isModalOpen = showCreate || !!editingCategory

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cream border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Danh mục</h1>
          <button
            onClick={openCreate}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-memoir-500 px-4 py-2 text-sm font-semibold text-white hover:bg-memoir-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tạo mới
          </button>
        </div>
      </div>

      {/* Category list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !categories?.length ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center px-6">
          <span className="text-5xl">🏷️</span>
          <p className="font-semibold text-gray-700">Chưa có danh mục nào</p>
          <p className="text-sm text-gray-400">Tạo danh mục để phân loại chi tiêu của bạn</p>
          <Button variant="primary" onClick={openCreate} className="mt-2">
            <Plus className="h-4 w-4" />
            Tạo danh mục
          </Button>
        </div>
      ) : (
        <div className="space-y-2 px-4 py-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm border border-gray-100"
            >
              {/* Emoji badge */}
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-xl"
                style={{ backgroundColor: `${category.color}15` }}
              >
                {category.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{category.name}</p>
                  {category.is_default && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      Mặc định
                    </span>
                  )}
                  {!category.is_active && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">
                      Đã ẩn
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(category)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  title="Sửa"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {!category.is_default && (
                  <button
                    onClick={() => setDeleteTarget(category)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeForm}
        title={editingCategory ? 'Sửa danh mục' : 'Tạo danh mục mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên danh mục"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ăn uống, Mua sắm, Di chuyển..."
            autoFocus
          />

          {/* Emoji picker */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500">Biểu tượng</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, emoji }))}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all',
                    form.emoji === emoji
                      ? 'ring-2 ring-memoir-500 bg-memoir-50'
                      : 'bg-gray-100 hover:bg-gray-200',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500">Màu sắc</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={cn(
                    'h-7 w-7 rounded-full transition-all',
                    form.color === color
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: `${form.color}15` }}
            >
              {form.emoji}
            </div>
            <p className="font-semibold text-gray-900">{form.name || 'Tên danh mục'}</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeForm}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" className="flex-1" isLoading={saving}>
              {editingCategory ? 'Lưu' : 'Tạo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xóa danh mục"
      >
        <p className="text-sm text-gray-600 mb-6">
          Bạn có chắc muốn xóa danh mục <strong className="text-gray-900">{deleteTarget?.name}</strong>? Giao dịch đã phân loại sẽ không bị xóa.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Xóa
          </Button>
        </div>
      </Modal>
    </div>
  )
}
