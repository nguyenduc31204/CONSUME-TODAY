/**
 * useOfflineQuery — Cache-first query hook.
 * Reads from IndexedDB immediately, then fetches from server if online + stale.
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/db'
import { useSyncStore } from '@/stores/syncStore'

const STALE_TIME_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Cache-first query: read from IndexedDB first, then refresh from server if online + stale.
 * @param tableName  Dexie table name: 'transactions' | 'circlePosts' | 'circles'
 * @param queryKey   React Query key for server fetch
 * @param serverFn   Function to fetch from server
 * @param options    Additional options
 */
export function useOfflineQuery<T>(
  tableName: string,
  queryKey: string[],
  serverFn: () => Promise<T>,
  options?: {
    enabled?: boolean
    staleTime?: number
    onServerData?: (data: T) => void
  },
) {
  const { enabled = true } = options ?? {}
  const { isOnline } = useSyncStore()
  const [localData, setLocalData] = useState<T | null>(null)
  const [loadedFromLocal, setLoadedFromLocal] = useState(false)

  // Step 1: Read from IndexedDB immediately
  useEffect(() => {
    if (!enabled) return

    const loadLocal = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const table = (db as any)[tableName]
        if (table) {
          const items = await table.toArray()
          if (items.length > 0) {
            setLocalData(items as unknown as T)
            setLoadedFromLocal(true)
          }
        }
      } catch {
        // IndexedDB unavailable or empty — ignore
      }
    }

    loadLocal()
  }, [tableName, enabled])

  // Step 2: Fetch from server if online (and update IndexedDB)
  const serverQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await serverFn()
      // Upsert into IndexedDB on success
      await _upsertFromServer(tableName, data)
      return data
    },
    enabled: enabled && isOnline,
    staleTime: options?.staleTime ?? STALE_TIME_MS,
    retry: 1,
  })

  // Callback when server data arrives
  useEffect(() => {
    if (serverQuery.data) {
      options?.onServerData?.(serverQuery.data)
    }
  }, [serverQuery.data, options])

  // Return: local data if available + still loading, otherwise server data
  if (!enabled) return { data: undefined, isLoading: false, isFromLocal: false }

  if (isOnline) {
    // Online: return server data (it will have updated IndexedDB already)
    return {
      data: serverQuery.data ?? localData,
      isLoading: serverQuery.isLoading,
      isFromLocal: !serverQuery.data && loadedFromLocal,
    }
  } else {
    // Offline: return cached local data
    return {
      data: localData,
      isLoading: false,
      isFromLocal: true,
    }
  }
}

/** Upsert server data into IndexedDB */
async function _upsertFromServer(tableName: string, data: unknown): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = (db as any)[tableName]
    if (!table) return

    if (Array.isArray(data)) {
      await table.bulkPut(data)
    } else if (data && typeof data === 'object' && 'items' in (data as Record<string, unknown>)) {
      const d = data as { items: unknown[] }
      await table.bulkPut(d.items)
    }
  } catch {
    // Ignore IndexedDB write errors
  }
}
