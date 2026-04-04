/**
 * Dexie.js — IndexedDB wrapper for offline-first local storage.
 * Stores: transactions, circle_posts, operations (write queue).
 */

import Dexie, { type Table } from 'dexie'

// ── Types ────────────────────────────────────────────────────────────────────

export interface LocalTransaction {
  id: string // client-generated UUID
  serverId?: string // null = pending sync
  userId: string
  walletId: string
  imageUrl?: string
  thumbnailUrl?: string
  amount: number
  merchantName?: string
  categoryId?: string
  transactionDate?: string // ISO string
  note?: string
  ocrData?: Record<string, unknown>
  ocrConfidence: number
  isLifeLog: boolean
  isIncome: boolean
  currency: string
  transactionStatus: string
  isSynced: boolean
  updatedAt: string
  createdAt: string
}

export interface LocalCirclePost {
  id: string
  serverId?: string
  circleId: string
  authorId: string
  imageUrl: string
  caption?: string
  ocrData?: Record<string, unknown>
  isVisibleLink: boolean
  likeCount: number
  commentCount: number
  isSynced: boolean
  updatedAt: string
  createdAt: string
}

export interface LocalCircle {
  id: string
  name: string
  description?: string
  coverImageUrl?: string
  ownerId: string
  visibility: string
  circleType: string
  maxMembers: number
  createdAt: string
  updatedAt: string
}

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE'
export type OperationEntity = 'transaction' | 'circle_post' | 'comment'

export interface SyncOperation {
  id: string // unique ID for this operation
  type: OperationType
  entity: OperationEntity
  entityId: string
  payload: Record<string, unknown>
  timestamp: number // Unix ms
  retryCount: number
}

export interface SyncMeta {
  id: string // 'meta'
  lastSyncedAt?: string // ISO string
  pendingCount: number
}

// ── Database ─────────────────────────────────────────────────────────────────

class MemoirDB extends Dexie {
  transactions!: Table<LocalTransaction>
  circlePosts!: Table<LocalCirclePost>
  circles!: Table<LocalCircle>
  operations!: Table<SyncOperation>
  syncMeta!: Table<SyncMeta>

  constructor() {
    super('memoir_offline')

    this.version(1).stores({
      transactions: 'id, serverId, userId, walletId, transactionDate, isSynced, updatedAt',
      circlePosts: 'id, serverId, circleId, authorId, isSynced, updatedAt',
      circles: 'id, ownerId, updatedAt',
      operations: 'id, type, entity, timestamp',
      syncMeta: 'id',
    })
  }
}

export const db = new MemoirDB()

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get or create the sync meta record */
export async function getSyncMeta(): Promise<SyncMeta> {
  const existing = await db.syncMeta.get('meta')
  if (existing) return existing
  const meta: SyncMeta = { id: 'meta', pendingCount: 0 }
  await db.syncMeta.put(meta)
  return meta
}

/** Update last synced timestamp */
export async function setLastSyncedAt(timestamp: string): Promise<void> {
  const meta = await getSyncMeta()
  await db.syncMeta.update('meta', { lastSyncedAt: timestamp, pendingCount: meta.pendingCount })
}

/** Add an operation to the write queue */
export async function queueOperation(op: Omit<SyncOperation, 'retryCount'>): Promise<void> {
  const fullOp: SyncOperation = { ...op, retryCount: 0 }
  await db.operations.add(fullOp)
  const meta = await getSyncMeta()
  await db.syncMeta.update('meta', { pendingCount: meta.pendingCount + 1 })
}

/** Pop pending operations in FIFO order */
export async function popPendingOperations(limit = 100): Promise<SyncOperation[]> {
  const ops = await db.operations.orderBy('timestamp').limit(limit).toArray()
  return ops
}

/** Remove successfully synced operation */
export async function removeOperation(id: string): Promise<void> {
  await db.operations.delete(id)
  const meta = await getSyncMeta()
  await db.syncMeta.update('meta', {
    pendingCount: Math.max(0, meta.pendingCount - 1),
  })
}

/** Increment retry count on failed operation */
export async function incrementRetry(id: string): Promise<void> {
  const op = await db.operations.get(id)
  if (op) {
    await db.operations.update(id, { retryCount: op.retryCount + 1 })
  }
}

/** Get failed operations (retryCount >= 3) */
export async function getFailedOperations(): Promise<SyncOperation[]> {
  return db.operations.where('retryCount').aboveOrEqual(3).toArray()
}

/** Upsert a transaction into local DB (from sync delta) */
export async function upsertTransaction(tx: LocalTransaction): Promise<void> {
  await db.transactions.put(tx)
}

/** Upsert a circle post into local DB (from sync delta) */
export async function upsertCirclePost(post: LocalCirclePost): Promise<void> {
  await db.circlePosts.put(post)
}

/** Upsert a circle into local DB (from sync delta) */
export async function upsertCircle(circle: LocalCircle): Promise<void> {
  await db.circles.put(circle)
}

/** Get all unsynced transactions */
export async function getUnsyncedTransactions(): Promise<LocalTransaction[]> {
  return db.transactions.where('isSynced').equals(0).toArray()
}
