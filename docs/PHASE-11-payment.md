# Phase 11: Lifetime License — VNPay/MoMo Payment

## Mục tiêu
Bán **Lifetime License** qua VNPay/MoMo để unlock tất cả tính năng.

## Design Decisions
- **Pricing:** Lifetime License **199k - 299k VND** (một lần, không recurring)
- **Payment:** VNPay + MoMo (thị trường Việt Nam)
- **Features unlocked:** Không giới hạn Circle, không giới hạn storage, tất cả AI features

## 11.1 Database Schema

```sql
CREATE TABLE licenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    license_type    VARCHAR(20) NOT NULL DEFAULT 'lifetime',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'active' | 'cancelled' | 'refunded'
    purchased_at    TIMESTAMPTZ,
    payment_method  VARCHAR(20),           -- 'vnpay' | 'momo'
    payment_ref     VARCHAR(100),           -- VNPay/MoMo transaction ref
    amount_vnd      INT,                   -- số tiền thực trả
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN has_lifetime_license BOOLEAN NOT NULL DEFAULT false;
```

## 11.2 Payment Flow

```
User nhấn "Mua Lifetime"
        ↓
POST /licenses/payment-request
  → Tạo license record (status='pending')
  → Gọi VNPay/MoMo API → lấy payment URL
  → Trả về { paymentUrl: "https://..." }
        ↓
User được redirect đến VNPay/MoMo gateway
        ↓
Sau khi thanh toán
  → VNPay/MoMo gọi callback POST /licenses/vnpay/callback
  → Verify signature + transaction
  → Update license status = 'active'
  → Update user.has_lifetime_license = true
        ↓
User được redirect về app
  → Kiểm tra license status
  → Unlock all features
```

## 11.3 Backend Endpoints

```
POST /api/v1/licenses/payment-request    # Tạo payment link
GET  /api/v1/licenses/me                 # Xem license hiện tại
POST /api/v1/licenses/vnpay/callback    # VNPay IPN callback
POST /api/v1/licenses/momo/callback     # MoMo callback
```

### POST /api/v1/licenses/payment-request

```json
// Request
{ "paymentMethod": "vnpay" }  // or "momo"

// Response
{
  "success": true,
  "data": {
    "licenseId": "uuid",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
    "expiresAt": "2026-04-04T14:00:00Z"
  }
}
```

### GET /api/v1/licenses/me

```json
// Response
{
  "success": true,
  "data": {
    "hasLifetimeLicense": true,
    "licenseType": "lifetime",
    "status": "active",
    "purchasedAt": "2026-04-04T10:00:00Z",
    "paymentMethod": "vnpay",
    "amountVnd": 199000
  }
}
```

## 11.4 VNPay Integration

```python
# VNPay payment request builder
def create_vnpay_payment_url(order_id: str, amount: int, description: str, return_url: str) -> str:
    params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": settings.vnpay_tmn_code,
        "vnp_Amount": amount * 100,  # VND × 100
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": order_id,
        "vnp_OrderInfo": description,
        "vnp_ReturnUrl": return_url,
        "vnp_IpAddr": "127.0.0.1",
        "vnp_CreateDate": datetime.utcnow().strftime("%Y%m%d%H%M%S"),
    }
    # Sort params alphabetically, build query string, HMAC SHA256 sign
    query = urlencode(sorted(params.items()))
    signature = hmac.new(hash_secret, query.encode(), hashlib.sha256).hexdigest()
    return f"{VNPAY_URL}?{query}&vnp_SecureHash={signature}"
```

## 11.5 Backend Files

```
src/domain/entities/license.py
src/domain/repositories/license_repository.py
src/application/use_cases/purchase_license.py
src/application/use_cases/verify_payment.py
src/application/use_cases/check_license.py
src/application/dtos/request/license_dto.py
src/application/dtos/response/license_dto.py
src/infrastructure/adapters/driven/repositories/license_repository_impl.py
src/infrastructure/adapters/driven/vnpay_service.py
src/infrastructure/adapters/driven/momo_service.py
src/infrastructure/adapters/driving/api/v1/licenses.py
```

## 11.6 Frontend UI

```
┌──────────────────────────────────────┐
│  🔓 Nâng cấp MemoirFinance          │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐   │
│  │  ✨ LIFETIME LICENSE         │   │
│  │                              │   │
│  │  Mua một lần, dùng mãi mãi  │   │
│  │                              │   │
│  │  • Không giới hạn Circle    │   │
│  │  • Không giới hạn storage   │   │
│  │  • Tất cả AI features       │   │
│  │                              │   │
│  │  💰 199.000đ                 │   │
│  │                              │   │
│  │  [Thanh toán VNPay]         │   │
│  │  [Thanh toán MoMo]          │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

## 11.7 Frontend Files

```
src/features/license/
├── api/
│   └── useLicense.ts                 # useLicense, usePurchase, useCheckLicense
├── components/
│   ├── PremiumUpsell.tsx             # Upsell banner (tạo Circle thứ 4)
│   ├── UpgradePage.tsx                # Trang upgrade đầy đủ
│   ├── LicenseGate.tsx               # HOC kiểm tra license
│   └── PaymentStatus.tsx             # Trang chờ + kết quả
└── pages/
    └── UpgradePage.tsx
```

## 11.8 License Gate Pattern

```tsx
// Wraps premium features, checks license before rendering
function LicenseGate({ children, feature }: { children, feature: string }) {
  const { hasLicense, isLoading } = useLicense()

  if (isLoading) return <Skeleton />
  if (!hasLicense) return <PremiumUpsell feature={feature} />
  return <>{children}</>
}

// Usage
<LicenseGate feature="circle">
  <CreateCircleDialog />
</LicenseGate>
```

## 11.9 Verification

1. Tạo Circle thứ 4 → hiển thị `PremiumUpsell` với giá
2. Click "Thanh toán VNPay" → redirect sang VNPay sandbox
3. Simulate IPN callback → kiểm tra `has_lifetime_license = true`
4. Sau khi thanh toán → unlock Circle thứ 4 thành công
5. Profile page → hiển thị badge "Lifetime"

## 11.10 Environment Variables

```env
VNPAY_TMN_CODE=YOUR_TMN_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET
VNPAY_RETURN_URL=https://yourapp.com/payment/return
VNPAY_CALLBACK_URL=https://yourapp.com/api/v1/licenses/vnpay/callback

MOMO_PARTNER_CODE=YOUR_PARTNER_CODE
MOMO_ACCESS_KEY=YOUR_ACCESS_KEY
MOMO_SECRET_KEY=YOUR_SECRET_KEY
MOMO_RETURN_URL=https://yourapp.com/payment/return
MOMO_CALLBACK_URL=https://yourapp.com/api/v1/licenses/momo/callback
```
