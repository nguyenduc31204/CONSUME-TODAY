# Phase 8: Timeline Calendar — Memories on Calendar

## Mục tiêu
Hiển thị kỷ niệm trên **lịch/tháng** — xem ngày nào có bao nhiêu kỷ niệm, tap vào ngày để xem chi tiết.

## 8.1 UX Design

```
┌──────────────────────────────────────┐
│  ◀  Tháng 4, 2026  ▶   [Hôm nay]   │
├──────────────────────────────────────┤
│  CN  T2  T3  T4  T5  T6  T7        │
│  ..  ..  ..  ..  1   2   3   ← dots │
│  4   5   6   7   8   9   10        │
│  ●   ●   ●   ..  ●●  ●   ..        │
│  ...                                │
└──────────────────────────────────────┘
```
- ● = ngày có kỷ niệm (size theo số lượng)
- Tap vào ngày → bottom sheet danh sách kỷ niệm ngày đó
- Swipe trái/phải → chuyển tháng

## 8.2 Backend Endpoints

### GET /api/v1/calendar/month
Số kỷ niệm mỗi ngày trong tháng.

```json
GET /api/v1/calendar/month?year=2026&month=4

{
  "success": true,
  "data": {
    "year": 2026,
    "month": 4,
    "days": [
      { "date": "2026-04-01", "count": 0 },
      { "date": "2026-04-02", "count": 2, "thumbnails": ["url1", "url2"] },
      { "date": "2026-04-03", "count": 5, "thumbnails": ["url1", "url2", "url3"] }
    ]
  }
}
```

### GET /api/v1/calendar/day
Chi tiết ngày cụ thể.

```json
GET /api/v1/calendar/day?date=2026-04-04

{
  "success": true,
  "data": {
    "date": "2026-04-04",
    "totalExpense": 150000,
    "totalIncome": 0,
    "transactionCount": 3,
    "transactions": [
      { /* TransactionResponse */ },
      { /* TransactionResponse */ }
    ]
  }
}
```

## 8.3 Backend Files

```
src/application/use_cases/calendar_month.py
src/application/use_cases/calendar_day.py
src/application/dtos/request/calendar_dto.py
src/application/dtos/response/calendar_dto.py
src/infrastructure/adapters/driving/api/v1/calendar.py
```

## 8.4 Frontend Files

```
src/features/calendar/
├── api/
│   └── useCalendar.ts              # useCalendarMonth, useCalendarDay
├── components/
│   ├── CalendarGrid.tsx             # Grid lịch với dot indicators
│   ├── DayDetailSheet.tsx           # Bottom sheet chi tiết ngày
│   └── CalendarHeader.tsx           # Header tháng/năm
└── pages/
    └── CalendarPage.tsx            # Trang calendar (thay thế hoặc song song Journal)
```

## 8.5 Verification

1. Mở Calendar → hiển thị tháng hiện tại với dots
2. Tap ngày có dots → mở bottom sheet với danh sách transactions
3. Swipe → chuyển tháng, fetch data mới
4. Xem offline → hiển thị cached data
5. Navigation: thêm vào tab **Nhật ký** (Journal) — thay đổi layout từ list thành calendar/list toggle
