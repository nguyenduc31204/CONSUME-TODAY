/**
 * useOfflineMutation — Queue-aware mutation hook.
 * Writes to IndexedDB immediately (optimistic), then syncs to server.
 * Works even when offline — queues the operation.
 */

import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queueOperation } from '@/lib/db'
import { useSyncStore } from '@/stores/syncStore'
import { useUiStore, type UiState } from '@/stores/uiStore'

export type OfflineEntityType = 'transaction' | 'circle_post' | 'comment'

export interface UseOfflineMutationOptions<TData, TError, TVariables> {
  mutationFn: (variables: TVariables) => Promise<{ data: TData }>
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: TError, variables: TVariables) => void
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void
  /** Custom function to build a SyncOperation from mutation variables */
  buildOperation: (variables: TVariables) => {
    type: 'CREATE' | 'UPDATE' | 'DELETE'
    entity: OfflineEntityType
    entityId?: string
    payload: Record<string, unknown>
  }
  /** Sync key to invalidate after success */
  queryInvalidate?: string[]
  /** Toast message on success */
  successToast?: string
  /** Toast message on local queue (offline) */
  queuedToast?: string
}

/**
 * Mutation that writes to IndexedDB immediately and syncs to server.
 * Works offline — queues the operation if no network.
 */
export function useOfflineMutation<TData, TError = Error, TVariables = unknown>(
  options: UseOfflineMutationOptions<TData, TError, TVariables>,
) {
  const {
    mutationFn,
    onSuccess,
    onError,
    onSettled,
    buildOperation,
    queryInvalidate,
    successToast,
    queuedToast,
  } = options

  const { isOnline } = useSyncStore()
  const addToast: UiState['addToast'] = useUiStore((s) => s.addToast)
  const queryClient = useQueryClient()

  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      // Write to IndexedDB immediately (optimistic)
      const op = buildOperation(variables)
      const clientId = crypto.randomUUID()
      const now = Date.now()

      await queueOperation({
        id: clientId,
        type: op.type,
        entity: op.entity,
        entityId: op.entityId ?? clientId,
        payload: op.payload,
        timestamp: now,
      })

      // If online, also push to server
      if (isOnline) {
        const result = await mutationFn(variables)
        return result.data
      } else {
        // Offline: show queued notification
        if (queuedToast) {
          addToast(queuedToast, 'info', 4000)
        }
        // Return a fake success so UI doesn't show error
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return op.entityId as any as TData
      }
    },

    onSuccess: (data, variables) => {
      if (successToast) {
        addToast(successToast, 'success')
      }
      if (queryInvalidate) {
        queryInvalidate.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] })
        })
      }
      onSuccess?.(data, variables)
    },

    onError: (error, variables) => {
      addToast(
        error instanceof Error ? error.message : 'Đã xảy ra lỗi',
        'error',
      )
      onError?.(error, variables)
    },

    onSettled: (data, error, variables) => {
      onSettled?.(data ?? undefined, error as TError | null, variables)
    },
  })
}

/**
 * Simple offline mutation — just writes to IndexedDB queue without server push.
 * Use for entities that don't have a corresponding API endpoint yet.
 */
export function useQueueMutation<TError = Error, TVariables = unknown>(
  buildOperation: (variables: TVariables) => {
    type: 'CREATE' | 'UPDATE' | 'DELETE'
    entity: OfflineEntityType
    entityId?: string
    payload: Record<string, unknown>
  },
  options?: {
    onSuccess?: (variables: TVariables) => void
    onError?: (error: TError, variables: TVariables) => void
    queuedToast?: string
  },
) {
  const addToast: UiState['addToast'] = useUiStore((s) => s.addToast)
  const { isOnline } = useSyncStore()

  return useCallback(
    async (variables: TVariables) => {
      const op = buildOperation(variables)
      const clientId = crypto.randomUUID()
      const now = Date.now()

      await queueOperation({
        id: clientId,
        type: op.type,
        entity: op.entity,
        entityId: op.entityId ?? clientId,
        payload: op.payload,
        timestamp: now,
      })

      if (!isOnline && options?.queuedToast) {
        addToast(options.queuedToast, 'info', 4000)
      }

      options?.onSuccess?.(variables)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOnline],
  )
}
