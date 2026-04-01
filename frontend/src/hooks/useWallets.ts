import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { walletsApi } from '@/api/wallets'
import type { WalletCreateData, WalletUpdateData } from '@/types/wallet'
import { useUiStore } from '@/stores/uiStore'

/** Hook: List wallets */
export function useWallets() {
  return useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const response = await walletsApi.list()
      if (!response.success) throw new Error(response.message)
      return response.data
    },
    enabled: false, // Enable when auth is ready
  })
}

/** Hook: Get single wallet */
export function useWallet(id: string | null) {
  return useQuery({
    queryKey: ['wallet', id],
    queryFn: async () => {
      if (!id) throw new Error('No wallet ID')
      const response = await walletsApi.get(id)
      if (!response.success) throw new Error(response.message)
      return response.data
    },
    enabled: false,
  })
}

/** Hook: Create wallet */
export function useCreateWallet() {
  const queryClient = useQueryClient()
  const addToast = useUiStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (data: WalletCreateData) => walletsApi.create(data),
    onSuccess: (response) => {
      if (response.success) {
        addToast('Đã tạo ví mới', 'success')
        queryClient.invalidateQueries({ queryKey: ['wallets'] })
      } else {
        addToast(response.message || 'Tạo ví thất bại', 'error')
      }
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}

/** Hook: Update wallet */
export function useUpdateWallet() {
  const queryClient = useQueryClient()
  const addToast = useUiStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WalletUpdateData }) =>
      walletsApi.update(id, data),
    onSuccess: (response, { id }) => {
      if (response.success) {
        addToast('Đã cập nhật ví', 'success')
        queryClient.invalidateQueries({ queryKey: ['wallets'] })
        queryClient.invalidateQueries({ queryKey: ['wallet', id] })
      } else {
        addToast(response.message, 'error')
      }
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
    },
  })
}
