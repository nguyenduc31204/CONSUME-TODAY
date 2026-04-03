import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/api/users'

export function useUserStats() {
  return useQuery({
    queryKey: ['users', 'stats'],
    queryFn: async () => {
      const res = await usersApi.getMyStats()
      if (!res.success) throw new Error(res.message)
      return res.data
    },
    staleTime: 60_000,
  })
}
