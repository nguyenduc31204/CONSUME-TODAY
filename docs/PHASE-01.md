# Phase 1: Nền Tảng

**Mục tiêu:** Thiết lập môi trường phát triển, cấu trúc dự án, quy ước code, và GSD workflow.

---

## Bối cảnh

MemoirFinance là dự án greenfield. Trước Phase 1, chưa có gì — không git repo, không cấu trúc code, không quy ước. Phase 1 tạo nền móng để mọi phase tiếp theo có thể bắt đầu ngay lập tức.

---

## Sub-phases

### 1.01 — Git + GSD Workflow ✅

**Trạng thái:** Hoàn thành
**Commit:** `8b6d19a`

Thiết lập Git repo và GSD workflow hoàn chỉnh.

**Files đã tạo:**
| File | Mục đích |
|---|---|
| `.git/` | Git repo (main branch) |
| `.gitignore` | Ignore: node_modules, pycache, .env, .planning/ |
| `.planning/PROJECT.md` | Project context từ Feature_Truth.md |
| `.planning/REQUIREMENTS.md` | 11 MVP REQ-IDs + 9 post-MVP REQ-IDs |
| `.planning/ROADMAP.md` | 5 phases: Nền tảng → Backend Core → AI OCR → Frontend Core → Reports |
| `.planning/STATE.md` | Trạng thái phase, decisions log |
| `.planning/config.json` | GSD config: YOLO, coarse, parallelization, GSD workflow |
| `CLAUDE.md` | Project guide, non-negotiable rules, architecture overview |

**GSD Workflow thiết lập:**
- Mode: YOLO (auto-approve)
- Granularity: Coarse
- Parallelization: true
- Research: true, Plan Check: true, Verifier: true

---

### 1.02 — Docker + Infrastructure ✅

**Trạng thái:** Hoàn thành
**Commit:** `b84f3d0`

Thiết lập Docker Compose và cấu hình infrastructure.

**Files đã tạo:**
| File | Mục đích |
|---|---|
| `.env.example` | Template tất cả biến môi trường (Firebase, AWS S3, Claude, PostgreSQL, App) |
| `docker-compose.yml` | 3 services: postgres:16-alpine, backend (port 8000), frontend (port 3000) |
| `backend/Dockerfile` | Python 3.12-slim, non-root user, layer caching, venv setup |
| `frontend/Dockerfile` | Multi-stage: builder + production nginx + development |
| `backend/.dockerignore` | Ignore pycache, .venv, .env, .git |
| `frontend/.dockerignore` | Ignore node_modules, dist, .git |
| `frontend/nginx.conf` | SPA fallback, gzip, cache assets, proxy /api/ đến backend |

**Services trong docker-compose:**
```
postgres:16-alpine  (port 5432)  — Database
backend             (port 8000)  — FastAPI API
frontend           (port 3000)  — React Web App
```

**.env.example sections:**
- Firebase Auth (Google + Apple)
- AWS S3 (Image Storage)
- Claude API (AI OCR)
- PostgreSQL (Database)
- Application (ENV, SECRET_KEY, CORS)

---

### 1.03 — Backend Project Structure

**Trạng thái:** Sắp lên kế hoạch
**Phụ thuộc:** 1.01, 1.02

Tạo cấu trúc backend hoàn chỉnh theo Hexagonal Architecture.

**Scope:**
- [ ] Cấu trúc thư mục `backend/` theo Hexagonal (Domain / Application / Infrastructure)
- [ ] `requirements.txt` — danh sách dependencies (versions sẽ quyết định sau)
- [ ] `app/main.py` — FastAPI entry point với lifespan, CORS, health check
- [ ] `app/config.py` — Pydantic Settings từ environment variables
- [ ] Domain Layer — BaseEntity (UUID, audit cols), repository interfaces
- [ ] Application Layer — Use case stubs, port interfaces, DTO stubs
- [ ] Infrastructure Layer — Shared (exceptions, loguru), Driving adapters (routes stubs), Driven adapters (postgres session, S3 stub, Claude stub)
- [ ] Alembic setup — `alembic.ini`, `migrations/env.py`
- [ ] Tests structure — `tests/unit/`

**Quy ước bắt buộc:**
- **KHÔNG `print()`** — dùng `loguru.logger`
- Domain layer: chỉ stdlib + typing, KHÔNG FastAPI/SQLAlchemy
- API responses: `{ success: true, data: ..., message: "" }`
- API paths: danh từ số nhiều `/api/v1/transactions`, `/api/v1/wallets`
- Soft delete: tất cả entities dùng `deleted_at`, không hard delete

---

### 1.04 — Frontend Project Structure

**Trạng thái:** Sắp lên kế hoạch
**Phụ thuộc:** 1.01, 1.02

Tạo cấu trúc frontend hoàn chỉnh.

**Scope:**
- [ ] Cấu trúc thư mục `frontend/` — atomic design
- [ ] `package.json` — dependencies (versions sẽ quyết định sau)
- [ ] Config files — tsconfig.json, vite.config.ts, tailwind.config.ts, postcss.config.js, .prettierrc, .eslintrc.json
- [ ] `index.html` + `src/main.tsx` + `src/App.tsx` + `src/index.css`
- [ ] API client — fetch wrapper với `{ success, data, message }` handling
- [ ] Utilities — `cn.ts` (clsx + tailwind-merge), formatters (VND currency, date)
- [ ] Zustand stores — authStore (user, isAuthenticated), uiStore (loading, toasts)
- [ ] Atomic UI components — Button, Card, Input, Badge, Modal, Spinner, Toast
- [ ] BottomNav — 5 tabs + Camera FAB (luôn hiển thị, FAB to hơn các tab)
- [ ] Pages stubs — Home, Journal, Reports, Profile, NotFound
- [ ] React Router routes
- [ ] React Query hooks + type definitions

**BottomNav spec (bắt buộc):**
```
[Hôm nay]  [Nhật ký]  [📸 Camera FAB]  [Nhìn lại]  [Cá nhân]
```
- Camera FAB: giữa, w-14 h-14, shadow-lg, memoir color
- FAB mở camera hoặc photo library picker
- Luôn hiển thị trên mọi màn hình

**Quy ước bắt buộc:**
- **100% Tailwind CSS** — không raw CSS (trừ `@import "tailwindcss"` trong index.css)
- Functional Components + Hooks only — không class components
- React Query cho server state, Zustand cho client state
- React Hook Form + Zod cho forms
- Lucide React cho icons

---

## Verification

```bash
# Docker
docker compose config --quiet  # pass

# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -c "from app.main import app; print('OK')"
ruff check app/  # 0 errors
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install
npm run build  # 0 TypeScript errors
```

---

## Phase tiếp theo

**Phase 2: Backend Core** — Authentication, Database Schema, Transaction/Wallet/Category APIs

Xem: `docs/PHASE-02.md`
