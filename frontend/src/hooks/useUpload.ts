/**
 * useUpload — React Query mutation + upload store orchestration.
 * Wraps the camera → upload → OCR → auto-save flow.
 */
import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUploadStore } from '@/stores/uploadStore'
import { useUiStore } from '@/stores/uiStore'
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
      await transactionsApi.confirm(state.data.transaction_id)
      store.setDone(state.data)
      addToast('Đã lưu kỷ niệm!', 'success')
      // Refresh the transactions list
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
    } catch {
      store.setError('Lưu thất bại')
      addToast('Lưu thất bại', 'error')
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
