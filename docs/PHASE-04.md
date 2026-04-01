# Phase 4: Frontend Core

**Mục tiêu:** Frontend hoàn chỉnh — màn hình "Hôm Nay" Feed, Camera FAB, trải nghiệm chụp ảnh, Journal views.

**Phụ thuộc:** Phase 2 (API ready), Phase 3 (OCR ready)

---

## 4.1 — App Shell + Navigation

### Mục tiêu

Xây dựng App Shell hoàn chỉnh — Bottom Navigation, Camera FAB, Layout structure.

### Bottom Navigation (Spec bắt buộc)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│           [Page Content Area]                   │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│  [Hôm nay] [Nhật ký] [📸 FAB] [Nhìn lại] [Cá nhân] │
└─────────────────────────────────────────────────┘
```

**5 tabs:**
| Tab | Route | Icon (Lucide) | Label |
|---|---|---|---|
| Hôm nay | `/home` | `Home` | "Hôm nay" |
| Nhật ký | `/journal` | `CalendarDays` | "Nhật ký" |
| Camera FAB | — (không có route) | `Camera` | — |
| Nhìn lại | `/reports` | `BarChart3` | "Nhìn lại" |
| Cá nhân | `/profile` | `User` | "Cá nhân" |

**Camera FAB spec:**
- Position: giữa tuyệt đối (tính toán chính xác giữa tab 2 và tab 4)
- Size: `w-14 h-14` (56x56px), to hơn các tab
- Style: `bg-memoir-600 text-white rounded-full shadow-xl shadow-memoir-600/30`
- Icon: `Camera` từ Lucide, `size={28}`
- Elevated: `z-50`, luôn hiển thị trên mọi màn hình
- Active tab: `text-memoir-600 font-semibold`
- Inactive tab: `text-gray-400`
- Tab label font: `text-xs`

**Navigation implementation:**
- React Router v7 (BrowserRouter)
- NavLink cho active state detection
- Camera FAB dùng `onClick` dispatch event hoặc callback
- Layout component wrap tất cả pages (BottomNav always visible)

### App Layout Component

```tsx
// src/components/layout/AppLayout.tsx
<BrowserRouter>
  <QueryClientProvider>
    <div className="flex flex-col h-screen">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />  {/* Current page content */}
      </main>
      <BottomNav /> {/* Always at bottom */}
    </div>
    <ToastContainer />
  </QueryClientProvider>
</BrowserRouter>
```

### Theme + Design System

**Colors (Tailwind custom theme):**
```css
/* memoir color palette */
.memoir-50  → #faf5ff
.memoir-100 → #f3e8ff
.memoir-200 → #e9d5ff
.memoir-500 → #a855f7
.memoir-600 → #9333ea  /* Primary */
.memoir-700 → #7e22ce
.memoir-900 → #4a044e

/* Semantic colors */
.bg-expense   → #fee2e2 (đỏ nhạt cho chi tiêu)
.bg-income    → #dcfce7 (xanh nhạt cho thu nhập)
```

**Typography:**
- Font: System font stack (sans)
- Headings: `font-semibold text-gray-900`
- Body: `text-gray-700`
- Muted: `text-gray-400 text-sm`

**Spacing:** Tailwind default scale

---

## 4.2 — "Hôm Nay" Feed Screen

### Mục tiêu

Màn hình home — vertical feed hiển thị transactions của ngày hiện tại, cuộn xuống là ngày trước.

### UX Flow

```
1. User mở app → vào thẳng "Hôm Nay" (không có onboarding)
2. Feed hiển thị transactions hôm nay (mới nhất trên cùng)
3. Cuộn xuống → hiển thị transactions ngày hôm qua → ngày trước nữa
4. User tap card → mở Transaction Detail (editable)
```

### API Integration

**Endpoint:** `GET /api/v1/transactions`

**React Query hook:**
```typescript
function useTransactions(filters: {
  wallet_id?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  is_life_log?: boolean;
  limit?: number;
  cursor?: string;
}) {
  // infinite query cho feed vô hạn (scroll)
  return useInfiniteQuery({
    queryKey: ["transactions", filters],
    queryFn: ({ pageParam }) => fetchTransactions({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    initialPageParam: undefined,
  });
}
```

### Transaction Card Component

```
┌──────────────────────────────────────────────────┐
│  [📷 Ảnh thumbnail]                               │
│  ┌────────────────────────────────────────────┐  │
│  │  ☕ The Coffee House              75.000đ  │  │
│  │  Ăn uống · Ví Cá nhân           12:30 PM  │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Card states:**
- **Default:** Background white, shadow-sm
- **Hover:** shadow-md, scale(1.01)
- **Life Log:** Badge "Life Log" thay vì amount
- **Pending (auto-save countdown):** Opacity thấp hơn, countdown indicator

**Card layout:**
- Image: `w-full h-48 object-cover rounded-t-xl`
- Amount: `text-lg font-bold text-gray-900` (VND formatter)
- Merchant: `text-sm font-medium text-gray-700`
- Category + Wallet: `text-xs text-gray-400`
- Time: `text-xs text-gray-400`

### Date Grouping

```
Today
  ├── [Card] 12:30 PM - The Coffee House - 75.000đ
  └── [Card] 8:00 AM - Bữa sáng - 120.000đ

Yesterday
  ├── [Card] 6:00 PM - Co.opmart - 450.000đ
  └── ...

January 14, 2025
  ├── [Card] ...
  └── ...
```

**Date header:** `sticky top-0 bg-white px-4 py-2 text-sm font-semibold text-gray-500`

### Pull-to-Refresh

Kéo xuống → refetch transactions → cập nhật feed.

---

## 4.3 — Camera Capture + Card Popup

### Mục tiêu

Trải nghiệm chụp ảnh hoàn chỉnh — Camera FAB → chụp/chọn ảnh → AI xử lý → Card popup → auto-save.

### Camera FAB Behavior

**Tap FAB → hiển thị bottom sheet hoặc modal:**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Chọn ảnh để ghi nhận chi tiêu                 │
│                                                 │
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │                 │  │                 │       │
│  │   📷 Camera    │  │   🖼️ Thư viện  │       │
│  │                 │  │                 │       │
│  │   Chụp ảnh     │  │   Chọn ảnh     │       │
│  └─────────────────┘  └─────────────────┘       │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Camera capture:** Sử dụng `<input type="file" accept="image/*" capture="environment">`
**Photo library:** `<input type="file" accept="image/*">`

### Upload + OCR Flow

```
1. User chọn ảnh (camera hoặc thư viện)
2. Frontend: hiển thị loading state + "Đang xử lý AI..."
3. Frontend: POST /api/v1/transactions/upload (multipart/form-data)
4. Backend: upload S3 → Claude OCR → tạo Transaction draft
5. Backend: trả về OCR result + transaction_id + auto_save_in_seconds=3
6. Frontend: hiển thị Card Popup
```

### Card Popup (OCR Result)

```
┌─────────────────────────────────────────────────┐
│                                          [✕]  │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │          [📷 Full-size Image]            │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ☕ The Coffee House                             │
│                                                 │
│  75.000đ · F&B                                  │
│                                                 │
│  Ví Cá nhân                                     │
│                                                 │
│  ─────────────────────────────────────────     │
│                                                 │
│  [Chạm để sửa]                                 │
│                                                 │
│  ████████░░░░  Auto-save trong 3s              │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Auto-save countdown bar:** Progress bar animation 3s → 0

**Tap card (hoặc "Chạm để sửa"):**
- Mở Quick Edit bottom sheet
- Hủy auto-save countdown
- User có thể sửa: amount, category, wallet, merchant, date

**Đợi 3 giây không tap:**
- Frontend: gọi `POST /api/v1/transactions/{id}/confirm`
- Backend: update status → 'confirmed'
- Card biến mất khỏi popup
- Transaction xuất hiện trong Feed

### Quick Edit Bottom Sheet

```
┌─────────────────────────────────────────────────┐
│  ══════════ (drag handle)                       │
│                                                 │
│  Sửa giao dịch                                  │
│                                                 │
│  [Ảnh thumbnail nhỏ]                           │
│                                                 │
│  Số tiền                                        │
│  ┌─────────────────────────────────────────┐   │
│  │  75.000                                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Danh mục                                       │
│  ┌─────────────────────────────────────────┐   │
│  │  ☕ Ăn uống                         ▼   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Ví                                            │
│  ┌─────────────────────────────────────────┐   │
│  │  Ví Cá nhân                         ▼   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Cửa hàng                                       │
│  ┌─────────────────────────────────────────┐   │
│  │  The Coffee House                        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Ngày                                          │
│  ┌─────────────────────────────────────────┐   │
│  │  15/01/2025                             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │           💾 Lưu giao dịch               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Forms:** React Hook Form + Zod validation

---

## 4.4 — Journal Screen (Calendar + Grid)

### Mục tiêu

Màn hình "Nhật ký" với Calendar view và Grid/Gallery view, toggle giữa 2 modes.

### Layout

```
┌─────────────────────────────────────────────────┐
│  Nhật ký                                        │
│                                                 │
│  [Calendar]  [Grid]        ← Toggle switch      │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│         [Content Area]                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Toggle:** Segmented control (2 options), active = memoir-600 background

### Calendar View

```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ T2  │ T3  │ T4  │ T5  │ T6  │ T7  │ CN  │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│     │     │     │     │     │  1  │  2  │
│     │  ⬤  │     │     │     │ 📷  │     │
│     │ +2  │     │     │     │     │     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  3  │  4  │  5  │  6  │  7  │  8  │  9  │
│ 📷  │     │ 📷  │     │ 📷  │     │     │
│     │     │ +1  │     │ +3  │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

**Mỗi ô ngày:**
- 1 thumbnail ảnh đại diện (AI chọn ảnh đẹp nhất hoặc transaction lớn nhất)
- Badge "+N" ở góc nếu có nhiều ảnh
- Ngày hiện tại: border memoir-600
- Ngày có transaction: thumbnail hiển thị
- Ngày không có: empty state (gray-50 background)

**Tap vào ô ngày:**
→ Mở Day Detail modal/sheet:
```
┌─────────────────────────────────────────────────┐
│  Thứ Năm, 16 Tháng 01, 2025                     │
│  2 giao dịch · Tổng: 180.000đ                  │
│                                                 │
│  ┌───────┐ ┌───────┐                           │
│  │ 📷    │ │ 📷    │                           │
│  │ 75k   │ │ 105k  │                           │
│  └───────┘ └───────┘                           │
│                                                 │
│  [The Coffee House] [75.000đ] [Ăn uống]         │
│  [Co.opmart]       [105.000đ] [Mua sắm]        │
└─────────────────────────────────────────────────┘
```

**Month navigation:** Chevron left/right → fetch + render previous/next month

### Grid/Gallery View

```
┌────────┬────────┬────────┐
│  📷   │  📷   │  📷   │
│ 75.000đ│ Life  │ 200.000đ│
├────────┼────────┼────────┤
│  📷   │  📷   │  📷   │
│ 120.000đ│ 45.000đ│ Life  │
└────────┴────────┴────────┘
```

**Grid layout:** 3 columns, masonry-style hoặc uniform squares
**Amount overlay:** `absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center`
**Life Log:** Badge "Life Log" thay vì amount
**Tap ảnh:** → Transaction Detail screen

---

## 4.5 — Transaction Detail Screen

### Mục tiêu

Màn hình chi tiết transaction — xem, sửa, xóa, thêm chi phí vào Life Log.

### URL: `/transactions/:id`

### Layout

```
┌─────────────────────────────────────────────────┐
│  ←  Chi tiết giao dịch                  [🗑️]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │         [Full-size Image]                │  │
│  │                                          │  │
│  │  (tap để phóng to)                      │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ☕ The Coffee House                             │
│  75.000đ                                       │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Danh mục     Ăn uống              [→]       │
│  Ví          Ví Cá nhân         [→]           │
│  Ngày        15/01/2025         [→]           │
│  Trạng thái  Đã xác nhận      [→]           │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  💾 Sửa giao dịch                        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  (Nếu là Life Log: thêm nút [+ Thêm chi phí])  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Image viewer:** Tap ảnh → full-screen viewer với pinch-to-zoom

**Sửa giao dịch:** Mở form với React Hook Form + Zod, pre-filled data

**Thêm chi phí (Life Log):**
```
1. Button: "+ Thêm chi phí"
2. Mở inline form: nhập số tiền + chọn category
3. Save → PATCH /transactions/{id} → is_life_log = false, amount = input
4. UI: thay "Life Log" badge bằng amount
```

**Xóa giao dịch:**
```
1. Tap 🗑️ icon
2. Confirmation modal: "Xóa giao dịch này?"
3. CONFIRM → DELETE /transactions/{id}
4. Navigate back to Feed
```

---

## Summary

### Phase 4 Deliverables

| Sub-phase | Scope |
|---|---|
| 4.1 | App Shell — BottomNav (5 tabs + Camera FAB), AppLayout, theme/design system |
| 4.2 | "Hôm Nay" Feed — vertical scroll, date grouping, TransactionCard, infinite query |
| 4.3 | Camera Capture — FAB → file input → OCR → Card Popup → auto-save countdown → Quick Edit |
| 4.3 | Quick Edit — bottom sheet với RHF+Zod form |
| 4.4 | Journal — Calendar view (month grid, +N badge, day detail) + Grid/Gallery view + toggle |
| 4.5 | Transaction Detail — image viewer, edit form, delete, thêm chi phí cho Life Log |

### Success Criteria

- [ ] BottomNav: 5 tabs + Camera FAB centered, luôn hiển thị
- [ ] "Hôm Nay": vertical feed với date grouping, infinite scroll
- [ ] Tap FAB: hiển thị Camera/Library options
- [ ] Chọn ảnh → Card Popup với OCR result sau < 2s
- [ ] Auto-save countdown 3s, có thể tap để sửa
- [ ] Quick Edit: bottom sheet với amount, category, wallet, merchant, date
- [ ] Journal Calendar: month grid, thumbnail/ngày, +N badge, tap → day detail
- [ ] Journal Grid: 3-column gallery, amount overlay, tap → detail
- [ ] Calendar ↔ Grid toggle hoạt động đúng
- [ ] Transaction Detail: xem ảnh, sửa, xóa, thêm chi phí vào Life Log

### Phase tiếp theo

**Phase 5: Reports + Polish** — "Nhìn lại" charts, Profile/Settings, deploy-ready

Xem: `docs/PHASE-05.md`
