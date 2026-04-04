# Phase 7: Offline-first — Local Cache + Write Queue

## Mục tiêu
Cho phép xem feed, transactions, và Circles khi **không có mạng**. Ghi được data khi offline (queue local), tự động sync khi online.

## Design Decisions
- **Mô hình sync:** Đọc offline đầy đủ + Write queue đơn giản
- **Offline scope:** Chỉ đọc offline — xem đã sync. Ghi local queue khi offline, push khi online.
- **Conflict handling:** Last-write-wins (server wins), notification khi có conflict

## 7.1 Kiến trúc

```
React App
  ├── API Layer (network)
  │       ▲
  │       │
  ├── SyncEngine (Zustand + localStorage)
  │       ▲
  │       │
  └── DB Layer (Dexie.js / IndexedDB)
```

## 7.2 Database Schema (IndexedDB via Dexie.js)

```typescript
// src/lib/db.ts
interface LocalTransaction {
  id: string;              // UUID
  serverId?: string;        // null = pending sync
  userId: string;
  walletId: string;
  imageUrl?: string;
  amount: number;
  merchantName?: string;
  transactionDate: Date;
  ocrData?: object;
  isLifeLog: boolean;
  isSynced: boolean;       // false = pending upload
  pendingOps: Operation[];
  updatedAt: Date;
  createdAt: Date;
}

interface LocalCirclePost {
  id: string;
  serverId?: string;
  circleId: string;
  imageUrl?: string;
  caption?: string;
  ocrData?: object;
  likeCount: number;
  commentCount: number;
  isSynced: boolean;
  isVisibleLink: boolean;
  updatedAt: Date;
  createdAt: Date;
}

interface Operation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'transaction' | 'circle_post' | 'comment';
  entityId: string;
  payload: object;
  timestamp: number;
  retryCount: number;
}
```

## 7.3 SyncEngine Logic

**Write path:**
1. User tạo transaction → write IndexedDB immediately (optimistic)
2. Add Operation to writeQueue
3. If online → attempt sync immediately. If offline → queue persists
4. On reconnect → process queue FIFO
5. Success → mark isSynced=true, remove from queue
6. Failure → retry with exponential backoff (max 3)
7. Permanent failure → mark failed, show notification

**Read path (Cache-first):**
1. Read request → check IndexedDB first (always)
2. If stale (>5 min) and online → refresh from server
3. If offline → return cached data (stale OK)

## 7.4 Backend Endpoints

### GET /api/v1/sync/delta
Lấy tất cả thay đổi kể từ timestamp cuối sync.

```json
// Response
{
  "success": true,
  "data": {
    "transactions": { "items": [...], "deleted": ["uuid1"] },
    "circle_posts": { "items": [...], "deleted": [] },
    "circles": { "items": [...], "deleted": [] },
    "serverTime": "2026-04-04T12:00:00Z"
  }
}
```

### POST /api/v1/sync/batch
Push batch of queued operations.

```json
// Request
{
  "operations": [
    { "type": "CREATE", "entity": "transaction", "payload": {...}, "clientId": "uuid" },
    { "type": "UPDATE", "entity": "transaction", "entityId": "uuid", "payload": {...} }
  ]
}

// Response
{
  "success": true,
  "data": {
    "results": [
      { "clientId": "uuid", "success": true, "serverId": "server-uuid" },
      { "clientId": "uuid", "success": false, "error": "WALLET_NOT_FOUND" }
    ],
    "serverTime": "2026-04-04T12:00:00Z"
  }
}
```

## 7.5 Backend Files

```
src/application/use_cases/sync_delta.py
src/application/use_cases/sync_batch.py
src/application/dtos/request/sync_dto.py
src/application/dtos/response/sync_dto.py
src/infrastructure/adapters/driving/api/v1/sync.py
```

## 7.6 Frontend Files

```
src/lib/db.ts                          # Dexie.js setup
src/store/syncStore.ts                 # SyncEngine Zustand store
src/hooks/useOfflineQuery.ts           # Offline-aware query hook
src/hooks/useOfflineMutation.ts        # Offline-aware mutation hook
src/hooks/useSync.ts                   # Main sync hook
```

## 7.7 Verification

1. Tạo transaction khi offline → queue persists in IndexedDB
2. Reconnect → sync thành công
3. Conflict: tạo transaction offline + edit online → last-write-wins
4. Xem feed khi offline → hiển thị cached data
