import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '@/api/categories'
import type { CategoryCreateData, CategoryUpdateData } from '@/types/category'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'

/** Hook: List categories */
export function useCategories(walletId?: string) {
  return useQuery({
    queryKey: ['categories', walletId],
    queryFn: async () => {
      const response = await categoriesApi.list(walletId)
      if (!response.success) throw new Error(response.message)
      return response.data
    },
    enabled: false,
  })
}

/** Hook: Create category */
export function useCreateCategory() {
  const queryClient = useQueryClient()
  const addToast = useUiStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (data: CategoryCreateData) => {
      if (!useAuthStore.getState().accessToken) throw new Error('Vui lòng đăng nhập')
      return categoriesApi.create(data)
    },
    onSuccess: (response) => {
      if (response.success) {
        addToast('Đã tạo danh mục mới', 'success')
        queryClient.invalidateQueries({ queryKey: ['categories'] })
      } else {
        addToast(response.message || 'Tạo danh mục thất bại', 'error')
      }
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

/** Hook: Update category */
export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const addToast = useUiStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryUpdateData }) => {
      if (!useAuthStore.getState().accessToken) throw new Error('Vui lòng đăng nhập')
      return categoriesApi.update(id, data)
    },
    onSuccess: (response) => {
      if (response.success) {
        addToast('Đã cập nhật danh mục', 'success')
        queryClient.invalidateQueries({ queryKey: ['categories'] })
      } else {
        addToast(response.message, 'error')
      }
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
