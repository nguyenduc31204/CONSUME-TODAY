/**
 * useUpload — React Query mutation + upload store orchestration.
 * Wraps the camera → upload → OCR → auto-save flow.
 */
import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUploadStore } from '@/stores/uploadStore'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { transactionsApi } from '@/api/transactions'
import type { UploadTransactionResponse } from '@/types/upload'

export function useUpload() {
  const store = useUploadStore()
  const addToast = useUiStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      file,
      walletId,
    }: {
      file: File
      walletId?: string
    }): Promise<UploadTransactionResponse> => {
      if (!useAuthStore.getState().accessToken) {
        throw new Error('Vui lòng đăng nhập để chụp ảnh')
      }
      store.startUpload(file)
      const res = await transactionsApi.upload(file, walletId)
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Upload failed')
      }
      return res.data
    },

    onSuccess: (data: UploadTransactionResponse) => {
      store.setPreview(data, (useUploadStore.getState().state as { file: File }).file)
      // Auto-save is handled by CardPopup countdown
      // Invalidate both transactions and reports so Home/Journal/Reports all refresh
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },

    onError: (error: Error) => {
      store.setError(error.message)
      addToast(error.message || 'Xử lý ảnh thất bại', 'error')
    },
  })

  const triggerUpload = useCallback(
    (file: File, walletId?: string) => {
      mutation.mutate({ file, walletId })
    },
    [mutation],
  )

  const confirmUpload = useCallback(async () => {
    const state = useUploadStore.getState().state
    if (state.phase !== 'preview') return

    store.startSaving(state.data)
    try {
      const res = await transactionsApi.confirm(state.data.transaction_id)
      if (!res.success) {
        throw new Error(res.message || 'Xác nhận thất bại')
      }
      store.setDone(state.data)
      addToast('Đã lưu kỷ niệm!', 'success')
      // Refresh transactions, reports and wallets
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
      await queryClient.invalidateQueries({ queryKey: ['wallets'] })
      await queryClient.invalidateQueries({ queryKey: ['wallets'] })
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Lưu thất bại')
      addToast(err instanceof Error ? err.message : 'Lưu thất bại', 'error')
    }
  }, [store, addToast, queryClient])

  const resetUpload = useCallback(() => {
    store.reset()
  }, [store])

  const startEditing = useCallback(() => {
    store.startEditing()
  }, [store])

  return {
    triggerUpload,
    confirmUpload,
    startEditing,
    resetUpload,
    state: store.state,
    mutation,
  }
}
