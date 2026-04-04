# Phase 10: Timeline Kỷ niệm — Memory Stream

## Mục tiêu
Dòng thời gian kỷ niệm: **"Hôm nay", "Tuần này", "Tháng này"** có gì. Gợi ý khoảnh khắc đáng nhớ (AI-powered).

## 10.1 UX Design

```
┌──────────────────────────────────────┐
│  ✨ Khoảnh khắc của bạn             │
├──────────────────────────────────────┤
│  [Hôm nay] [Tuần] [Tháng] [Năm trước]│
├──────────────────────────────────────┤
│  1 năm trước                        │
│  ┌─────────┐  ┌─────────┐           │
│  │ 📷 img  │  │ 📷 img  │           │
│  │ Cà phê │  │ Đi chơi │           │
│  └─────────┘  └─────────┘           │
│  ─────────────────────────────────  │
│  3 năm trước                        │
│  ┌──────────────────────┐           │
│  │ 📷 img               │           │
│  │ Sinh nhật bà ngoại   │           │
│  └──────────────────────┘           │
└──────────────────────────────────────┘
```

## 10.2 Backend Endpoints

### GET /api/v1/memories/timeline
```json
GET /api/v1/memories/timeline

{
  "success": true,
  "data": {
    "today": {
      "transactions": [...],
      "count": 3,
      "totalExpense": 75000
    },
    "week": {
      "transactions": [...],
      "count": 12,
      "totalExpense": 450000
    },
    "month": {
      "transactions": [...],
      "count": 45,
      "totalExpense": 2300000
    },
    "year_ago": {
      "transactions": [...],
      "count": 3,
      "highlight": "Cùng ngày năm ngoái bạn có 3 kỷ niệm!"
    }
  }
}
```

## 10.3 AI Memory Suggestions

```json
GET /api/v1/memories/suggestions

{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "yearly_memory",
        "title": "🎂 1 năm trước",
        "description": "Ngày này năm ngoái bạn có 3 kỷ niệm",
        "transactions": [...],
        "imageUrl": "..."
      },
      {
        "type": "milestone",
        "title": "🎉 Mốc đáng nhớ",
        "description": "Bạn đã tiết kiệm được 5 triệu kể từ tháng trước",
        "imageUrl": "..."
      }
    ]
  }
}
```

## 10.4 Backend Files

```
src/application/use_cases/memory_timeline.py
src/application/use_cases/memory_suggestions.py
src/application/dtos/request/memory_dto.py
src/application/dtos/response/memory_dto.py
src/infrastructure/adapters/driving/api/v1/memories.py
```

## 10.5 Frontend Files

```
src/features/memories/
├── api/
│   └── useMemories.ts               # useMemoryTimeline, useMemorySuggestions
├── components/
│   ├── MemorySection.tsx            # Section: Hôm nay / Tuần / Tháng / Năm trước
│   ├── MemoryCard.tsx               # Card kỷ niệm (reuse HomeCard)
│   ├── MemorySuggestion.tsx         # AI suggestion card
│   └── YearlyMemoryHighlight.tsx    # Highlight "1 năm trước"
└── pages/
    └── MemoriesPage.tsx            # Trang kỷ niệm
```

## 10.6 Verification

1. Mở Memories → hiển thị 4 sections (Hôm nay / Tuần / Tháng / Năm trước)
2. Horizontal scroll → chuyển giữa các sections
3. "Năm trước" → hiển thị special highlight với animation
4. Tap card → navigate đến transaction detail
5. Xem offline → hiển thị cached data
