# State: MemoirFinance

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-01)

**Core value:** "Lưu giữ khoảnh khắc bằng hình ảnh, AI sẽ lo phần con số."
**Current focus:** Phase 3: AI OCR + Life Log — ✅ COMPLETE

---

## Phase Status

| Phase | Status | Plans | Completed |
|-------|--------|-------|-----------|
| 1. Nền tảng | ✅ Complete | 4/4 | 2026-04-01 |
| 2. Backend Core | ✅ Complete | 4/4 | 2026-04-01 |
| 3. AI OCR + Life Log | ✅ Complete | 3/3 | 2026-04-01 |
| 4. Frontend Core | ⏳ Not started | — | — |
| 5. Nhìn lại + Polish | ⏳ Not started | — | — |

---

## Decisions Log

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web App MVP | Feature_Truth spec: web-first, mobile after | ✅ Confirmed |
| Hexagonal Architecture | Rule 01: Domain/Application/Infrastructure separation | ✅ Implemented |
| React 19 + Vite + Tailwind v3 | Feature_Truth spec | ✅ Implemented |
| FastAPI + SQLAlchemy + Alembic | Feature_Truth spec | ✅ Implemented |
| Google OAuth 2.0 + JWT (RS256) | Feature_Truth spec: social login only | ✅ Implemented |
| Flask-alembic → python-alembic | alembic/ folder shadowed package | ✅ Renamed to migrations/ |
| Claude API for AI OCR | Few-shot prompting, JSON output | ✅ Implemented (claude-sonnet-4) |
| Cloudflare R2 for image storage | S3-compatible + Pillow preprocessing | ✅ Implemented (async boto3) |
| PostgreSQL UUID PK + audit cols | Rule 02: scalability + auditability | ✅ Migration ready |
| venv + requirements.txt | User-specified: no uv, no Poetry | ✅ Confirmed |
| Zero onboarding | Feature_Truth UX principle | ✅ Scaffolded (Phase 2) |
| AI Auto-save after 3s | Feature_Truth: zero-tap principle | ✅ Implemented (Phase 3) |
| Transaction status (pending/confirmed) | Auto-save mechanism: create as pending, confirm after 3s | ✅ Implemented (Phase 3) |
| Pillow image preprocessing | Resize ≤2000px, auto-orient EXIF, compress <500KB, thumbnail 400px | ✅ Implemented (Phase 3) |
| Base64 for Claude OCR | Send preprocessed image bytes directly for better accuracy | ✅ Implemented (Phase 3) |

---

## Phase 1 Execution Log

| Plan | Status | Commit | Notes |
|------|--------|--------|-------|
| 01-01 | ✅ Done | 8b6d19a | Git + GSD Planning + Project Artifacts |
| 01-02 | ✅ Done | b84f3d0 | Docker + Infrastructure Config |
| 01-03 | ✅ Done | f4e4f36 | Backend Scaffold (Hexagonal, FastAPI, Alembic, 27 tests) |
| 01-04 | ✅ Done | f4e4f36 | Frontend Scaffold (React 19, BottomNav+Camera FAB, 0 TS errors) |

---

## Phase 2 Execution Log

| Plan | Status | Commit | Notes |
|------|--------|--------|-------|
| 02-01 | ✅ Done | — | 4 SQLAlchemy repo impls + alembic→migrations rename + stamp |
| 02-02 | ✅ Done | — | JWT RS256 + Google OAuth + Auth routes + AuthenticateUseCase |
| 02-03 | ✅ Done | — | Wallet CRUD + Category CRUD with owner validation |
| 02-04 | ✅ Done | — | Transaction CRUD + upload stub (Phase 3 full OCR) |

---

## Phase 3 Execution Log

| Plan | Status | Notes |
|------|--------|-------|
| 03-01 | ✅ Done | ImageModel + Migration 003 + R2StorageAdapter (async boto3) + ImageRepositoryImpl + /images/upload endpoint + Pillow preprocessing (resize/EXIF/compress <500KB + thumbnail) |
| 03-02 | ✅ Done | ClaudeOcrAdapter wired (base64 bytes, claude-sonnet-4) + CategoryMapper + OcrResult dataclass + /ocr/analyze endpoint + OcrValidationService |
| 03-03 | ✅ Done | Migration 004 (transaction_status) + STATUS_PENDING/STATUS_CONFIRMED on Transaction + /transactions/upload (combined flow) + /transactions/{id}/confirm + /transactions/{id}/edit + /transactions/{id}/convert-to-expense |

---

## Verification Results (Phase 3)

```
Backend: python -c "from src.main import app"          ✅ App loads OK
Backend: pytest tests/unit/                          ✅ 27/27 passed
Backend: R2StorageAdapter (async boto3)              ✅ ThreadPoolExecutor for blocking I/O
Backend: ClaudeOcrAdapter (claude-sonnet-4)          ✅ Base64 image bytes + few-shot prompt
Backend: Pillow preprocessing                        ✅ EXIF auto-orient, resize ≤2000px, compress <500KB
Backend: /api/v1/images/upload                       ✅ Registered
Backend: /api/v1/ocr/analyze                         ✅ Registered
Backend: /api/v1/transactions/upload                 ✅ Full OCR flow (R2 → Claude → DB)
Backend: /api/v1/transactions/{id}/confirm           ✅ Confirms pending → confirmed
Backend: /api/v1/transactions/{id}/edit              ✅ Returns transaction + wallets + categories
Backend: /api/v1/transactions/{id}/convert-to-expense ✅ Life log → expense conversion
```

---

## Backend API Summary (Phase 3)

### Images
| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| POST | /api/v1/images/upload | ✅ | Upload image → R2 → DB record |
| GET | /api/v1/images/{id} | ✅ | Get image metadata |
| DELETE | /api/v1/images/{id} | ✅ | Soft-delete + R2 cleanup |

### OCR
| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| POST | /api/v1/ocr/analyze | ✅ | Analyze image → Claude OCR → structured result (no DB save) |

### Transactions
| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| GET | /api/v1/transactions | ✅ | List with filters |
| GET | /api/v1/transactions/{id} | ✅ | Get single |
| POST | /api/v1/transactions/upload | ✅ | Upload → OCR → create pending transaction |
| POST | /api/v1/transactions/{id}/confirm | ✅ | Confirm pending transaction (auto-save) |
| GET | /api/v1/transactions/{id}/edit | ✅ | Quick Edit: transaction + wallets + categories |
| PATCH | /api/v1/transactions/{id} | ✅ | Update any field |
| POST | /api/v1/transactions/{id}/convert-to-expense | ✅ | Life log → financial expense |
| DELETE | /api/v1/transactions/{id} | ✅ | Soft-delete |

---

*Last updated: 2026-04-01 after Phase 3 — ALL COMPLETE*
