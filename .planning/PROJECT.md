# MemoirFinance

## What This Is

MemoirFinance là nền tảng **nhật ký sống (Life Log)** lấy hình ảnh làm trung tâm, trong đó quản lý tiền bạc là **giá trị tăng thêm tự động** được sinh ra từ hành vi cốt lõi: chụp ảnh và lưu giữ kỷ niệm. Không phải app quản lý tài chính — mà là cuốn nhật ký hình ảnh mang tính hoài niệm, thẩm mỹ, nơi AI lo phần con số.

**Đối tượng:** Millennials & Gen Z (25–35 tuổi), nhân viên văn phòng, freelancer, cặp vợ chồng trẻ — những người ghét sự khô khan của app tài chính truyền thống và lười nhập liệu thủ công.

## Core Value

**"Lưu giữ khoảnh khắc bằng hình ảnh, AI sẽ lo phần con số."**

Mọi thiết kế, quyết định ưu tiên hành vi chụp ảnh — không phải form nhập liệu.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **AUTH-01**: Social Login (Google, Apple) — 1 tap vào app, không email/password
- [ ] **AUTH-02**: Zero onboarding — vào thẳng "Hôm nay", không wizard
- [ ] **HOME-01**: "Hôm nay" Feed screen — vertical scroll, mỗi ảnh là 1 card lớn
- [ ] **HOME-02**: Camera FAB — luôn hiển thị, nổi bật, mở camera hoặc chọn ảnh
- [ ] **OCR-01**: AI OCR invoice reading — đọc tổng tiền, tên cửa hàng, ngày, phân loại tự động
- [ ] **JOUR-01**: Calendar view — lịch tháng, 1 ảnh/ô, badge "+N"
- [ ] **JOUR-02**: Grid/Gallery view — gallery ảnh, số tiền phủ mờ góc
- [ ] **WALL-01**: Personal wallet — 1 ví mặc định, tạo sẵn khi đăng ký
- [ ] **WALL-02**: Custom categories — tự tạo danh mục chi tiêu
- [ ] **LIFE-01**: Life Log photos — ảnh không có hóa đơn, lưu như kỷ niệm, số tiền = 0đ
- [ ] **REPO-01**: "Nhìn lại" reports — biểu đồ tròn/thanh truyền thống

### Out of Scope

- **HabitFriend (Thói quen trực quan)** — Loại hoàn toàn để giữ sản phẩm tập trung Life Log + Tài chính
- **Offline mode** — Không nằm trong scope MVP
- **Email/Password login** — Chỉ social login để tối giản
- **Onboarding wizard** — Zero-friction, vào thẳng app
- **Mobile app (iOS/Android)** — Web App MVP, mobile sau
- **Push notifications** — Không trong MVP
- **Shared wallets / Multi-tenant** — Sau MVP
- **AI Parent-Children OCR (supermarket item-level)** — Sau MVP
- **AI bank transfer OCR (Momo, VCB, ZaloPay)** — Sau MVP
- **AI learns from corrections** — Sau MVP
- **Visual Mosaic recap** — Biểu đồ truyền thống trong MVP, mosaic sau
- **Wishlist** — Sau MVP

## Context

- **Sản phẩm:** MemoirFinance v1.0 (Web App MVP)
- **Thị trường:** Việt Nam — người dùng trẻ, quen chụp ảnh, ghét nhập liệu
- **Đã có:** Feature_Truth.md (Product spec chi tiết), docs/architecture.md (Hexagonal/DDD), 7 rule files (coding conventions)
- **Triết lý thiết kế:**
  - Bức ảnh là đơn vị nguyên tử — mọi thứ xoay quanh ảnh, không phải con số
  - Zero-tap mặc định, Escape Hatch luôn sẵn — AI lo hết, user luôn có nút thoát
  - Memoir, không phải Accounting — cảm xúc hoài niệm, không phải áp lực kế toán

## Constraints

- **Platform MVP:** Web App — Mobile sau MVP
- **Tech Stack:** React 19 + Vite + Tailwind (frontend), FastAPI + PostgreSQL (backend), Claude API (AI OCR)
- **Offline:** Không support — đây là Web App đơn thuần
- **Monetization:** Hoàn toàn miễn phí — không paywall, không giới hạn tính năng
- **AI Provider:** Claude API (Anthropic) cho MVP — dễ implement, few-shot prompting
- **Package Manager (Python):** venv + requirements.txt — không uv, không Poetry
- **Package Manager (Node):** npm — tiêu chuẩn

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web App MVP (không mobile) | Feature_Truth spec, giảm scope ban đầu | — Pending |
| Hexagonal Architecture + DDD | Cô lập business logic khỏi framework, dễ mở rộng | — Pending |
| React 19 + Vite + Tailwind v4 | Feature_Truth spec, modern stack | — Pending |
| FastAPI + SQLAlchemy + Alembic | Feature_Truth spec, Python ecosystem | — Pending |
| Firebase Auth (Google + Apple) | Feature_Truth spec — social login only | — Pending |
| Claude API cho AI OCR | Few-shot prompting, JSON output, dễ validate | — Pending |
| AWS S3 cho image storage | Feature_Truth spec, production-ready | — Pending |
| PostgreSQL với UUID PK + audit cols | Rule 02 — scalability, auditability | — Pending |
| Zero onboarding | Feature_Truth — UX principle | — Pending |
| AI Auto-save sau 3s | Feature_Truth — zero-tap principle | — Pending |

---

*Last updated: 2026-04-01 after initialization*
