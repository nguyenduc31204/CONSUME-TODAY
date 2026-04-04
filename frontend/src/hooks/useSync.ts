/**
 * useSync — Main sync orchestration hook.
 * Handles: online/offline detection, queue processing, delta sync.
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  db,
  getSyncMeta,
  incrementRetry,
  popPendingOperations,
  removeOperation,
  upsertCircle,
  upsertCirclePost,
  upsertTransaction,
} from '@/lib/db'
import {
  type SyncOperationDTO,
  syncApi,
} from '@/api/sync'
import { useSyncStore } from '@/stores/syncStore'
import { useUiStore } from '@/stores/uiStore'

const MAX_RETRIES = 3
const BATCH_SIZE = 50

/** Convert internal op to API DTO */
function opToDTO(op: {
  id: string
  type: string
  entity: string
  entityId: string
  payload: Record<string, unknown>
}): SyncOperationDTO {
  return {
    type: op.type as 'CREATE' | 'UPDATE' | 'DELETE',
    entity: op.entity as 'transaction' | 'circle_post' | 'comment',
    entityId: op.entityId,
    payload: op.payload,
    client_id: op.id,
  }
}

/** Convert server transaction DTO → LocalTransaction */
function dtoToLocalTransaction(dto: {
  id: string
  user_id: string
  wallet_id: string
  category_id?: string
  image_url?: string
  thumbnail_url?: string
  merchant_name?: string
  amount: number
  currency: string
  transaction_date?: string
  note?: string
  ocr_confidence: number
  is_life_log: boolean
  is_income: boolean
  transaction_status: string
  created_at: string
  updated_at: string
}) {
  return {
    id: dto.id,
    serverId: dto.id,
    userId: dto.user_id,
    walletId: dto.wallet_id,
    categoryId: dto.category_id,
    imageUrl: dto.image_url,
    thumbnailUrl: dto.thumbnail_url,
    merchantName: dto.merchant_name,
    amount: dto.amount,
    currency: dto.currency,
    transactionDate: dto.transaction_date,
    note: dto.note,
    ocrData: undefined,
    ocrConfidence: dto.ocr_confidence,
    isLifeLog: dto.is_life_log,
    isIncome: dto.is_income,
    transactionStatus: dto.transaction_status,
    isSynced: true,
    updatedAt: dto.updated_at,
    createdAt: dto.created_at,
  }
}

function dtoToLocalCirclePost(dto: {
  id: string
  circle_id: string
  author_id: string
  image_url: string
  caption?: string
  ocr_data?: Record<string, unknown>
  is_visible_link: boolean
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}) {
  return {
    id: dto.id,
    serverId: dto.id,
    circleId: dto.circle_id,
    authorId: dto.author_id,
    imageUrl: dto.image_url,
    caption: dto.caption,
    ocrData: dto.ocr_data,
    isVisibleLink: dto.is_visible_link,
    likeCount: dto.like_count,
    commentCount: dto.comment_count,
    isSynced: true,
    updatedAt: dto.updated_at,
    createdAt: dto.created_at,
  }
}

function dtoToLocalCircle(dto: {
  id: string
  name: string
  description?: string
  cover_image_url?: string
  owner_id: string
  visibility: string
  circle_type: string
  max_members: number
  created_at: string
  updated_at: string
}) {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    coverImageUrl: dto.cover_image_url,
    ownerId: dto.owner_id,
    visibility: dto.visibility,
    circleType: dto.circle_type,
    maxMembers: dto.max_members,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

/**
 * Main sync hook — call this once at app root.
 * - Sets up online/offline listeners
 * - Processes write queue when coming online
 * - Syncs delta when coming online
 */
export function useSync() {
  const { setSyncing, setLastSyncedAt, setLastSyncError, setPendingCount } =
    useSyncStore()
  const { addToast } = useUiStore()
  const queryClient = useQueryClient()
  const syncingRef = useRef(false)

  // ── Push queued operations to server ──────────────────────────────────

  const processQueue = async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)

    try {
      const ops = await popPendingOperations(BATCH_SIZE)
      if (ops.length === 0) {
        setSyncing(false)
        syncingRef.current = false
        return
      }

      const dtos = ops.map(opToDTO)
      const response = await syncApi.pushBatch(dtos)

      if (response.success && response.data) {
        const { results, server_time } = response.data

        // Process results
        for (const result of results) {
          const op = ops.find((o) => o.id === result.client_id)
          if (!op) continue

          if (result.success) {
            // Remove from queue
            await removeOperation(result.client_id)
          } else if (result.error) {
            // Check if retryable
            const currentOp = await db.operations.get(result.client_id)
            if (currentOp && currentOp.retryCount >= MAX_RETRIES) {
              // Permanent failure — keep in DB but notify
              await removeOperation(result.client_id)
              setLastSyncError(`Sync failed: ${result.error}`)
              addToast('Một số thay đổi chưa được đồng bộ', 'warning', 6000)
            } else {
              await incrementRetry(result.client_id)
            }
          }
        }

        // Update meta
        const meta = await getSyncMeta()
        setPendingCount(meta.pendingCount)
        setLastSyncedAt(server_time)
      } else {
        setLastSyncError(response.message)
      }

      // Process remaining in queue
      const remaining = await db.operations.count()
      if (remaining > 0) {
        await processQueue() // recurse
      }
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : 'Sync error')
    } finally {
      setSyncing(false)
      syncingRef.current = false
    }
  }

  // ── Pull delta from server ─────────────────────────────────────────

  const syncDelta = async () => {
    const meta = await getSyncMeta()
    const since = meta.lastSyncedAt || undefined

    try {
      const response = await syncApi.getDelta(since)
      if (response.success && response.data) {
        const { transactions, circle_posts, circles, server_time } = response.data

        // Upsert all entities
        if (transactions.items.length > 0) {
          await Promise.all(transactions.items.map((t) => upsertTransaction(dtoToLocalTransaction(t))))
        }
        if (circle_posts.items.length > 0) {
          await Promise.all(circle_posts.items.map((p) => upsertCirclePost(dtoToLocalCirclePost(p))))
        }
        if (circles.items.length > 0) {
          await Promise.all(circles.items.map((c) => upsertCircle(dtoToLocalCircle(c))))
        }

        // Update sync timestamp
        await setLastSyncedAt(server_time)
        setLastSyncedAt(server_time)

        // Invalidate React Query cache so UI re-renders with fresh data
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['circles'] })
        queryClient.invalidateQueries({ queryKey: ['circle-posts'] })
      }
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : 'Delta sync error')
    }
  }

  // ── Full sync: push queue + pull delta ────────────────────────────

  const sync = async () => {
    await processQueue()
    await syncDelta()
  }

  // ── Setup online/offline listeners ────────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      useSyncStore.getState().setOnline(true)
      sync()
    }
    const handleOffline = () => {
      useSyncStore.getState().setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial sync on mount (when online)
    if (window.navigator.onLine) {
      sync()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { sync, processQueue, syncDelta }
}
