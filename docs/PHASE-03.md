# Phase 3: AI OCR + Life Log

**Mục tiêu:** Xử lý ảnh hóa đơn bằng AI OCR, lưu trữ ảnh lên S3, triển khai luồng Life Log và auto-save mechanism.

**Phụ thuộc:** Phase 2 (API ready)

---

## 3.1 — Image Upload + S3 Storage

### Mục tiêu

Upload ảnh, lưu lên S3, tạo thumbnail, trả về URLs.

### API Endpoint

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/v1/images/upload` | Required | Upload 1 ảnh → S3 → trả về URL |

**Request:** `multipart/form-data`
```
file: <image_file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://s3.../images/user123/abc.jpg",
    "thumbnail_url": "https://s3.../thumbnails/user123/abc_thumb.jpg",
    "mime_type": "image/jpeg",
    "file_size": 245000
  },
  "message": ""
}
```

### Cloudflare R2 Adapter

**`IStoragePort` interface:**
```python
class IStoragePort(ABC):
    async def upload_image(self, user_id: str, file: bytes, filename: str) -> ImageUploadResult: ...
    async def upload_thumbnail(self, user_id: str, original_key: str, thumbnail: bytes) -> str: ...
    async def delete_image(self, s3_key: str) -> None: ...
    async def get_presigned_url(self, s3_key: str) -> str: ...
```

**S3 Key conventions:**
```
images/{user_id}/{uuid}.{ext}
thumbnails/{user_id}/{uuid}_thumb.{ext}
```

### Image Preprocessing (trước OCR)

Trước khi gửi lên AI, ảnh cần:
1. **Resize** — giới hạn max 2000px width/height (Pillow)
2. **Brightness/Contrast** — cải thiện nếu ảnh tối hoặc mờ
3. **Format** — convert sang JPEG hoặc PNG
4. **Compress** — giảm size xuống < 500KB

**KHÔNG thay đổi nội dung ảnh** — chỉ preprocess để AI đọc tốt hơn.

---

## 3.2 — AI OCR Integration

### Mục tiêu

Tích hợp Claude API để bóc tách thông tin từ ảnh hóa đơn.

### API Endpoint

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/v1/ocr/analyze` | Required | Upload ảnh → OCR → trả kết quả |

**Request:** `multipart/form-data`
```
file: <image_file>
wallet_id: uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merchant": "The Coffee House",
    "amount": 75000,
    "currency": "VND",
    "date": "2025-01-15",
    "category": { "id": "uuid", "name": "Ăn uống", "confidence": 0.92 },
    "confidence": 0.95,
    "raw_ocr_data": { ... }
  },
  "message": ""
}
```

### `IAiOcrPort` Interface

```python
class IAiOcrPort(ABC):
    async def analyze_receipt(self, image_bytes: bytes) -> OcrResult: ...

@dataclass
class OcrResult:
    merchant: str | None
    amount: Decimal | None
    currency: str = "VND"
    date: date | None
    suggested_category_id: UUID | None
    confidence: float  # 0.0 - 1.0
    raw_data: dict
    is_life_log: bool  # TRUE nếu không có hóa đơn
```

### Few-shot Prompting

Prompt được thiết kế để:
1. **Nhận diện loại ảnh:**
   - Ảnh hóa đơn → trích xuất merchant, amount, date
   - Ảnh thường (Latte Art, bữa ăn, cảnh đẹp) → gắn tag chủ đề, amount = 0, is_life_log = True
   - Ảnh mờ/không đọc được → trả `confidence = 0`

2. **Trả về JSON chuẩn:**
```json
{
  "merchant": "The Coffee House" | null,
  "amount": 75000 | null,
  "currency": "VND",
  "date": "2025-01-15" | null,
  "category": "f_and_b" | "shopping" | "transport" | "entertainment" | "utilities" | "health" | "other",
  "is_life_log": false,
  "confidence": 0.95,
  "reasoning": "Giải thích ngắn cách AI nhận định"
}
```

3. **Ví dụ few-shot trong prompt:**
```
Example 1:
Input: [ảnh hóa đơn Coffee House]
Output: {"merchant": "The Coffee House", "amount": 75000, "date": "2025-01-15", "category": "f_and_b", "is_life_log": false, "confidence": 0.95}

Example 2:
Input: [ảnh ly latte art không có hóa đơn]
Output: {"merchant": null, "amount": null, "date": null, "category": "f_and_b", "is_life_log": true, "confidence": 0.8}
```

### Validation (Quy tắc bắt buộc)

**Tổng tiền validation:**
- Nếu AI trả `items` (danh sách sản phẩm): so sánh `sum(items) == total`
- Nếu không khớp: gắn `confidence` thấp, gắn `warning` trong response

**Confidence thresholds:**
- `confidence >= 0.9` → Auto-accept, auto-save
- `0.7 <= confidence < 0.9` → Cho user xem trước khi save
- `confidence < 0.7` → Hiển thị warning, cho user nhập lại

### Category Auto-assignment

AI trả về `category` dạng string key → map sang `Category` entity:
```
"f_and_b" → Ăn uống
"shopping" → Mua sắm
"transport" → Di chuyển
"entertainment" → Giải trí
"utilities" → Hóa đơn & Tiện ích
"health" → Sức khỏe
"other" → user phải chọn thủ công
```

---

## 3.3 — Auto-Save + Life Log Flow

### Mục tiêu

Triển khai luồng chụp ảnh → AI → Card popup → Auto-save sau 3 giây.

### Combined Upload + OCR Endpoint

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/v1/transactions/upload` | Required | Upload ảnh → OCR → tạo Transaction draft |

**Request:** `multipart/form-data`
```
file: <image_file>
wallet_id: uuid  (optional — mặc định dùng ví chính)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "image": { "id": "uuid", "url": "...", "thumbnail_url": "..." },
    "ocr_result": {
      "merchant": "The Coffee House",
      "amount": 75000,
      "currency": "VND",
      "date": "2025-01-15",
      "category": { "id": "uuid", "name": "Ăn uống", "confidence": 0.92 },
      "is_life_log": false,
      "confidence": 0.95
    },
    "auto_save_in_seconds": 3,
    "wallet_id": "uuid"
  },
  "message": ""
}
```

### Auto-Save Mechanism

**Frontend logic (React):**
```
1. User chụp ảnh → POST /transactions/upload
2. Backend: upload S3 → run OCR → tạo Transaction (status='pending')
3. Backend: trả response với transaction_id + auto_save_in_seconds=3
4. Frontend: hiển thị Card popup với OCR result
5. Frontend: bắt đầu countdown 3 giây
   - Nếu user tap card → mở Quick Edit (hủy auto-save)
   - Nếu hết 3s không tap → Frontend gọi POST /transactions/{id}/confirm
6. Backend: update transaction status = 'confirmed'
```

### Quick Edit (Sửa sau khi AI nhận sai)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/transactions/{id}/edit` | Required | Lấy transaction + OCR data cho Quick Edit |
| POST | `/api/v1/transactions/{id}/confirm` | Required | Confirm auto-save |
| PATCH | `/api/v1/transactions/{id}` | Required | Cập nhật transaction (sửa tay) |

**Quick Edit fields:**
- Amount (số tiền) — editable
- Category — dropdown
- Wallet — dropdown
- Tags — free text
- Merchant — editable
- Transaction date — date picker

### Life Log Flow

**Ảnh không phải hóa đơn (Life Log):**

```
1. User chụp ảnh ly Latte Art
2. Backend run OCR → is_life_log = True, amount = NULL
3. Response: { ..., "is_life_log": true, "amount": null, "ocr_result": { "category": "f_and_b" } }
4. Card popup hiển thị: "☕ Coffee · 0đ · Life Log"
5. Auto-save → Ảnh vào Calendar như kỷ niệm
```

**Thêm chi phí sau:**
```
1. User tap vào Life Log ảnh trong Calendar/Journal
2. Mở Transaction Detail screen
3. Bấm "Thêm chi phí"
4. Nhập số tiền → gọi PATCH /transactions/{id}
5. Transaction chuyển từ Life Log → Giao dịch tài chính
```

---

## Summary

### Phase 3 Deliverables

| Sub-phase | Scope |
|---|---|
| 3.1 | S3 Storage adapter (upload, thumbnail, delete, presigned URL) |
| 3.2 | Claude API OCR adapter (few-shot, validation, confidence thresholds) |
| 3.3 | Upload + OCR combined endpoint, auto-save mechanism, Life Log flow, Quick Edit |

### Success Criteria

- [ ] Upload ảnh → lưu S3 → trả về URL + thumbnail (< 2s)
- [ ] OCR phân tích ảnh hóa đơn → trả merchant, amount, date, category
- [ ] OCR nhận diện ảnh không phải hóa đơn → gắn is_life_log = true, amount = null
- [ ] Confidence ≥ 0.9 → auto-save sau 3 giây
- [ ] Confidence < 0.9 → hiển thị warning, user xác nhận trước khi save
- [ ] User sửa transaction sau khi AI nhận sai
- [ ] User thêm chi phí vào Life Log ảnh → chuyển thành giao dịch

### Phase tiếp theo

**Phase 4: Frontend Core** — "Hôm Nay" Feed, Camera FAB, Journal (Calendar + Grid views)

Xem: `docs/PHASE-04.md`
