import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface UiState {
  isLoading: boolean
  toasts: Toast[]
  isBottomSheetOpen: boolean
  bottomSheetContent: React.ReactNode | null
  setLoading: (loading: boolean) => void
  addToast: (message: string, type?: Toast['type'], duration?: number) => void
  removeToast: (id: string) => void
  openBottomSheet: (content: React.ReactNode) => void
  closeBottomSheet: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  isLoading: false,
  toasts: [],
  isBottomSheetOpen: false,
  bottomSheetContent: null,

  setLoading: (loading) => set({ isLoading: loading }),

  addToast: (message, type = 'info', duration = 4000) => {
    const id = crypto.randomUUID()
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }))

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  openBottomSheet: (content) =>
    set({ isBottomSheetOpen: true, bottomSheetContent: content }),

  closeBottomSheet: () =>
    set({ isBottomSheetOpen: false, bottomSheetContent: null }),
}))
