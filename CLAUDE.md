# MemoirFinance — Claude Code Project Guide

> **Luôn đọc file này trước khi bắt đầu bất kỳ Claude Code session nào.**

---

## Project Overview

**MemoirFinance** là nền tảng nhật ký sống (Life Log) lấy hình ảnh làm trung tâm, trong đó quản lý tiền bạc là giá trị tăng thêm tự động. Không phải app tài chính — là cuốn nhật ký hình ảnh hoài niệm.

**Core value:** *"Lưu giữ khoảnh khắc bằng hình ảnh, AI sẽ lo phần con số."*

---

## Sources of Truth (Priority Order)

1. **`docs/tech-stack.md`** — Tech stack, auth flow, env vars (**đọc trước tiên**)
2. **`.planning/PROJECT.md`** — Project context, requirements, constraints
3. **`Feature_Truth.md`** — Product spec (product rules: UX, flows, features)
4. **`docs/architecture.md`** — Hexagonal + DDD architecture design
5. **`.planning/ROADMAP.md`** — Phase execution roadmap (6 phases)
6. **`docs/PHASE-XX.md`** — Phase-specific execution plans (Phase 1-6)
7. **`rule/`** — Coding conventions (7 files)

### Rule Files

| File | Content |
|------|---------|
| `rule/01-project-structure.md` | Hexagonal: Domain / Application / Infrastructure |
| `rule/02-database-rules.md` | PostgreSQL: snake_case, UUID PK, audit cols, Alembic |
| `rule/03-api-conventions.md` | REST: plural nouns, `{ success, data, message }`, status codes |
| `rule/04-error-handling.md` | Global handler, business error codes, **loguru**, **NO `print()`** |
| `rule/05-frontend-standards.md` | React+Tailwind 100%, React Query, Zustand, RHF+Zod, Lucide |
| `rule/06-ai-ocr-logic.md` | Preprocessing, few-shot, total-vs-items validation, human-in-the-loop |
| `rule/07-content-guidelines.md` | Blog tone, OpenAPI docs, `template/draft-template.md` |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 + React Query + Zustand + React Hook Form + Zod + Lucide React |
| Backend | FastAPI + Python 3.12 + SQLAlchemy + Alembic + Pydantic + Loguru |
| Database | PostgreSQL 16 (snake_case, UUID PK, soft delete, audit cols) |
| Auth | Google OAuth 2.0 + Custom JWT (RS256, no Firebase/Supabase) |
| Storage | Cloudflare R2 (S3-compatible, via @aws-sdk / boto3) |
| AI | Claude API (Anthropic) — few-shot prompting, JSON output |
| Dev | Docker Compose, venv + requirements.txt |

> Chi tiết đầy đủ: **`docs/tech-stack.md`**

---

## Architecture (Hexagonal)

```
src/ (backend)
├── domain/           # Pure business logic — NO framework imports
│   ├── entities/     # User, Transaction, Wallet, Category
│   ├── value_objects/ # Money, CategoryName, ImageMetadata
│   ├── services/     # DomainService
│   └── repositories/ # Interfaces ONLY
├── application/      # Use Cases + Ports + DTOs
│   ├── use_cases/   # CaptureExpenseUseCase, etc.
│   ├── ports/       # Input/Output interfaces
│   └── dtos/        # Request/Response DTOs
└── infrastructure/  # Adapters
    ├── adapters/
    │   ├── driving/ # FastAPI routes
    │   └── driven/  # PostgreSQL, R2, Claude API
    └── shared/      # exceptions, loguru_config
```

**CRITICAL:** Domain and Application layers MUST NOT import FastAPI, SQLAlchemy, or any external framework.

---

## Non-Negotiable Rules

1. **NO `print()`** — Use `loguru.logger.info/error/debug`
2. **100% Tailwind CSS** — No raw CSS files
3. **Functional Components + Hooks only** — No class components
4. **API response envelope:** `{ "success": true, "data": ..., "message": "" }`
5. **DB naming:** `snake_case`, UUID primary keys, `created_at`/`updated_at`/`deleted_at`
6. **API paths:** Plural nouns (`/api/v1/transactions`, `/api/v1/wallets`)
7. **Soft delete:** Never hard delete — use `deleted_at` column
8. **Foreign Keys + Indexes** on all filterable columns
9. **All form validation:** React Hook Form + Zod
10. **All server state:** React Query (NOT useEffect)
11. **AI OCR validation:** Always compare OCR total vs sum of items
12. **Human-in-the-loop:** Always allow user to edit AI-extracted data

---

## Luồng Cốt Lõi (Core Flow)

```
[Chụp ảnh / Chọn từ thư viện]
        ↓
[AI xử lý ngầm trong < 2 giây]
        ↓
[Card pop-up hiển thị kết quả]
  ┌─────────────────────────────┐
  │  ☕ Cà phê                  │
  │  75.000đ · F&B              │
  │  Ví Cá nhân                 │
  │                             │
  │  [Chạm để sửa]             │
  └─────────────────────────────┘
        ↓
├── Không chạm (3 giây) ──▶ Auto-save ✅
└── Chạm vào card ──▶ Mở Quick Edit
```

---

## Navigation Structure

```
[Hôm nay] [Nhật ký] [📸 Camera FAB] [Nhìn lại] [Cá nhân]
```

- Camera FAB: centered, larger, always visible on all screens
- Tabs: Hôm Nay (Feed) | Nhật ký (Calendar/Grid) | Nhìn lại (Reports) | Cá nhân (Profile)

---

## Conventions

### Git Commits

```
feat: add user authentication with Google OAuth
fix: correct category assignment in OCR
docs: update API documentation
chore: add Alembic migration
refactor: extract R2 storage adapter
test: add OCR validation tests
```

### File Naming

- Backend: `snake_case.py`
- Frontend: `PascalCase.tsx` (components), `camelCase.ts` (utilities)

---

## GSD Workflow

This project uses **Get Shit Done (GSD)** methodology.

- `.planning/ROADMAP.md` — Current roadmap with phases (Phase 1-6)
- `.planning/STATE.md` — Current execution state
- `docs/PHASE-*.md` — Phase execution plans (Phase 1-6, including CI/CD in Phase 6)

**Key commands:** `/gsd:plan-phase N`, `/gsd:execute-phase N`, `/gsd:progress`

---

## Environment Variables

viz `.env.example` + **`docs/tech-stack.md`** — Never commit `.env` files.

Required:
- `DATABASE_URL` — PostgreSQL connection string
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth 2.0 (Google Cloud Console)
- `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` — RS256 key pair for JWT signing
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` — Cloudflare R2
- `ANTHROPIC_API_KEY` — Claude API key
- `APP_SECRET_KEY`, `CORS_ORIGINS`

---

*Last updated: 2026-04-01 (Phase 5 complete)*
