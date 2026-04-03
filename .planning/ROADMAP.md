# Roadmap: MemoirFinance

## Overview

Xây dựng MemoirFinance — nền tảng nhật ký sống lấy hình ảnh làm trung tâm — từ greenfield đến production. 6 phase từ nền tảng hạ tầng, qua backend core + AI OCR, đến frontend, báo cáo, và CI/CD/deploy. Zero onboarding, AI auto-save sau 3 giây, Life Log photos.

## Phases

- [ ] **Phase 1: Nền tảng** — Dev environment, full project structure, GSD workflow
- [ ] **Phase 2: Backend Core** — FastAPI + PostgreSQL + Auth + Transaction/Wallet/Category APIs
- [ ] **Phase 3: AI OCR + Life Log** — AI OCR invoice processing, Cloudflare R2 image storage, Life Log flow
- [ ] **Phase 4: Frontend Core** — "Hôm Nay" Feed + Camera FAB + Journal (Calendar + Grid views)
- [ ] **Phase 5: Nhìn Lại + Polish** — Reports/charts, Profile/Settings, UX polish hoàn chỉnh
- [ ] **Phase 6: CI/CD + Deploy** — Production infrastructure, GitHub Actions pipeline, monitoring, launch

## Phase Details

### Phase 1: Nền tảng
**Goal**: Development environment ready, full project structure in place, GSD workflow initialized
**Depends on**: Nothing (first phase)
**Requirements**: None (planning/infrastructure only)
**Success Criteria** (what must be TRUE):
  1. `git log` shows commits with proper structure
  2. `.planning/` has: config.json, PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md
  3. `docker compose config` passes
  4. `cd backend && pip install -r requirements.txt && uvicorn app.main:app --help` works
  5. `cd frontend && npm install && npm run build` passes without errors
**Plans**: 4 plans

Plans:
- [ ] 01-01: Git + GSD Planning Structure + Project Artifacts
- [ ] 01-02: Docker + Infrastructure Config (.env.example, docker-compose.yml, Dockerfiles)
- [ ] 01-03: Backend Scaffold (FastAPI + Hexagonal, requirements.txt, app structure)
- [ ] 01-04: Frontend Scaffold (React + Vite + Tailwind, project structure)

---

### Phase 2: Backend Core
**Goal**: Complete FastAPI backend with PostgreSQL, Google OAuth 2.0 + Custom JWT, Transaction/Wallet/Category APIs
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, WALL-01, WALL-02
**Success Criteria** (what must be TRUE):
  1. User can login with Google/Apple via Google OAuth 2.0 + Custom JWT (RS256)
  2. User can create custom categories
  3. User can create/view wallets
  4. User can create/read/update/delete transactions
  5. System auto-creates default wallet + 6 default categories on first login
  6. All API responses follow `{ success, data, message }` envelope
  7. PostgreSQL schema: snake_case, UUID PK, audit cols (created_at, updated_at, deleted_at)
**Plans**: 4 plans (TBD — planned during Phase 1)

Plans:
- [ ] 02-01: Database Schema + Migrations (PostgreSQL with Alembic)
- [ ] 02-02: Google OAuth 2.0 + Custom JWT Authentication + User Management
- [ ] 02-03: Wallet & Category APIs
- [ ] 02-04: Transaction API + Business Logic

---

### Phase 3: AI OCR + Life Log
**Goal**: AI OCR invoice processing, Cloudflare R2 image storage, Life Log photo flow, auto-save mechanism
**Depends on**: Phase 2
**Requirements**: OCR-01, LIFE-01
**Success Criteria** (what must be TRUE):
  1. User uploads image → AI OCR extracts: merchant, amount, date, category in < 2s
  2. Image saved to Cloudflare R2, URL stored in database
  3. Transaction created with AI-extracted data, auto-saves after 3 seconds
  4. Life Log photo (no receipt) → saved with 0đ amount, tagged as "Life Log"
  5. User can edit any field post-save (Human-in-the-loop)
  6. Total amount validation: system compares OCR total vs sum of items
  7. User can add cost to Life Log photo → converts to transaction
**Plans**: 3 plans (TBD — planned during Phase 2)

Plans:
- [ ] 03-01: Image Upload + Cloudflare R2 Storage Adapter
- [ ] 03-02: AI OCR Integration (Claude API + few-shot prompting + validation)
- [ ] 03-03: Auto-Save + Life Log Flow

---

### Phase 4: Frontend Core
**Goal**: Full React frontend — Home Feed, Camera FAB, Journal Calendar/Grid views
**Depends on**: Phase 2 (API ready), Phase 3 (upload/OCR ready)
**Requirements**: HOME-01, HOME-02, JOUR-01, JOUR-02
**Success Criteria** (what must be TRUE):
  1. "Hôm Nay" tab renders vertical feed with photo cards (amount, category, time, wallet)
  2. Camera FAB visible on all screens, opens camera/photo library
  3. Card popup appears < 2s after photo, auto-saves after 3s (or user edits)
  4. "Nhật ký" tab: Calendar view with month grid, 1 photo/day cell, "+N" badge
  5. "Nhật ký" tab: Grid view with photo gallery, semi-transparent amount overlay
  6. Calendar ↔ Grid toggle works correctly
  7. Bottom Nav: Hôm nay | Nhật ký | 📸 Camera FAB | Nhìn lại | Cá nhân
**Plans**: 3 plans (TBD — planned during Phase 3)

Plans:
- [ ] 04-01: Bottom Navigation + Camera FAB + App Shell
- [ ] 04-02: Home Feed ("Hôm Nay") + Card Popup + Quick Edit
- [ ] 04-03: Journal (Calendar + Grid views)

---

### Phase 5: Nhìn Lại + Polish
**Goal**: Reports/charts, profile/settings, complete UX polish
**Depends on**: Phase 4
**Requirements**: REPO-01, (AUTH-02 polish)
**Success Criteria** (what must be TRUE):
  1. "Nhìn lại" tab: pie chart showing spending by category
  2. "Nhìn lại" tab: bar chart showing spending by week/month
  3. "Cá nhân" tab: profile, wallet management, category management, settings
  4. Zero onboarding: new user logs in → lands directly on "Hôm Nay"
  5. First login auto-creates: 1 default wallet + 6 default categories
  6. Complete UX polish: empty states, loading skeletons, error states, toast notifications, animations
  7. No `print()` statements anywhere in codebase
**Plans**: 3 plans (planned during Phase 4)

Plans:
- [ ] 05-01: Reports ("Nhìn Lại") — pie/bar charts
- [ ] 05-02: Profile + Settings — profile, wallet CRUD, category CRUD, app settings
- [ ] 05-03: UX Polish — empty states, loading skeletons, error states, toast notifications, animations

---

### Phase 6: CI/CD + Deploy
**Goal**: Production infrastructure, GitHub Actions CI/CD pipeline, monitoring, launch
**Depends on**: Phase 5
**Requirements**: All previous phases complete
**Success Criteria** (what must be TRUE):
  1. `docker-compose.prod.yml` runs correctly (postgres, backend, frontend)
  2. CI pipeline: backend lint + type-check + test pass
  3. CI pipeline: frontend lint + type-check + test pass
  4. CD: auto-deploy on main push
  5. Health check endpoint returns DB + R2 + AI status
  6. Structured logging in correct format
  7. SSL certificate valid (Cloudflare Origin or Let's Encrypt)
  8. Pre-launch checklist completed
**Plans**: 5 plans (planned during Phase 5)

Plans:
- [ ] 06-01: Production Docker Compose + Dockerfiles (multi-stage)
- [ ] 06-02: GitHub Actions CI/CD Pipeline — lint → test → build → deploy
- [ ] 06-03: Monitoring + Observability — structured logging, health check, Sentry
- [ ] 06-04: Domain + SSL + CDN — Nginx, Cloudflare SSL, R2 CDN
- [ ] 06-05: Launch Checklist — pre-launch verification, launch sequence

---

## Progress

**Execution Order:**
Phases execute in numeric order.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Nền tảng | 0/4 | In progress | - |
| 2. Backend Core | 0/4 | Not started | - |
| 3. AI OCR + Life Log | 0/3 | Not started | - |
| 4. Frontend Core | 0/3 | Not started | - |
| 5. Nhìn lại + Polish | 0/3 | Not started | - |
| 6. CI/CD + Deploy | 0/5 | Not started | - |
