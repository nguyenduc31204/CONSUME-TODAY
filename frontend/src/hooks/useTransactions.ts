import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '@/api/transactions'
import type { TransactionListParams, TransactionUpdateData } from '@/types/transaction'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'

/** Hook: List transactions with filters */
export function useTransactions(params?: TransactionListParams) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const response = await transactionsApi.list(params)
      if (!response.success) throw new Error(response.message)
      return response.data
    },
    enabled: false, // Will be enabled when auth is implemented in Phase 2
  })
}

/** Hook: Get single transaction */
export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      if (!id) throw new Error('No transaction ID')
      const response = await transactionsApi.get(id)
      if (!response.success) throw new Error(response.message)
      return response.data
    },
    enabled: false,
  })
}

/** Hook: Upload image and create transaction via AI OCR */
export function useUploadTransaction() {
  const queryClient = useQueryClient()
  const addToast = useUiStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ file, walletId }: { file: File; walletId?: string }) => {
      if (!useAuthStore.getState().accessToken) throw new Error('Vui lòng đăng nhập')
      const response = await transactionsApi.upload(file, walletId)
      if (!response.success) throw new Error(response.message)
      return response.data
    },
    onSuccess: () => {
      addToast('Giao dịch đã được lưu!', 'success')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

/** Hook: Update transaction */
export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  const addToast = useUiStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransactionUpdateData }) => {
      if (!useAuthStore.getState().accessToken) throw new Error('Vui lòng đăng nhập')
      return transactionsApi.update(id, data)
    },
    onSuccess: (response, _vars) => {
      if (response.success) {
        addToast('Đã cập nhật giao dịch', 'success')
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      } else {
        addToast(response.message || 'Cập nhật thất bại', 'error')
      }
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

/** Hook: Delete transaction */
export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  const addToast = useUiStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      if (!useAuthStore.getState().accessToken) throw new Error('Vui lòng đăng nhập')
      return transactionsApi.delete(id)
    },
    onSuccess: (response) => {
      if (response.success) {
        addToast('Đã xóa giao dịch', 'success')
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      } else {
        addToast(response.message || 'Xóa thất bại', 'error')
      }
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
