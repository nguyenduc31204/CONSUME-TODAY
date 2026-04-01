# Phase 2: Backend Core

**Mục tiêu:** Backend hoàn chỉnh — Authentication, Database Schema, và tất cả Core APIs (Wallets, Categories, Transactions).

**Phụ thuộc:** Phase 1

---

## 2.1 — Database Schema + Migrations

### Mục tiêu

Thiết kế và tạo PostgreSQL schema hoàn chỉnh, chạy migrations qua Alembic.

### Database Schema

**Bảng: `users`**
```
id              UUID PRIMARY KEY (auto)
email           VARCHAR(255) UNIQUE NOT NULL
name            VARCHAR(255) NOT NULL
avatar_url      VARCHAR(512) NULL
firebase_uid    VARCHAR(128) UNIQUE NOT NULL  -- Firebase Auth UID
created_at      TIMESTAMP NOT NULL DEFAULT NOW()
updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
deleted_at      TIMESTAMP NULL  -- Soft delete
```

**Bảng: `wallets`**
```
id              UUID PRIMARY KEY (auto)
user_id         UUID FK → users.id NOT NULL
name            VARCHAR(100) NOT NULL
icon            VARCHAR(50) DEFAULT 'wallet'
color           VARCHAR(7) DEFAULT '#9333ea'  -- Hex color
is_default      BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP NOT NULL DEFAULT NOW()
updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
deleted_at      TIMESTAMP NULL

INDEX: (user_id)
UNIQUE: (user_id, name) -- không trùng tên ví trong cùng user
```

**Bảng: `categories`**
```
id              UUID PRIMARY KEY (auto)
user_id         UUID FK → users.id NOT NULL  -- NULL = system default
wallet_id       UUID FK → wallets.id NOT NULL  -- categories isolated per wallet
name            VARCHAR(100) NOT NULL
icon            VARCHAR(50) NOT NULL  -- Lucide icon name
color           VARCHAR(7) NOT NULL  -- Hex color
sort_order      INTEGER DEFAULT 0
created_at      TIMESTAMP NOT NULL DEFAULT NOW()
updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
deleted_at      TIMESTAMP NULL

INDEX: (wallet_id)

6 danh mục mặc định (system, user_id=NULL, wallet_id=NULL):
  1. Ăn uống (F&B) — icon: UtensilsCrossed, color: #f97316
  2. Mua sắm — icon: ShoppingBag, color: #ec4899
  3. Di chuyển — icon: Car, color: #3b82f6
  4. Giải trí — icon: Film, color: #8b5cf6
  5. Hóa đơn & Tiện ích — icon: Home, color: #14b8a6
  6. Sức khỏe — icon: HeartPulse, color: #ef4444
```

**Bảng: `transactions`**
```
id              UUID PRIMARY KEY (auto)
user_id         UUID FK → users.id NOT NULL
wallet_id       UUID FK → wallets.id NOT NULL
category_id     UUID FK → categories.id NULL
image_id        UUID FK → images.id NULL

amount          DECIMAL(15,2) NOT NULL  -- Số tiền (VND)
currency        VARCHAR(3) DEFAULT 'VND'
merchant        VARCHAR(255) NULL  -- Tên cửa hàng
transaction_date DATE NOT NULL  -- Ngày giao dịch
ocr_confidence  FLOAT DEFAULT NULL  -- Độ tin OCR (0-1)

is_life_log     BOOLEAN DEFAULT FALSE  -- TRUE = Life Log (0đ, không phải hóa đơn)
ocr_data        JSONB NULL  -- Raw OCR result để user sửa

status          VARCHAR(20) DEFAULT 'confirmed'  -- confirmed, pending

created_at      TIMESTAMP NOT NULL DEFAULT NOW()
updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
deleted_at      TIMESTAMP NULL

INDEX: (user_id, transaction_date DESC)  -- Feed "Hôm nay"
INDEX: (user_id, wallet_id)
INDEX: (user_id, category_id)
INDEX: (wallet_id, transaction_date)
```

**Bảng: `images`**
```
id              UUID PRIMARY KEY (auto)
user_id         UUID FK → users.id NOT NULL
transaction_id  UUID FK → transactions.id NULL

s3_key          VARCHAR(512) NOT NULL  -- S3 object key
s3_url          VARCHAR(1024) NOT NULL  -- Full S3 URL
thumbnail_key   VARCHAR(512) NULL  -- Thumbnail S3 key
thumbnail_url   VARCHAR(1024) NULL

original_filename VARCHAR(255) NULL
mime_type       VARCHAR(100) DEFAULT 'image/jpeg'
file_size       INTEGER NULL  -- bytes

created_at      TIMESTAMP NOT NULL DEFAULT NOW()
deleted_at      TIMESTAMP NULL

INDEX: (user_id, created_at DESC)
INDEX: (transaction_id)
```

### Migrations

**Migration 001 — Initial Schema:**
- Tạo extension `uuid-ossp`
- Tạo tất cả bảng với constraints
- Tạo tất cả indexes
- Tạo trigger cho `updated_at` auto-update

**Migration 002 — Seed Data:**
- Insert 6 danh mục mặc định (system default, user_id=NULL)

---

## 2.2 — Firebase Authentication

### Mục tiêu

Tích hợp Firebase Auth (Google + Apple Social Login) và middleware bảo vệ API routes.

### Firebase Auth Flow

```
1. Frontend: Firebase SDK → Google/Apple OAuth → nhận Firebase ID Token (JWT)
2. Frontend: gửi ID Token lên backend qua Authorization header
3. Backend: verify Firebase ID Token → lấy UID → tạo/lấy user record
4. Backend: trả về user info + tạo session/cookie
```

### API Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/v1/auth/google` | None | Đăng nhập Google → verify token → upsert user |
| POST | `/api/v1/auth/apple` | None | Đăng nhập Apple → verify token → upsert user |
| POST | `/api/v1/auth/logout` | Required | Đăng xuất |
| GET | `/api/v1/auth/me` | Required | Lấy thông tin user hiện tại |

**POST /api/v1/auth/google**
```
Request: { "idToken": "firebase_google_id_token" }
Response: {
  success: true,
  data: {
    user: { id, email, name, avatar_url },
    wallet: { id, name, ... },        -- ví mặc định
    categories: [ ...6 default... ]   -- 6 danh mục mặc định
  },
  message: ""
}
```

**Auto-create on first login:**
- Kiểm tra user đã tồn tại qua `firebase_uid`
- Nếu user mới: tạo 1 Wallet mặc định "Ví Cá nhân" + 6 Categories mặc định
- Không có onboarding wizard

### Auth Middleware

`FirebaseAuthMiddleware`:
- Extract `Authorization: Bearer <token>` header
- Verify Firebase ID Token (throws if invalid/expired)
- Attach `request.state.user = { id, firebase_uid, email }` cho downstream handlers
- FastAPI Dependency: `get_current_user() -> User`

---

## 2.3 — Wallet & Category APIs

### Mục tiêu

CRUD hoàn chỉnh cho Wallets và Categories.

### Wallet Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/wallets` | Required | Danh sách wallets của user |
| POST | `/api/v1/wallets` | Required | Tạo wallet mới |
| GET | `/api/v1/wallets/{id}` | Required | Chi tiết wallet |
| PUT | `/api/v1/wallets/{id}` | Required | Cập nhật wallet |
| DELETE | `/api/v1/wallets/{id}` | Required | Soft delete wallet |

**POST /api/v1/wallets**
```
Request: { "name": "Ví Du Lịch", "icon": "plane", "color": "#22c55e" }
Response: { success: true, data: { id, name, icon, color, is_default: false }, message: "" }
```

### Category Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/categories` | Required | Danh sách categories (của wallet mặc định) |
| GET | `/api/v1/wallets/{wallet_id}/categories` | Required | Categories theo wallet |
| POST | `/api/v1/categories` | Required | Tạo category mới |
| PUT | `/api/v1/categories/{id}` | Required | Cập nhật category |
| DELETE | `/api/v1/categories/{id}` | Required | Soft delete category |

**POST /api/v1/categories**
```
Request: { "wallet_id": "uuid", "name": "Nuôi Mèo", "icon": "cat", "color": "#f59e0b" }
Response: { success: true, data: { id, wallet_id, name, icon, color }, message: "" }
```

### Business Rules

- Wallet không thể xóa nếu có transactions → trả lỗi `ERR_WALLET_HAS_TRANSACTIONS`
- Category không thể xóa nếu có transactions → trả lỗi `ERR_CATEGORY_HAS_TRANSACTIONS`
- Mỗi wallet có bộ categories riêng — queries phải filter theo `wallet_id`
- Wallet mặc định không thể xóa → trả lỗi `ERR_CANNOT_DELETE_DEFAULT_WALLET`

---

## 2.4 — Transaction API

### Mục tiêu

CRUD hoàn chỉnh cho Transactions, hỗ trợ Life Log mode.

### Transaction Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/transactions` | Required | Danh sách (filter: date, wallet_id, category_id, is_life_log) |
| GET | `/api/v1/transactions/{id}` | Required | Chi tiết transaction |
| POST | `/api/v1/transactions` | Required | Tạo transaction thủ công |
| PUT | `/api/v1/transactions/{id}` | Required | Cập nhật (sửa sau khi AI nhận sai) |
| DELETE | `/api/v1/transactions/{id}` | Required | Soft delete |

**GET /api/v1/transactions — Filters:**
```
?wallet_id=uuid           -- lọc theo ví
?category_id=uuid          -- lọc theo danh mục
?start_date=2025-01-01    -- lọc từ ngày
?end_date=2025-01-31      -- lọc đến ngày
?is_life_log=true         -- chỉ Life Log
?limit=20                 -- pagination
?cursor=uuid              -- cursor-based pagination (cursor = last item id)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [Transaction],
    "next_cursor": "uuid | null",
    "total": 150
  },
  "message": ""
}
```

### Transaction Fields

```json
{
  "id": "uuid",
  "amount": 75000.00,
  "currency": "VND",
  "merchant": "The Coffee House",
  "transaction_date": "2025-01-15",
  "category": { "id": "uuid", "name": "Ăn uống", "icon": "utensils", "color": "#f97316" },
  "wallet": { "id": "uuid", "name": "Ví Cá nhân" },
  "images": [{ "id": "uuid", "url": "https://...", "thumbnail_url": "..." }],
  "is_life_log": false,
  "ocr_confidence": 0.95,
  "status": "confirmed",
  "created_at": "2025-01-15T12:30:00Z"
}
```

---

## Summary

### Phase 2 Deliverables

| Sub-phase | Scope |
|---|---|
| 2.1 | PostgreSQL schema (users, wallets, categories, transactions, images) + Alembic migrations |
| 2.2 | Firebase Auth (Google + Apple) + middleware + auth endpoints |
| 2.3 | Wallet CRUD + Category CRUD APIs |
| 2.4 | Transaction CRUD API với filters + pagination |

### Success Criteria

- [ ] User đăng nhập Google/Apple → nhận user info + default wallet + 6 categories
- [ ] User tạo/sửa/xóa wallets
- [ ] User tạo/sửa/xóa custom categories
- [ ] User tạo/sửa/xóa transactions
- [ ] Filter transactions theo date/wallet/category/is_life_log
- [ ] Cursor-based pagination trên transactions list
- [ ] Tất cả responses: `{ success, data, message }`
- [ ] PostgreSQL: UUID PK, audit cols, FK, indexes

### Phase tiếp theo

**Phase 3: AI OCR + Life Log** — Image upload, S3 storage, Claude API OCR, auto-save, Life Log flow

Xem: `docs/PHASE-03.md`
