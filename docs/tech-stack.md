# Tech Stack — MemoirFinance

> Last updated: 2026-04-01

---

## Tổng quan

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| **Backend** | FastAPI (Python 3.12) + venv |
| **Database** | PostgreSQL 16 |
| **Auth** | Google OAuth 2.0 — Custom JWT (no Firebase, no Supabase) |
| **Image Storage** | Cloudflare R2 (S3-compatible) |
| **AI** | Claude API (Anthropic) — few-shot prompting, JSON output |
| **Dev** | Docker Compose |

---

## Frontend

| Purpose | Library |
|---------|---------|
| Framework | React 19 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v4 (100% utility-first, no raw CSS) |
| Data fetching | React Query (TanStack Query) |
| State management | Zustand |
| Form handling | React Hook Form + Zod |
| Icons | Lucide React |
| HTTP client | Fetch API (native) |
| Image upload | @aws-sdk/client-s3 (dùng cho R2) |

---

## Backend

| Purpose | Library |
|---------|---------|
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Logging | Loguru (**NO `print()`**) |
| Async DB | asyncpg + sqlalchemy[asyncio] |
| Auth | python-jose (JWT) + google-auth (Google OAuth verify) |
| AI client | anthropic |
| S3 client | boto3 (dùng cho R2) |
| Server | Uvicorn (ASGI) |

### Backend Architecture — Hexagonal + DDD

```
backend/src/
├── domain/              # Pure business logic — NO framework imports
│   ├── entities/         # User, Transaction, Wallet, Category
│   ├── value_objects/    # Money, CategoryName, ImageMetadata
│   ├── services/         # DomainService
│   └── repositories/     # Interfaces ONLY
├── application/          # Use Cases + Ports + DTOs
│   ├── use_cases/        # CaptureExpenseUseCase, etc.
│   ├── ports/            # Input/Output interfaces
│   └── dtos/             # Request/Response DTOs
└── infrastructure/       # Adapters
    ├── adapters/
    │   ├── driving/      # FastAPI routes
    │   └── driven/       # PostgreSQL, R2, Claude API
    └── shared/           # exceptions, loguru_config
```

**CRITICAL:** Domain và Application layer KHÔNG được import FastAPI, SQLAlchemy, hay bất kỳ external framework nào.

---

## Database — PostgreSQL 16

| Rule | Convention |
|------|-----------|
| Naming | snake_case |
| Primary key | UUID |
| Audit columns | `created_at`, `updated_at`, `deleted_at` |
| Delete | **Soft delete** — dùng `deleted_at`, không hard delete |
| Indexes | Tất cả cột dùng để filter/query |
| FK | Bắt buộc trên các mối quan hệ |

### Database Conventions

- Dùng Alembic cho migrations — mỗi thay đổi schema là 1 migration file riêng
- Migrations phải có cả `upgrade()` và `downgrade()`
- Không sửa migration đã apply — tạo migration mới để revert

---

## Auth — Google OAuth 2.0 + Custom JWT

### Flow

```
1. User click "Sign in with Google"
      ↓
2. FE redirect đến Google OAuth consent screen
      ↓
3. Google callback → FE nhận `code`
      ↓
4. FE gửi `code` lên BE
      ↓
5. BE exchange `code` → lấy `access_token` từ Google
      ↓
6. BE verify `access_token`, lấy user info (email, name, avatar)
      ↓
7. BE tạo JWT (access_token + refresh_token) → trả về FE
      ↓
8. FE lưu JWT → gọi API kèm Bearer token
      ↓
9. BE verify JWT ở mỗi request (middleware)
```

### Security

| Item | Detail |
|------|--------|
| Access token expiry | 15 phút |
| Refresh token expiry | 7 ngày |
| Storage | httpOnly cookie (refresh) + memory (access) |
| Algorithm | RS256 (asymmetric — private key sign, public key verify) |
| Rotation | Refresh token rotation on each use |

---

## Storage — Cloudflare R2

| Variable | Description |
|----------|-------------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | Tên bucket |
| `R2_PUBLIC_URL` | Public URL pattern (e.g. `https://pub.xxx.r2.dev`) |

- Dùng `@aws-sdk/client-s3` (R2 tương thích S3 API)
- Upload: presigned URL từ BE → FE upload trực tiếp lên R2
- CDN: Cloudflare domain để serve public files nhanh

---

## API Conventions

### Response Envelope

```json
{
  "success": true,
  "data": { ... },
  "message": ""
}
```

### Path Naming

- Plural nouns: `/api/v1/transactions`, `/api/v1/wallets`
- Version prefix: `/api/v1/`

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (valid token but no permission) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable entity (business rule violation) |
| 500 | Internal server error |

---

## Environment Variables

### Backend (.env)

```env
# App
APP_SECRET_KEY=<random-256-bit-key>
CORS_ORIGINS=http://localhost:5173,https://your-domain.com

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/memoirfinance

# Auth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
JWT_PRIVATE_KEY=<RS256 private key PEM>
JWT_PUBLIC_KEY=<RS256 public key PEM>
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# R2 Storage
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET_NAME=<bucket-name>
R2_PUBLIC_URL=https://pub.xxx.r2.dev

# AI
ANTHROPIC_API_KEY=<anthropic-api-key>

# Claude (optional override)
CLAUDE_API_URL=https://api.anthropic.com
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_GOOGLE_CLIENT_ID=<from Google Cloud Console>
VITE_R2_PUBLIC_URL=https://pub.xxx.r2.dev
```

---

## Dev Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run
uvicorn src.infrastructure.adapters.driving.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Database

```bash
docker compose up -d postgres
```

---

## Deployment (TBD)

> Chưa xác định — cần confirm sau khi MVP hoàn thành.

Gợi ý:
- **FE:** Vercel / Cloudflare Pages
- **BE:** Railway / Render / Fly.io / Self-hosted
- **DB:** Managed PostgreSQL (Neon, Supabase, Railway) hoặc self-hosted
- **R2:** Cloudflare R2 + Cloudflare Images/Workers
