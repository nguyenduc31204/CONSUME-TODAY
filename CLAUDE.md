# MemoirFinance — Claude Code Project Guide

> **Luôn đọc file này trước khi bắt đầu bất kỳ Claude Code session nào.**

---

## Project Overview

**MemoirFinance** là nền tảng nhật ký sống (Life Log) lấy hình ảnh làm trung tâm, trong đó quản lý tiền bạc là giá trị tăng thêm tự động. Không phải app tài chính — là cuốn nhật ký hình ảnh hoài niệm.

**Core value:** *"Lưu giữ khoảnh khắc bằng hình ảnh, AI sẽ lo phần con số."*

---

## Sources of Truth (Priority Order)

1. **`.planning/PROJECT.md`** — Project context, requirements, constraints
2. **`Feature_Truth.md`** — Product spec (product rules: UX, flows, features)
3. **`docs/architecture.md`** — Hexagonal + DDD architecture design
4. **`.planning/ROADMAP.md`** — Phase execution roadmap
5. **`.planning/REQUIREMENTS.md`** — All REQ-IDs, mapping to phases
6. **`rule/`** — Coding conventions (7 files)

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
| Auth | Firebase Auth (Google + Apple social login) |
| Storage | AWS S3 |
| AI | Claude API (Anthropic) — few-shot prompting, JSON output |
| Dev | Docker Compose, venv + requirements.txt |

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
    │   └── driven/  # PostgreSQL, S3, Claude
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
feat: add user authentication with Firebase
fix: correct category assignment in OCR
docs: update API documentation
chore: add Alembic migration
refactor: extract storage adapter
test: add OCR validation tests
```

### File Naming

- Backend: `snake_case.py`
- Frontend: `PascalCase.tsx` (components), `camelCase.ts` (utilities)

---

## GSD Workflow

This project uses **Get Shit Done (GSD)** methodology.

- `.planning/ROADMAP.md` — Current roadmap with phases
- `.planning/STATE.md` — Current execution state
- `.planning/PHASE-*.md` — Phase completion documentation
- `.planning/phases/` — Individual phase plans

**Key commands:** `/gsd:plan-phase N`, `/gsd:execute-phase N`, `/gsd:progress`

---

## Environment Variables

viz `.env.example` — Never commit `.env` files.

Required:
- `FIREBASE_*` — Firebase Auth config
- `AWS_*` — S3 storage
- `ANTHROPIC_API_KEY` — Claude API key
- `DATABASE_URL` — PostgreSQL connection string
- `APP_SECRET_KEY`, `CORS_ORIGINS`

---

*Last updated: 2026-04-01*
