import { create } from 'zustand'
import type { UploadState, UploadTransactionResponse } from '@/types/upload'

interface UploadStore {
  state: UploadState

  /** Start compression (image is being processed before upload) */
  startCompressing: (file: File) => void

  /** Start upload: user selected a file */
  startUpload: (file: File) => void

  /** Transition to preview (backend returned OCR result) */
  setPreview: (data: UploadTransactionResponse, file: File) => void

  /** User tapped card → open edit mode */
  startEditing: () => void

  /** Exit edit mode → return to preview */
  stopEditing: () => void

  /** Transition to saving (user confirmed or auto-saved) */
  startSaving: (data: UploadTransactionResponse) => void

  /** Upload completed successfully */
  setDone: (data: UploadTransactionResponse) => void

  /** Upload failed */
  setError: (message: string) => void

  /** Reset to idle */
  reset: () => void
}

export const useUploadStore = create<UploadStore>((set) => ({
  state: { phase: 'idle' },

  startCompressing: (file) => set({ state: { phase: 'compressing', file } }),

  startUpload: (file) => set({ state: { phase: 'uploading', file } }),

  setPreview: (data, file) => set({ state: { phase: 'preview', data, file } }),

  startEditing: () => {
    set((s) => {
      if (s.state.phase === 'preview') {
        return { state: { ...s.state, phase: 'editing' } }
      }
      return s
    })
  },

  stopEditing: () => {
    set((s) => {
      if (s.state.phase === 'editing') {
        return { state: { ...s.state, phase: 'preview' } }
      }
      return s
    })
  },

  startSaving: (data) => set({ state: { phase: 'saving', data } }),

  setDone: (data) => set({ state: { phase: 'done', data } }),

  setError: (message) => set({ state: { phase: 'error', message } }),

  reset: () => set({ state: { phase: 'idle' } }),
}))
