# Phase 9c: Chi Tiêu Thủ Công + Chi Tiêu Trong Nhóm

## Mục tiêu

Cho phép người dùng ghi nhận chi tiêu/thu nhập **không cần chụp ảnh**, và ghi chi tiêu/thu nhập chung vào **quỹ nhóm**. Hỗ trợ ghi theo giờ cụ thể trong ngày (múi giờ Việt Nam: GMT+7).

---

## Quy ước thời gian

| Layer | Timezone |
|---|---|
| Database (PostgreSQL) | `TIMESTAMPTZ` → UTC |
| API Input | `transaction_date` (DATE), `transaction_time` (TIME) |
| API Response | ISO 8601 UTC |
| Frontend Input | Local time (Asia/Ho_Chi_Minh) |
| Frontend Display | Asia/Ho_Chi_Minh, format `DD/MM/YYYY HH:mm` |

---

## 9c.1 — Database Schema

### Thêm columns vào bảng `transactions` hiện có

```sql
ALTER TABLE transactions
    ADD COLUMN transaction_time TIME NOT NULL DEFAULT '00:00';

ALTER TABLE transactions
    ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT false;
-- is_manual = true → tạo bằng tay, không qua chụp ảnh
```

### Tạo bảng `circle_funds`

```sql
CREATE TABLE circle_funds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id       UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    balance         BIGINT NOT NULL DEFAULT 0,    -- số dư (VND)
    total_income    BIGINT NOT NULL DEFAULT 0,
    total_expense   BIGINT NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'VND',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_circle_fund_circle
    ON circle_funds(circle_id)
    WHERE deleted_at IS NULL;
```

### Tạo bảng `circle_fund_transactions`

```sql
CREATE TABLE circle_fund_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id           UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    fund_id             UUID NOT NULL REFERENCES circle_funds(id) ON DELETE CASCADE,
    author_id           UUID NOT NULL REFERENCES users(id),
    type                VARCHAR(20) NOT NULL,   -- 'expense' | 'income'
    amount              BIGINT NOT NULL,         -- VND
    description         VARCHAR(255),
    category            VARCHAR(100),
    merchant_name       VARCHAR(255),
    transaction_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time    TIME NOT NULL DEFAULT '00:00',
    split_type          VARCHAR(20) NOT NULL DEFAULT 'equal',
    -- 'equal'  = chia đều cho tất cả thành viên
    -- 'single' = chỉ 1 người chịu (ai trả tiền)
    -- 'custom' = chia tùy ý theo split_amounts
    split_amounts       JSONB,
    -- {"user_id1": 50000, "user_id2": 30000}
    paid_by             UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_circle_fund_txn_circle_date
    ON circle_fund_transactions(circle_id, transaction_date);
CREATE INDEX idx_circle_fund_txn_fund
    ON circle_fund_transactions(fund_id);
```

### Migration

```bash
alembic revision --autogenerate -m "9c_add_manual_and_circle_funds"
```

---

## 9c.2 — Domain Entities

### CircleFund

```python
class CircleFund(BaseEntity):
    def __init__(self, *, circle_id: UUID, balance: int = 0,
                 total_income: int = 0, total_expense: int = 0,
                 currency: str = "VND", ...):
        self.circle_id = circle_id
        self.balance = balance
        self.total_income = total_income
        self.total_expense = total_expense
        self.currency = currency

    def add_expense(self, amount: int) -> None:
        self.total_expense += amount
        self.balance -= amount
        self.touch()

    def add_income(self, amount: int) -> None:
        self.total_income += amount
        self.balance += amount
        self.touch()
```

### CircleFundTransaction

```python
class CircleFundTransaction(BaseEntity):
    TYPE_EXPENSE = "expense"
    TYPE_INCOME  = "income"
    SPLIT_EQUAL  = "equal"
    SPLIT_SINGLE  = "single"
    SPLIT_CUSTOM  = "custom"

    def __init__(self, *, circle_id, fund_id, author_id, type, amount,
                 paid_by, description=None, category=None, merchant_name=None,
                 transaction_date, transaction_time=None,
                 split_type="equal", split_amounts=None, ...):
        self.circle_id = circle_id
        self.fund_id = fund_id
        self.author_id = author_id
        self.type = type  # expense | income
        self.amount = amount
        self.paid_by = paid_by
        self.transaction_date = transaction_date
        self.transaction_time = transaction_time or time(0, 0)
        self.split_type = split_type
        self.split_amounts = split_amounts
```

---

## 9c.3 — Repository

Thêm vào `CircleRepository` interface:

```python
# ── CircleFund ─────────────────────────────────────
async def save_fund(self, fund: CircleFund) -> CircleFund: ...
async def get_fund(self, circle_id: UUID) -> CircleFund | None: ...
async def update_fund(self, fund: CircleFund) -> CircleFund: ...

# ── CircleFundTransaction ────────────────────────────
async def save_fund_transaction(self, txn: CircleFundTransaction) -> CircleFundTransaction: ...
async def list_fund_transactions(
    self, fund_id: UUID, *, since: datetime | None = None,
    skip: int = 0, limit: int = 50
) -> tuple[list[CircleFundTransaction], int]: ...
async def delete_fund_transaction(self, txn_id: UUID) -> None: ...
```

---

## 9c.4 — Use Cases

### Chi tiêu cá nhân thủ công

| Use Case | Mô tả |
|---|---|
| `CreateManualTransactionUseCase` | Tạo chi tiêu/thu nhập nhập tay (không ảnh) |
| `ListTransactionsUseCase` | Filter `is_manual`, `transaction_date`, `wallet_id` |
| `UpdateTransactionUseCase` | Sửa chi tiêu |
| `DeleteTransactionUseCase` | Soft delete |

### Quỹ nhóm

| Use Case | Mô tả |
|---|---|
| `InitCircleFundUseCase` | Tạo quỹ chung — gọi tự động trong `CreateCircleUseCase` |
| `AddCircleFundTransactionUseCase` | Thêm chi tiêu/thu nhập vào quỹ |
| `ListCircleFundTransactionsUseCase` | Danh sách giao dịch quỹ (filter tháng, loại) |
| `GetCircleFundUseCase` | Xem số dư + báo cáo tháng |
| `DeleteCircleFundTransactionUseCase` | Xóa giao dịch quỹ (owner hoặc người tạo) |

---

## 9c.5 — API Endpoints

### Chi tiêu cá nhân (mở rộng)

```
POST /api/v1/transactions              ← thêm is_manual=true, transaction_time
GET  /api/v1/transactions?month=2026-04&is_manual=true
```

### Quỹ nhóm

```
GET    /api/v1/circles/:id/fund                    ← xem quỹ + báo cáo tháng
POST   /api/v1/circles/:id/fund/transactions       ← thêm giao dịch
GET    /api/v1/circles/:id/fund/transactions?month=2026-04
PATCH  /api/v1/circles/:id/fund/transactions/:txnId
DELETE /api/v1/circles/:id/fund/transactions/:txnId
```

### POST /api/v1/transactions (chế độ thủ công)

```json
{
  "amount": 150000,
  "merchant_name": "Cà phê Highlands",
  "category": "Ăn uống",
  "wallet_id": "uuid",
  "transaction_date": "2026-04-04",
  "transaction_time": "14:30",
  "note": "Gặp mặt team",
  "is_income": false,
  "is_manual": true,
  "is_life_log": false
}
```

### GET /api/v1/circles/:id/fund

```json
{
  "success": true,
  "data": {
    "fund": {
      "id": "uuid",
      "balance": 1500000,
      "total_income": 5000000,
      "total_expense": 3500000,
      "currency": "VND"
    },
    "monthly_summary": {
      "2026-04": { "income": 2000000, "expense": 1500000, "net": 500000 },
      "2026-03": { "income": 3000000, "expense": 2000000, "net": 1000000 }
    }
  }
}
```

### POST /api/v1/circles/:id/fund/transactions

```json
{
  "type": "expense",
  "amount": 450000,
  "description": "Ăn tối cả nhà",
  "category": "Ăn uống",
  "transaction_date": "2026-04-10",
  "transaction_time": "19:30",
  "split_type": "equal",
  "paid_by": "user-uuid"
}
```

---

## 9c.6 — Frontend UI Design

### Home page — thêm "Thêm nhanh" button

```
┌──────────────────────────────────────┐
│  Hôm nay · 04/04/2026            │
│  ─────────────────────────────────  │
│  [+ Thêm nhanh]  [📷 Chụp ảnh]  │  ← THÊM MỚI
│  ─────────────────────────────────  │
│  ⬆️ Lương tháng  +15.000.000đ    │
│  🏠 Tiền nhà      -8.500.000đ    │
│  🍜 Cà phê (14:30)  -45.000đ     │  ← hiển thị giờ
│  🛍️ Mua sắm       -320.000đ      │
└──────────────────────────────────────┘
```

### "Thêm nhanh" sheet

```
┌──────────────────────────────────────┐
│  Thêm chi tiêu nhanh              │
│  ─────────────────────────────────  │
│  Loại:   [Chi tiêu] [Thu nhập]  │
│  Số tiền: [_____________] VND    │
│  Cửa hàng: [___________]        │
│  Danh mục:  [Ăn uống ▼]       │
│  Ví:       [Cá nhân ▼]          │
│  Ngày:     [04/04/2026]         │
│  Giờ:      [14:30    ]           │
│  Ghi chú:  [___________]        │
│  ─────────────────────────────────  │
│  [Hủy]          [Lưu]           │
└──────────────────────────────────────┘
```

### Circle Detail — tab "Quỹ"

```
┌──────────────────────────────────────┐
│  💰 Quỹ chung              [+ Thêm]│
│  ──────────────────────────────────  │
│  Số dư: 1.500.000đ                 │
│  Tổng thu: 5.000.000đ              │
│  Tổng chi: 3.500.000đ              │
│  ──────────────────────────────────  │
│  Tháng 04/2026 · Giảm 300.000đ     │
│  ──────────────────────────────────  │
│  📅 14/04 · Thu nhập               │
│  💰 Lương tháng  +5.000.000đ      │
│     Minh · Chia đều 3 người        │
│  ──────────────────────────────────  │
│  📅 10/04 · Chi tiêu               │
│  🍜 Ăn tối cả nhà   -450.000đ     │
│     Nam trả · Chia đều 3 người      │
│  ──────────────────────────────────  │
│  [Chi tiêu]        [Thu nhập]    │
└──────────────────────────────────────┘
```

---

## 9c.7 — Frontend Files

### API

```
src/api/
├── transactions.ts   ← thêm is_manual, transaction_time
└── circles.ts        ← thêm fund endpoints
```

### Hooks

```
src/hooks/
├── useTransactions.ts       ← thêm filter is_manual
└── useCircleFund.ts         ← useFund, useFundTransactions, useAddFundTransaction
```

### Components

```
src/components/
├── transactions/
│   └── AddManualTransactionSheet.tsx  ← modal nhập tay
└── circles/
    ├── CircleFundCard.tsx             ← số dư + tổng
    ├── CircleFundTransactionItem.tsx   ← item chi/thu
    ├── AddFundTransactionSheet.tsx    ← modal quỹ nhóm
    └── FundReportSheet.tsx            ← báo cáo tháng
```

---

## 9c.8 — Backend Files

```
src/domain/
├── entities/
│   ├── circle_fund.py
│   └── circle_fund_transaction.py

src/domain/repositories/
└── circle_repository.py  ← thêm abstract methods

src/application/
├── use_cases/
│   ├── init_circle_fund.py
│   ├── add_circle_fund_transaction.py
│   ├── list_circle_fund_transactions.py
│   ├── get_circle_fund.py
│   └── delete_circle_fund_transaction.py
└── dtos/
    ├── request/
    │   └── circle_fund_dto.py   ← CreateFundTransactionRequest, ...
    └── response/
        └── circle_fund_dto.py    ← FundResponse, FundTransactionItem, ...

src/infrastructure/
└── adapters/driven/
    └── circle_repository_impl.py  ← implement new methods
```

---

## 9c.9 — Verification

1. Tạo chi tiêu thủ công (không ảnh) → hiển thị trên Home
2. Hiển thị giờ (HH:mm) đúng múi giờ Việt Nam
3. Tạo Circle → quỹ chung được tự tạo
4. Thêm chi tiêu vào quỹ nhóm → số dư thay đổi
5. Báo cáo tháng → hiển thị tổng thu/chi đúng
6. Xóa giao dịch quỹ → số dư revert đúng
