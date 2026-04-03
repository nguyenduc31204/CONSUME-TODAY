import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Image as ImageIcon, DollarSign, Tag, Calendar, Wallet, AlignLeft, TrendingUp, Download, X, Maximize2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '@/api/transactions'
import { getProxyImageUrl } from '@/utils/imageUrl'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import type { Transaction, TransactionUpdateData } from '@/types/transaction'
import type { WalletSummary, CategorySummary, TransactionEditResponse } from '@/types/upload'
import { formatVND } from '@/utils/formatters'
import { cn } from '@/utils/cn'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ── Edit Mode ─────────────────────────────────────────────────

interface EditFormState {
  amount: string
  merchant_name: string
  wallet_id: string
  category_id: string | null
  note: string
}

interface EditFormProps {
  data: TransactionEditResponse
  transaction: Transaction
  onSave: (data: TransactionUpdateData) => void
  onCancel: () => void
  saving: boolean
}

function EditForm({ data, transaction, onSave, onCancel, saving }: EditFormProps) {
  const [form, setForm] = useState<EditFormState>({
    amount: String(transaction.amount),
    merchant_name: transaction.merchant_name ?? '',
    wallet_id: transaction.wallet_id,
    category_id: transaction.category_id,
    note: transaction.note ?? '',
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      amount: form.amount ? parseInt(form.amount, 10) : undefined,
      merchant_name: form.merchant_name || undefined,
      wallet_id: form.wallet_id,
      category_id: form.category_id || undefined,
      note: form.note || undefined,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Amount */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <DollarSign className="h-3.5 w-3.5" />
          Số tiền
        </label>
        <input
          type="number"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-memoir-300"
          inputMode="numeric"
        />
      </div>

      {/* Merchant */}
      <Input
        label="Cửa hàng"
        value={form.merchant_name}
        onChange={(e) => setForm((f) => ({ ...f, merchant_name: e.target.value }))}
        placeholder="Tên cửa hàng"
      />

      {/* Wallet */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Wallet className="h-3.5 w-3.5" />
          Ví
        </label>
        <select
          value={form.wallet_id}
          onChange={(e) => setForm((f) => ({ ...f, wallet_id: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-memoir-300"
        >
          {data.wallets.map((w: WalletSummary) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Tag className="h-3.5 w-3.5" />
          Danh mục
        </label>
        <div className="flex flex-wrap gap-2">
          {data.categories.map((c: CategorySummary) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, category_id: c.id }))}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                form.category_id === c.id
                  ? 'ring-2 ring-memoir-400 bg-memoir-50 text-memoir-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              <span>{c.emoji}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <AlignLeft className="h-3.5 w-3.5" />
          Ghi chú
        </label>
        <textarea
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          rows={2}
          placeholder="Thêm ghi chú..."
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-memoir-300 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" variant="primary" className="flex-1" isLoading={saving}>
          Lưu thay đổi
        </Button>
      </div>
    </form>
  )
}

// ── Income Form ───────────────────────────────────────────────

interface IncomeFormProps {
  data: TransactionEditResponse
  onSave: (data: { amount: number; wallet_id?: string; note?: string }) => void
  onCancel: () => void
  saving: boolean
}

function IncomeForm({ data, onSave, onCancel, saving }: IncomeFormProps) {
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState(data.wallets[0]?.id ?? '')
  const [note, setNote] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(amount, 10)
    if (!amount || isNaN(num) || num <= 0) return
    onSave({ amount: num, wallet_id: walletId, note: note || undefined })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-500 mb-3">Nhận tiền vào ví</p>
      </div>

      {/* Wallet */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Wallet className="h-3.5 w-3.5" />
          Nhận vào ví
        </label>
        <select
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          {data.wallets.map((w: WalletSummary) => (
            <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <TrendingUp className="h-3.5 w-3.5" />
          Số tiền nhận được
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xl font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>

      {/* Note */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <AlignLeft className="h-3.5 w-3.5" />
          Ghi chú (tùy chọn)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Lương, thưởng, chuyển khoản..."
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-emerald-500 hover:bg-emerald-600"
          isLoading={saving}
        >
          <TrendingUp className="h-4 w-4" />
          Xác nhận thu nhập
        </Button>
      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)
  const addToast = useUiStore((s) => s.addToast)

  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const handleDownload = async () => {
    if (!id) return
    const token = useAuthStore.getState().accessToken
    if (!token) { addToast('Vui lòng đăng nhập', 'warning'); return }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/transactions/${id}/download`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `memoir-${id}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      addToast('Không thể tải ảnh', 'error')
    }
  }

  const { data: editData, isLoading: isLoadingEdit } = useQuery<TransactionEditResponse, Error, TransactionEditResponse>({
    queryKey: ['transaction-edit', id],
    queryFn: async () => {
      const res = await transactionsApi.getForEdit(id!)
      if (!res.success || !res.data) throw new Error(res.message)
      return res.data
    },
    enabled: !!accessToken && !!id,
  })

  const transaction: Transaction | undefined = editData?.transaction

  const updateMutation = useMutation({
    mutationFn: ({ data }: { id: string; data: TransactionUpdateData }) => transactionsApi.update(id!, data),
    onSuccess: (res) => {
      if (res.success) {
        addToast('Đã cập nhật giao dịch', 'success')
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['transaction-edit', id] })
        queryClient.invalidateQueries({ queryKey: ['wallets'] })
        setIsEditing(false)
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
    mutationFn: () => transactionsApi.delete(id!),
    onSuccess: (res) => {
      if (res.success) {
        addToast('Đã xóa giao dịch', 'success')
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        navigate(-1)
      } else {
        addToast(res.message || 'Xóa thất bại', 'error')
      }
      setShowDeleteConfirm(false)
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
      setShowDeleteConfirm(false)
    },
  })

  const addIncomeMutation = useMutation({
    mutationFn: (data: { amount: number; wallet_id?: string; note?: string }) =>
      transactionsApi.addIncome(id!, data),
    onSuccess: (res) => {
      if (res.success) {
        addToast(res.message || 'Đã ghi nhận thu nhập!', 'success')
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['transaction-edit', id] })
        queryClient.invalidateQueries({ queryKey: ['wallets'] })
        setShowIncomeForm(false)
      } else {
        addToast(res.message || 'Thất bại', 'error')
      }
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })

  function handleSave(data: TransactionUpdateData) {
    setSaving(true)
    updateMutation.mutate({ id: id!, data })
  }

  if (isLoadingEdit) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center px-6">
        <p className="text-gray-500">Không tìm thấy giao dịch</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Quay lại</Button>
      </div>
    )
  }

  const imageUrl = getProxyImageUrl(transaction.image_url ?? transaction.thumbnail_url)

  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-cream border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Chi tiết</h1>
          {!isEditing && (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Sửa"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Xóa"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing && editData ? (
        /* ── Edit mode ──────────────────────────────── */
        <div className="px-4 py-4">
          <EditForm
            data={editData}
            transaction={transaction}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
            saving={saving}
          />
        </div>
      ) : (
        /* ── View mode ──────────────────────────────── */
        <div className="pb-8">
          {/* Hero image — full ratio, no crop */}
          {imageUrl ? (
            <div className="relative w-full">
              {/* Image: keep original aspect ratio, show full height */}
              <div
                className="relative w-full bg-gray-100 cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
                style={{ maxHeight: '70vh' }}
              >
                <img
                  src={imageUrl}
                  alt={transaction.merchant_name ?? 'Ảnh kỷ niệm'}
                  className="max-h-[70vh] w-full object-contain"
                />
                {transaction.is_life_log && (
                  <div className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white uppercase tracking-wide">
                    Life Log
                  </div>
                )}
              </div>

              {/* Action buttons overlay */}
              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
                  title="Lưu ảnh"
                  aria-label="Lưu ảnh"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
                  title="Phóng to"
                  aria-label="Phóng to"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-gray-100">
              <ImageIcon className="h-12 w-12 text-gray-300" />
            </div>
          )}

          <div className="px-4 py-5 space-y-5">
            {/* Merchant + Amount */}
            <div className="text-center">
              {transaction.merchant_name ? (
                <h2 className="text-2xl font-bold text-gray-900">{transaction.merchant_name}</h2>
              ) : (
                <h2 className="text-xl font-semibold text-gray-400 italic">Kỷ niệm</h2>
              )}
              <p
                className={cn(
                  'mt-2 text-4xl font-bold',
                  transaction.is_life_log ? 'text-gray-300' : 'text-gray-900',
                )}
              >
                {transaction.is_life_log ? '—' : formatVND(transaction.amount)}
              </p>
            </div>

            {/* Info fields */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {/* Category */}
              {transaction.category_id && (
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                    <Tag className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Danh mục</p>
                    <p className="font-medium text-gray-900">
                      {editData?.categories.find((c) => c.id === transaction.category_id)?.name ?? transaction.category_id}
                    </p>
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                  <Calendar className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ngày</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(transaction.transaction_date)}
                  </p>
                </div>
              </div>

              {/* Wallet */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                  <Wallet className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ví</p>
                  <p className="font-medium text-gray-900">
                    {editData?.wallets.find((w) => w.id === transaction.wallet_id)?.name ?? transaction.wallet_id}
                  </p>
                </div>
              </div>

              {/* Note */}
              {transaction.note && (
                <div className="flex items-start gap-4 px-5 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 flex-shrink-0 mt-0.5">
                    <AlignLeft className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Ghi chú</p>
                    <p className="font-medium text-gray-900">{transaction.note}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Life log → expense or income */}
            {transaction.is_life_log && (
              <div className="space-y-3">
                {/* Expense */}
                <div className="rounded-2xl bg-memoir-50 border border-memoir-200 p-5">
                  <p className="text-sm font-semibold text-memoir-700 mb-1">Chi tiêu</p>
                  <p className="text-xs text-memoir-500 mb-3">Ghi nhận khoản chi cho kỷ niệm này.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <DollarSign className="h-4 w-4" />
                    Thêm chi phí
                  </Button>
                </div>

                {/* Income */}
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
                  <p className="text-sm font-semibold text-emerald-700 mb-1">Thu nhập</p>
                  <p className="text-xs text-emerald-500 mb-3">Nhận lương, thưởng, chuyển khoản... vào ví.</p>
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600"
                    size="sm"
                    onClick={() => setShowIncomeForm(true)}
                  >
                    <TrendingUp className="h-4 w-4" />
                    Nhận tiền
                  </Button>
                </div>
              </div>
            )}

            {/* Income form overlay */}
            {showIncomeForm && editData && (
              <div className="rounded-2xl bg-white border border-emerald-200 p-5 shadow-sm">
                <IncomeForm
                  data={editData}
                  onSave={(data) => {
                    addIncomeMutation.mutate(data)
                  }}
                  onCancel={() => setShowIncomeForm(false)}
                  saving={addIncomeMutation.isPending}
                />
              </div>
            )}

            {/* Metadata */}
            <div className="text-center text-xs text-gray-300">
              Tạo lúc {formatDate(transaction.created_at)}
              {transaction.ocr_confidence > 0 && (
                <span className="ml-2">
                  · Độ chính xác OCR: {Math.round(transaction.ocr_confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox — fullscreen image viewer */}
      {lightboxOpen && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxOpen(false)}
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-white text-sm font-medium backdrop-blur-sm hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
          >
            <Download className="h-4 w-4" />
            Lưu ảnh về máy
          </button>

          <img
            src={imageUrl}
            alt={transaction.merchant_name ?? 'Ảnh kỷ niệm'}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete confirm */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Xóa giao dịch"
      >
        <p className="text-sm text-gray-600 mb-6">
          Bạn có chắc muốn xóa giao dịch này? Hành động này không thể hoàn tác.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            Xóa
          </Button>
        </div>
      </Modal>
    </div>
  )
}
