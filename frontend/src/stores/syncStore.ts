/**
 * SyncEngine — Zustand store for offline-first sync.
 * Manages: online/offline state, write queue, last sync time, syncing status.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SyncOperation {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'transaction' | 'circle_post' | 'comment'
  entityId: string
  payload: Record<string, unknown>
  timestamp: number
  retryCount: number
}

export interface SyncResult {
  clientId: string
  success: boolean
  serverId?: string
  error?: string
}

export interface SyncBatchResult {
  results: SyncResult[]
  syncedCount: number
  failedCount: number
  serverTime: string
}

interface SyncState {
  // Online status
  isOnline: boolean

  // Sync engine status
  isSyncing: boolean
  lastSyncedAt: string | null // ISO string
  pendingCount: number

  // Failed sync notification
  lastSyncError: string | null

  // Actions
  setOnline: (online: boolean) => void
  setSyncing: (syncing: boolean) => void
  setLastSyncedAt: (ts: string) => void
  setPendingCount: (count: number) => void
  setLastSyncError: (error: string | null) => void
  resetSyncError: () => void
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isOnline: typeof window !== 'undefined' ? window.navigator.onLine : true,
      isSyncing: false,
      lastSyncedAt: null,
      pendingCount: 0,
      lastSyncError: null,

      setOnline: (online) => set({ isOnline: online }),
      setSyncing: (syncing) => set({ isSyncing: syncing }),
      setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
      setPendingCount: (count) => set({ pendingCount: count }),
      setLastSyncError: (error) => set({ lastSyncError: error }),
      resetSyncError: () => set({ lastSyncError: null }),
    }),
    {
      name: 'memoir-sync',
      partialize: (state) => ({
        lastSyncedAt: state.lastSyncedAt,
        pendingCount: state.pendingCount,
      }),
    },
  ),
)

// ── Bootstrap online/offline listeners ─────────────────────────────────────────

let _onlineListener: () => void
let _offlineListener: () => void

export function initSyncListeners(syncFn: () => void) {
  if (typeof window === 'undefined') return

  _onlineListener = () => {
    useSyncStore.getState().setOnline(true)
    syncFn() // trigger queue processing
  }
  _offlineListener = () => {
    useSyncStore.getState().setOnline(false)
  }

  window.addEventListener('online', _onlineListener)
  window.addEventListener('offline', _offlineListener)
}

export function cleanupSyncListeners() {
  if (typeof window === 'undefined') return
  if (_onlineListener) window.removeEventListener('online', _onlineListener)
  if (_offlineListener) window.removeEventListener('offline', _offlineListener)
}