import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Star, Trash2, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { walletsApi } from '@/api/wallets'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import type { Wallet, WalletCreateData } from '@/types/wallet'
import { cn } from '@/utils/cn'
import { formatVND } from '@/utils/formatters'

const WALLET_COLORS = [
  '#9333EA', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4',
]

const WALLET_ICONS = ['💰', '🏦', '💳', '🪙', '🏠', '🚗', '✈️', '🎓']

export default function WalletManagement() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)
  const addToast = useUiStore((s) => s.addToast)

  const [showCreate, setShowCreate] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Wallet | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<Wallet | null>(null)

  // Form state
  const [form, setForm] = useState<WalletCreateData>({ name: '', description: '', color: WALLET_COLORS[0], icon: '💰' })
  const [saving, setSaving] = useState(false)

  // Adjust balance state
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustType, setAdjustType] = useState<'increase' | 'decrease'>('increase')
  const [adjusting, setAdjusting] = useState(false)

  const { data: wallets, isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const res = await walletsApi.list()
      if (!res.success) throw new Error(res.message)
      return res.data ?? []
    },
    enabled: !!accessToken,
    staleTime: 10_000,
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  })

  const createMutation = useMutation({
    mutationFn: (data: WalletCreateData) => walletsApi.create(data),
    onSuccess: (res) => {
      if (res.success) {
        addToast('Đã tạo ví mới', 'success')
        queryClient.invalidateQueries({ queryKey: ['wallets'] })
        closeForm()
      } else {
        addToast(res.message || 'Tạo ví thất bại', 'error')
      }
      setSaving(false)
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
      setSaving(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WalletCreateData }) => walletsApi.update(id, data),
    onSuccess: (res) => {
      if (res.success) {
        addToast('Đã cập nhật ví', 'success')
        queryClient.invalidateQueries({ queryKey: ['wallets'] })
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
    mutationFn: (id: string) => walletsApi.delete(id),
    onSuccess: (res) => {
      if (res.success) {
        addToast('Đã xóa ví', 'success')
        queryClient.invalidateQueries({ queryKey: ['wallets'] })
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

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => walletsApi.setDefault(id),
    onSuccess: (res) => {
      if (res.success) {
        addToast('Đã đặt ví mặc định', 'success')
        queryClient.invalidateQueries({ queryKey: ['wallets'] })
      } else {
        addToast(res.message || 'Thất bại', 'error')
      }
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })

  const adjustBalanceMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      walletsApi.adjustBalance(id, amount),
    onSuccess: (res) => {
      if (res.success) {
        addToast(res.message || 'Đã cập nhật số dư', 'success')
        queryClient.invalidateQueries({ queryKey: ['wallets'] })
      } else {
        addToast(res.message || 'Cập nhật thất bại', 'error')
      }
      setAdjusting(false)
      setAdjustTarget(null)
      setAdjustAmount('')
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
      setAdjusting(false)
    },
  })

  function openAdjust(wallet: Wallet) {
    setAdjustTarget(wallet)
    setAdjustAmount('')
    setAdjustType('increase')
  }

  function handleAdjust() {
    const num = parseInt(adjustAmount, 10)
    if (!adjustAmount || isNaN(num) || num <= 0) {
      addToast('Vui lòng nhập số tiền hợp lệ', 'warning')
      return
    }
    const amount = adjustType === 'increase' ? num : -num
    setAdjusting(true)
    adjustBalanceMutation.mutate({ id: adjustTarget!.id, amount })
  }

  function openCreate() {
    setForm({ name: '', description: '', color: WALLET_COLORS[0], icon: '💰' })
    setEditingWallet(null)
    setShowCreate(true)
  }

  function openEdit(wallet: Wallet) {
    setForm({ name: wallet.name, description: wallet.description ?? '', color: wallet.color, icon: wallet.icon })
    setEditingWallet(wallet)
    setShowCreate(true)
  }

  function closeForm() {
    setShowCreate(false)
    setEditingWallet(null)
    setSaving(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      addToast('Vui lòng nhập tên ví', 'warning')
      return
    }
    setSaving(true)
    if (editingWallet) {
      updateMutation.mutate({ id: editingWallet.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isModalOpen = showCreate || !!editingWallet

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
          <h1 className="text-xl font-bold text-gray-900">Quản lý ví</h1>
          <button
            onClick={openCreate}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-memoir-500 px-4 py-2 text-sm font-semibold text-white hover:bg-memoir-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tạo ví
          </button>
        </div>
      </div>

      {/* Wallet list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !wallets?.length ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center px-6">
          <span className="text-5xl">💰</span>
          <p className="font-semibold text-gray-700">Chưa có ví nào</p>
          <p className="text-sm text-gray-400">Tạo ví đầu tiên để bắt đầu ghi nhận chi tiêu</p>
          <Button variant="primary" onClick={openCreate} className="mt-2">
            <Plus className="h-4 w-4" />
            Tạo ví
          </Button>
        </div>
      ) : (
        <div className="space-y-3 px-4 py-4">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm border border-gray-100"
            >
              {/* Color dot */}
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-2xl"
                style={{ backgroundColor: `${wallet.color}15` }}
              >
                {wallet.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{wallet.name}</p>
                  {wallet.is_default && (
                    <span className="rounded-full bg-memoir-50 px-2 py-0.5 text-[10px] font-bold text-memoir-600">
                      Mặc định
                    </span>
                  )}
                </div>
                {wallet.description && (
                  <p className="text-xs text-gray-400 truncate">{wallet.description}</p>
                )}
                <p
                  className="mt-0.5 text-sm font-medium"
                  style={{ color: wallet.color }}
                >
                  {formatVND(wallet.balance)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {!wallet.is_default && (
                  <button
                    onClick={() => setDefaultMutation.mutate(wallet.id)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                      'text-gray-400 hover:bg-yellow-50 hover:text-yellow-600',
                    )}
                    title="Đặt mặc định"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => openAdjust(wallet)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  title="Điều chỉnh số dư"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openEdit(wallet)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  title="Sửa"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {!wallet.is_default && (
                  <button
                    onClick={() => setDeleteTarget(wallet)}
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
        title={editingWallet ? 'Sửa ví' : 'Tạo ví mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên ví"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ví cá nhân, Thẻ tín dụng..."
            autoFocus
          />
          <Input
            label="Mô tả (tùy chọn)"
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Mô tả ngắn..."
          />

          {/* Initial balance — only shown when creating a new wallet */}
          {!editingWallet && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Số dư ban đầu</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.initial_balance ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, initial_balance: e.target.value ? parseInt(e.target.value, 10) : 0 }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-memoir-300"
              />
              <p className="text-[10px] text-gray-400 mt-1">Để 0 nếu bắt đầu từ 0đ</p>
            </div>
          )}

          {/* Icon picker */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500">Biểu tượng</label>
            <div className="flex flex-wrap gap-2">
              {WALLET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all',
                    form.icon === icon
                      ? 'ring-2 ring-offset-2 ring-memoir-500'
                      : 'bg-gray-100 hover:bg-gray-200',
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500">Màu sắc</label>
            <div className="flex flex-wrap gap-2">
              {WALLET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={cn(
                    'h-8 w-8 rounded-full transition-all',
                    form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110',
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
              className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
              style={{ backgroundColor: `${form.color}15` }}
            >
              {form.icon}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{form.name || 'Tên ví'}</p>
              <p className="text-xs text-gray-400">{form.description || 'Không có mô tả'}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeForm}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" className="flex-1" isLoading={saving}>
              {editingWallet ? 'Lưu' : 'Tạo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xóa ví"
      >
        <p className="text-sm text-gray-600 mb-6">
          Bạn có chắc muốn xóa ví <strong className="text-gray-900">{deleteTarget?.name}</strong>? Tất cả giao dịch trong ví này sẽ không bị xóa nhưng sẽ không còn ví để hiển thị.
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

      {/* Adjust Balance Modal */}
      <Modal
        isOpen={!!adjustTarget}
        onClose={() => { setAdjustTarget(null); setAdjustAmount('') }}
        title="Điều chỉnh số dư"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Số dư hiện tại</p>
            <p className="text-lg font-bold" style={{ color: adjustTarget?.color }}>
              {adjustTarget ? formatVND(adjustTarget.balance) : ''}
            </p>
          </div>

          {/* Increase / Decrease toggle */}
          <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setAdjustType('increase')}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                adjustType === 'increase'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Tăng (nạp tiền)
            </button>
            <button
              type="button"
              onClick={() => setAdjustType('decrease')}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                adjustType === 'decrease'
                  ? 'bg-white text-red-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Giảm (rút tiền)
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Số tiền</label>
            <input
              type="number"
              inputMode="numeric"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-memoir-300"
            />
          </div>

          {/* Preview new balance */}
          {adjustAmount && !isNaN(parseInt(adjustAmount, 10)) && (
            <div className="text-center">
              <p className="text-xs text-gray-400">Số dư mới</p>
              <p className={cn(
                'text-lg font-bold',
                adjustType === 'increase' ? 'text-emerald-600' : 'text-red-500',
              )}>
                {adjustTarget
                  ? formatVND(
                      adjustTarget.balance +
                        (adjustType === 'increase' ? parseInt(adjustAmount, 10) : -parseInt(adjustAmount, 10))
                    )
                  : ''}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => { setAdjustTarget(null); setAdjustAmount('') }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              isLoading={adjusting}
              onClick={handleAdjust}
            >
              Xác nhận
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
