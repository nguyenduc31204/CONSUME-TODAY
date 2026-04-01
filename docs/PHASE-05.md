# Phase 5: Reports + Polish

**Mục tiêu:** Màn hình "Nhìn lại" (Reports), Profile/Settings, polish UX, và chuẩn bị deploy.

**Phụ thuộc:** Phase 4 (Frontend Core hoàn chỉnh)

---

## 5.1 — "Nhìn Lại" Reports Screen

### Mục tiêu

Màn hình báo cáo chi tiêu — biểu đồ tròn (theo danh mục), biểu đồ thanh (theo tuần/tháng).

### Layout

```
┌─────────────────────────────────────────────────┐
│  Nhìn lại                                        │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐              │
│  │ Tuần này    │  │ Tháng này    │ ← Toggle     │
│  └──────────────┘  └──────────────┘              │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Tổng chi tiêu                                  │
│  ┌─────────────────────────────────────────┐   │
│  │  1.250.000đ                             │   │
│  │  so với tuần trước: ▼ 12%              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Chi tiêu theo danh mục                         │
│  ┌─────────────────────────────────────────┐   │
│  │                                          │   │
│  │         [BIỂU ĐỒ TRÒN]                  │   │
│  │                                          │   │
│  │   Ăn uống    ████  450.000đ (36%)      │   │
│  │   Mua sắm    ███   380.000đ (30%)      │   │
│  │   Di chuyển  ██    220.000đ (18%)      │   │
│  │   ...        ██    200.000đ (16%)      │   │
│  │                                          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Chi tiêu theo ngày                             │
│  ┌─────────────────────────────────────────┐   │
│  │                                          │   │
│  │   [BIỂU ĐỒ THANH NGANG]                 │   │
│  │                                          │   │
│  │   T2  ████████████████  250.000đ        │   │
│  │   T3  ████████████      180.000đ        │   │
│  │   T4  ██████████████████████  320.000đ │   │
│  │   ...                                   │   │
│  │                                          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Time Period Toggle

| Option | Mô tả |
|---|---|
| Tuần này | 7 ngày gần nhất (bao gồm hôm nay) |
| Tháng này | Tháng hiện tại |
| Tháng trước | Tháng trước |
| Tùy chỉnh | Date range picker |

### API Integration

**Endpoint:** `GET /api/v1/reports/summary`

**Request params:**
```
?period=week|month|custom
?start_date=2025-01-01
?end_date=2025-01-31
?wallet_id=uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_amount": 1250000,
    "total_count": 18,
    "vs_previous_period": {
      "amount_change_pct": -12.5,
      "count_change_pct": -8.3
    },
    "by_category": [
      { "category": { "id": "uuid", "name": "Ăn uống", "icon": "utensils", "color": "#f97316" }, "amount": 450000, "count": 8, "pct": 36.0 },
      { "category": { "id": "uuid", "name": "Mua sắm", "icon": "shopping-bag", "color": "#ec4899" }, "amount": 380000, "count": 4, "pct": 30.4 }
    ],
    "by_day": [
      { "date": "2025-01-13", "amount": 250000, "count": 2 },
      { "date": "2025-01-14", "amount": 180000, "count": 3 }
    ]
  },
  "message": ""
}
```

### Backend Report Endpoint

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/reports/summary` | Required | Summary report (total, by category, by day) |

**SQL aggregation:**
```sql
SELECT
  c.id, c.name, c.icon, c.color,
  SUM(t.amount) as total_amount,
  COUNT(t.id) as count,
  SUM(t.amount) * 100.0 / NULLIF(SUM(SUM(t.amount)) OVER (), 0) as pct
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = :user_id
  AND t.deleted_at IS NULL
  AND t.is_life_log = FALSE
  AND t.transaction_date BETWEEN :start_date AND :end_date
GROUP BY c.id, c.name, c.icon, c.color
ORDER BY total_amount DESC
```

### Chart Components

**Pie Chart (biểu đồ tròn):**
- Dùng thư viện: `recharts` hoặc `chart.js` với React wrapper
- Mỗi slice: màu từ category.color
- Hover/tap: hiện chi tiết
- Center: tổng amount

**Bar Chart (biểu đồ thanh):**
- Thanh ngang, mỗi thanh = 1 ngày
- Màu: memoir-600
- Hover: tooltip với exact amount

---

## 5.2 — Profile + Settings Screen

### Mục tiêu

Màn hình "Cá nhân" — profile user, quản lý ví, quản lý danh mục, cài đặt app.

### Layout

```
┌─────────────────────────────────────────────────┐
│  Cá nhân                                        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  👤  Nguyễn Văn A                       │   │
│  │      nguyenvana@gmail.com                │   │
│  │      Tham gia: 01/2025                  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  💰 Ví của tôi                                  │
│  ┌─────────────────────────────────────────┐   │
│  │  🪪 Ví Cá nhân (Mặc định)              │   │
│  │  📊 Ví Du lịch                          │   │
│  │  ➕ Thêm ví mới                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  🏷️ Danh mục                                   │
│  ┌─────────────────────────────────────────┐   │
│  │  ☕ Ăn uống (8)                         │   │
│  │  🛍️ Mua sắm (4)                         │   │
│  │  🚗 Di chuyển (2)                       │   │
│  │  ...                                     │   │
│  │  ➕ Thêm danh mục                       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  📊 Số liệu thống kê                            │
│    Tổng giao dịch: 342                         │
│    Tổng chi tiêu: 15.8M                        │
│    Ảnh đã lưu: 289                             │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ⚙️ Cài đặt                                     │
│  ┌─────────────────────────────────────────┐   │
│  │  🌍 Ngôn ngữ          Tiếng Việt    → │   │
│  │  💱 Tiền tệ          VND            → │   │
│  │  🔔 Thông báo         Bật            → │   │
│  │  🔐 Bảo mật           ...            → │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  🚪 Đăng xuất                           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Profile Section

- Avatar (từ Firebase), tên, email
- "Tham gia" date từ user.created_at
- Tap → Edit profile (tên, avatar)

### Wallet Management

| Screen | Mô tả |
|---|---|
| Wallet List | Danh sách wallets, badge "Mặc định" |
| Create Wallet | Modal: name, icon (dropdown), color (picker) |
| Edit Wallet | Modal: name, icon, color |
| Delete Wallet | Confirmation + check (không có transactions mới xóa được) |

### Category Management

| Screen | Mô tả |
|---|---|
| Category List | Grid/List của categories trong wallet hiện tại |
| Create Category | Modal: name, icon (Lucide picker), color (color picker) |
| Edit Category | Modal với pre-filled data |
| Delete Category | Confirmation + check |

**Icon picker:** Grid 6x6 các Lucide icons phổ biến:
`UtensilsCrossed, ShoppingBag, Car, Film, Home, HeartPulse, Plane, Gift, Book, Music, Gamepad2, Shirt, Coffee, Pizza, Apple, Dumbbell, ...`

**Color picker:** Grid 12 màu phổ biến:
`#f97316, #ec4899, #3b82f6, #8b5cf6, #14b8a6, #ef4444, #22c55e, #f59e0b, #06b6d4, #6366f1, #84cc16, #64748b`

### Settings

| Setting | Mô tả | Options |
|---|---|---|
| Ngôn ngữ | Language preference | Tiếng Việt, English |
| Tiền tệ | Currency display | VND (₫), USD ($) |
| Thông báo | Push notifications (post-MVP) | Bật/Tắt |
| Bảo mật | Password, 2FA | — |

---

## 5.3 — Polish + UX Improvements

### Mục tiêu

Các chi tiết UX còn lại để đạt trải nghiệm hoàn chỉnh.

### Empty States

**Feed trống (chưa có transaction nào):**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│           📷                                    │
│                                                 │
│      Bắt đầu ghi nhận chi tiêu                 │
│                                                 │
│  Chụp ảnh hóa đơn hoặc ly cafe,               │
│  AI sẽ tự lo phần con số.                      │
│                                                 │
│      ┌─────────────────────┐                    │
│      │   📸 Chụp ảnh ngay  │                   │
│      └─────────────────────┘                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Calendar tháng trống:**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│           📅                                    │
│                                                 │
│      Tháng này chưa có ghi nhận nào            │
│                                                 │
│      Bạn có muốn ghi nhận                      │
│      chi tiêu hôm nay không?                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Loading States

- Feed: Skeleton cards (3 items)
- Calendar: Skeleton grid
- Reports: Skeleton charts
- Image upload: Spinner overlay on image

### Error States

- Network error: Toast notification + retry button
- OCR failed: "Không đọc được hóa đơn" → cho nhập tay
- Auth expired: Redirect to login

### Toast Notifications

| Type | Màu | Sử dụng |
|---|---|---|
| Success | Green | Transaction saved, wallet created |
| Error | Red | Lỗi network, lỗi API |
| Warning | Amber | OCR confidence thấp |
| Info | Blue | Tips, hints |

### Animations

- Card popup: slide-up from bottom + fade
- Auto-save countdown: progress bar animation
- Pull-to-refresh: spin + bounce
- Tab switch: fade transition
- Image upload: pulse + spinner

---

## 5.4 — Deploy Configuration

### Mục tiêu

Chuẩn bị production configuration và CI/CD.

### Docker Production Compose

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    volumes:
      - postgres_prod:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: memoirfinance
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/memoirfinance
      APP_ENV: production
    secrets:
      - firebase_credentials
      - anthropic_api_key

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: https://api.memoirfinance.com
    restart: always
    depends_on:
      - backend

volumes:
  postgres_prod:
```

### Environment Variables (Production)

```
# .env.production
POSTGRES_USER=prod_memoir
POSTGRES_PASSWORD=<strong_random_password>

FIREBASE_API_KEY=<from_firebase_console>
FIREBASE_PROJECT_ID=memoirfinance-prod
ANTHROPIC_API_KEY=<from_anthropic_console>

AWS_ACCESS_KEY_ID=<prod_s3_key>
AWS_SECRET_ACCESS_KEY=<prod_s3_secret>
AWS_S3_BUCKET=memoirfinance-prod-images

APP_ENV=production
APP_SECRET_KEY=<64_char_random_string>
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest tests/

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run build

  deploy:
    needs: [backend-test, frontend-test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      # Deploy to hosting (Vercel, Railway, Render, etc.)
```

---

## Summary

### Phase 5 Deliverables

| Sub-phase | Scope |
|---|---|
| 5.1 | "Nhìn lại" Reports — biểu đồ tròn (by category) + biểu đồ thanh (by day) + API endpoint |
| 5.2 | Profile/Settings — profile, wallet management, category management, settings |
| 5.3 | Polish — empty states, loading states, error states, toast notifications, animations |
| 5.4 | Deploy — docker-compose.prod.yml, production env template, GitHub Actions CI/CD |

### Success Criteria

- [ ] "Nhìn lại": biểu đồ tròn hiển thị chi tiêu theo danh mục
- [ ] "Nhìn lại": biểu đồ thanh hiển thị chi tiêu theo ngày
- [ ] Toggle Tuần / Tháng hoạt động đúng
- [ ] Profile: avatar, tên, email
- [ ] Wallet CRUD: tạo, sửa, xóa wallets
- [ ] Category CRUD: tạo, sửa, xóa categories với icon/color picker
- [ ] Settings: ngôn ngữ, tiền tệ
- [ ] Empty states cho Feed và Calendar
- [ ] Loading states skeleton
- [ ] Error states với retry
- [ ] Toast notifications cho mọi action
- [ ] Production Docker compose
- [ ] CI/CD pipeline

### Phase tiếp theo

**Post-MVP Roadmap** — Các tính năng sau MVP (AI Parent-Children OCR, Shared Wallets, Visual Mosaic, Mobile App, Push Notifications)

Xem: `docs/PHASE-POST-MVP.md`
