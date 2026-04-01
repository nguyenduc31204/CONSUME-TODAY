# 📖 MemoirFinance — Feature Truth
### Nguồn Sự Thật Duy Nhất (Single Source of Truth)
> **Phiên bản:** 1.0  
> **Ngày tạo:** 2025  
> **Trạng thái:** Đã thống nhất giữa Product Director & Founder

---

## 1. 🌟 Tầm nhìn & Kim Chỉ Nam (North Star)

### Tuyên ngôn sản phẩm
> **"Lưu giữ khoảnh khắc bằng hình ảnh, AI sẽ lo phần con số."**

### Định vị
MemoirFinance **KHÔNG phải** app quản lý tài chính. MemoirFinance là một **nền tảng nhật ký sống (Life Log)** lấy hình ảnh làm trung tâm, trong đó quản lý tiền bạc là **giá trị tăng thêm tự động** được sinh ra từ hành vi cốt lõi: **chụp ảnh và lưu giữ kỷ niệm**.

### Triết lý thiết kế cốt lõi
| Nguyên tắc | Mô tả |
|---|---|
| **Bức ảnh là đơn vị nguyên tử** | Mọi thứ trong app xoay quanh bức ảnh — không phải con số, không phải form nhập liệu |
| **Zero-tap mặc định, Escape Hatch luôn sẵn** | AI lo hết, nhưng người dùng luôn có nút thoát để kiểm soát |
| **Memoir, không phải Accounting** | Cảm xúc hoài niệm & thẩm mỹ, không phải áp lực kế toán |

---


## 2. 🎯 Chân dung Người dùng (Primary Persona)

### Nhân khẩu học
- **Độ tuổi:** 25–35 (Millennials & Gen Z)
- **Nghề nghiệp:** Nhân viên văn phòng năng động, Freelancer, Quản lý kinh doanh nhỏ, Cặp vợ chồng trẻ

### Nỗi đau (Pain Points)
- Muốn quản lý tiền nhưng **ghét sự khô khan** của app tài chính truyền thống (biểu đồ, bảng tính)
- **Lười nhập liệu thủ công** mỗi ngày
- Đã có thói quen **chụp ảnh mọi thứ** (đồ ăn, cafe, hóa đơn, món đồ mới) nhưng chưa app nào tận dụng được hành vi này

### Trải nghiệm cảm xúc mong muốn
> Ghi chép chi tiêu không còn là "gánh nặng kế toán" mà trở thành một **cuốn nhật ký hình ảnh (Memoir)** mang tính hoài niệm, thẩm mỹ và đầy tự hào.

### Một ngày điển hình (Day in the Life)

| Thời gian | Hành vi | App xử lý |
|---|---|---|
| 🌅 7:00 AM | Chụp ảnh bữa sáng | AI gắn tag "Ăn uống", lưu vào Calendar như Life Log |
| ☕ 12:30 PM | Chụp hóa đơn quán cafe | AI OCR bóc tách: "Cà phê — 75.000đ — F&B", auto-save sau 3 giây |
| 🛒 6:00 PM | Chụp hóa đơn siêu thị | AI đọc tổng tiền + tên siêu thị + phân loại, gán vào ví mặc định |
| 🛋️ 9:30 PM | Mở app, lướt Calendar | Nhìn lại cả ngày qua ảnh thumbnail — cảm giác thư giãn, hoài niệm |

---

## 3. 📸 Luồng Cốt Lõi — Vòng Đời Bức Ảnh

### 3.1. Luồng chính (Happy Path)

```
[Chụp ảnh / Chọn từ thư viện]
        │
        ▼
[AI xử lý ngầm trong < 2 giây]
        │
        ▼
[Card pop-up hiển thị kết quả]
  ┌─────────────────────────────┐
  │  ☕ Cà phê                  │
  │  75.000đ · F&B              │
  │  Ví Cá nhân                 │
  │                             │
  │  [Chạm để sửa]             │
  └─────────────────────────────┘
        │
        ├── Không chạm (3 giây) ──▶ Auto-save ✅
        │
        └── Chạm vào card ──▶ Mở Quick Edit
                                   ├── Sửa số tiền
                                   ├── Sửa danh mục
                                   ├── Đổi ví
                                   ├── Thêm tag
                                   └── Lưu ✅
```

### 3.2. Khi AI nhận diện SAI

| Thời điểm sửa | Cách sửa |
|---|---|
| **Ngay lúc chụp** | Chạm vào trường sai trên card pop-up → gõ lại giá trị đúng |
| **Sau đó (từ Calendar/Grid)** | Chạm ảnh → Màn hình "Chi tiết giao dịch" → Sửa bất kỳ trường nào |

> 📌 **Sau MVP:** AI sẽ học từ hành vi sửa lỗi. Ví dụ: Nếu user sửa "Shopping" → "F&B" cho The Coffee House, AI ghi nhớ quy tắc này cho lần sau.

### 3.3. Ảnh KHÔNG phải hóa đơn (Life Log)

| Hành vi | Xử lý |
|---|---|
| Chụp ảnh ly Latte Art (không có hóa đơn) | AI gắn tag "Coffee/F&B", số tiền = trống (0đ mờ), lưu vào Calendar như **Kỷ niệm** |
| Muốn bổ sung chi phí sau | Chạm ảnh → Bấm "Thêm chi phí" → Gõ 75.000đ → Ảnh biến thành giao dịch tài chính |

---

## 4. 🧭 Cấu trúc Điều hướng (Navigation)

### Bottom Navigation Bar (5 vị trí)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  [Hôm nay]  [Nhật ký]  [ 📸 ]  [Nhìn lại]  [Cá nhân]  │
│                         ▲                        │
│                    Camera FAB                    │
│                (Nút nổi, to, giữa)              │
└──────────────────────────────────────────────────┘
```

| Vị trí | Tab | Mô tả |
|---|---|---|
| 1 | **Hôm nay** | Feed dọc ảnh trong ngày + cuộn xuống = ngày trước |
| 2 | **Nhật ký** | Toggle: Lịch tháng ↔ Lưới ảnh (Grid) |
| Giữa | **📸 Camera** | Floating Action Button — luôn nổi bật, luôn hiển thị |
| 3 | **Nhìn lại** | Báo cáo tài chính (biểu đồ truyền thống trong MVP) |
| 4 | **Cá nhân** | Profile, Cài đặt, Quản lý ví |

### Nút Camera FAB
- **Vị trí:** Giữa bottom nav, kích thước lớn hơn các tab khác
- **Luôn hiển thị** trên mọi màn hình (không chỉ tab "Hôm nay")
- **Hành vi:** Mở camera → Chụp ảnh hoặc Chọn từ thư viện

---

## 5. 📱 Chi tiết từng Màn hình

### 5.1. Tab "Hôm nay" (Home Screen)

**Là màn hình đầu tiên khi mở app.**

- **Layout:** Feed dọc (vertical scroll), mỗi ảnh là 1 thẻ (card) lớn, đẹp mắt
- **Nội dung thẻ:** Ảnh gốc + số tiền + danh mục + thời gian + tên ví
- **Cuộn xuống:** Hiển thị ảnh các ngày trước (kiểu social feed), nhấn mạnh yếu tố Life Log
- **Tương tác:** Chạm vào thẻ → Mở chi tiết giao dịch (editable)

> 💡 Lý do chọn "Hôm nay" thay vì Calendar làm Home: Người dùng bận rộn mở app nhiều lần/ngày chủ yếu để **hành động** (chụp hóa đơn), không phải để xem lại lịch sử.

### 5.2. Tab "Nhật ký" (Journal)

Hai chế độ xem trên cùng 1 màn hình, chuyển đổi bằng **nút toggle** phía trên:

#### Chế độ Lịch (Calendar View)
- **Layout:** Lưới tháng, mỗi ô ngày là 1 thumbnail ảnh
- **Ô ngày có nhiều ảnh:** Hiển thị 1 ảnh đại diện (AI chọn ảnh đẹp nhất hoặc giao dịch lớn nhất) + badge "+N" ở góc
- **Tương tác:** Chạm ô ngày → Pop-up mở rộng hiển thị tất cả ảnh trong ngày (dạng lưới hoặc danh sách)

#### Chế độ Lưới (Grid / Gallery View)
- **Layout:** Gallery ảnh xếp liên tiếp (kiểu Instagram/Google Photos)
- **Lớp phủ:** Số tiền chi tiêu hiển thị phủ mờ (semi-transparent overlay) ở góc mỗi ảnh
- **Mục đích:** Tập trung hoàn toàn vào yếu tố **thẩm mỹ hình ảnh**

### 5.3. Tab "Nhìn lại" (Reports)

| Phiên bản | Nội dung |
|---|---|
| **MVP (v1)** | Biểu đồ tròn/thanh truyền thống: chi tiêu theo tuần, tháng, danh mục |
| **Sau MVP (v2+)** | **Visual Mosaic** làm mặc định (ví dụ: "Tháng này bạn dành 1.8tr cho 12 ly cafe" + bức tranh ghép từ 12 ảnh cafe). Toggle "Chế độ Kế toán" để xem biểu đồ truyền thống |

> 🎨 Naming: Dùng **"Nhìn lại"** thay vì "Báo cáo" — đúng tone cảm xúc Life Log, tránh cảm giác kế toán.

### 5.4. Tab "Cá nhân" (Profile & Settings)

- Profile người dùng
- Quản lý ví (tạo ví, xem danh sách ví)
- Quản lý danh mục (tùy chỉnh danh mục)
- Cài đặt app (ngôn ngữ, tiền tệ, v.v.)
- Quản lý ví chung & mời thành viên *(Sau MVP)*

---

## 6. 🤖 AI OCR — Hệ thống Trí tuệ Nhân tạo

### 6.1. Khả năng xử lý theo loại ảnh

| Loại ảnh | Xử lý | Phiên bản |
|---|---|---|
| **Hóa đơn giấy** | Đọc tổng tiền, tên cửa hàng, ngày, phân loại tự động | **MVP** |
| **Hóa đơn siêu thị (nhiều dòng)** | Đọc tổng tiền (MVP) + bóc tách từng dòng sản phẩm Parent-Children (v2+) | **MVP (tổng) / Sau MVP (chi tiết)** |
| **Screenshot chuyển khoản** (Momo, VCB, ZaloPay) | Đọc tên người nhận, số tiền, nội dung chuyển khoản | **Sau MVP** |
| **Ảnh sản phẩm có thẻ giá** | Nhận diện sản phẩm + giá → Wishlist | **Sau MVP** |
| **Ảnh sinh hoạt** (Latte Art, bữa ăn, cảnh đẹp) | AI gắn tag chủ đề (Coffee, Food...), số tiền để trống | **MVP** |

### 6.2. Mô hình Parent-Children (Sau MVP)

```
📷 Ảnh hóa đơn siêu thị
└── 🧾 Giao dịch tổng: 500.000đ — Siêu thị / Thực phẩm
    ├── 🥛 Sữa tươi: 45.000đ — Thực phẩm
    ├── 🥚 Trứng gà: 30.000đ — Thực phẩm
    ├── 🧴 Bột giặt: 89.000đ — Gia dụng
    └── ... (7 món khác)
```

- **Receipt-level (Tổng):** Danh mục chiếm tỷ trọng tiền lớn nhất → đại diện (hiển thị trên Calendar)
- **Item-level (Chi tiết):** Mỗi dòng có tag phụ riêng → phục vụ báo cáo sâu

### 6.3. AI học từ hành vi (Sau MVP)
- Khi user sửa danh mục cho cửa hàng X, AI lưu quy tắc cho lần sau
- Ví dụ: Sửa "Shopping" → "F&B" cho "The Coffee House" → AI nhớ mãi

---

## 7. 👛 Hệ thống Ví (Wallet)

### 7.1. Cấu trúc

| Loại ví | Mô tả | Phiên bản |
|---|---|---|
| **Ví cá nhân** | 1 ví mặc định, tạo sẵn khi đăng ký | **MVP** |
| **Ví chung** | Không giới hạn số lượng (Ví gia đình, Ví quỹ nhóm, Ví cửa hàng...) | **Sau MVP** |

### 7.2. Luồng chọn ví khi chụp ảnh
- **Mặc định:** Giao dịch tự động gán vào ví cá nhân (hoặc ví hay dùng nhất)
- **Đổi ví nhanh:** Trên card pop-up sau khi chụp → chạm tên ví → chọn ví khác (1 tap)
- **Đổi ví sau:** Từ màn hình chi tiết giao dịch → "Chuyển sang..." → chọn ví đích
- **UI tối ưu:** Pop-up chỉ ghim 2-3 ví được dùng thường xuyên nhất

### 7.3. Phân quyền Ví chung (Sau MVP)

#### Ví Gia đình / Cặp đôi (Trust-based)
| Quyền | Mô tả |
|---|---|
| Xem ảnh gốc | ✅ Tất cả thành viên đều thấy ảnh gốc + số tiền + danh mục |
| Sửa/Xóa giao dịch | ✅ **Ngang nhau** — bất kỳ ai cũng sửa/xóa được giao dịch người khác |
| Mời thành viên | ❌ Chỉ Owner/Admin |

#### Ví Kinh doanh / Nhóm (Control-based)
| Quyền | Mô tả |
|---|---|
| Xem ảnh gốc | ✅ Tất cả thành viên đều thấy |
| Sửa/Xóa giao dịch | ⚠️ Chỉ **Maker** (người tạo) hoặc **Admin** (chủ ví) |
| Mời thành viên | ❌ Chỉ Owner/Admin |

---

## 8. 🏷️ Hệ thống Danh mục (Categories)

### 8.1. Danh mục mặc định (6 danh mục)

| # | Danh mục | Icon gợi ý |
|---|---|---|
| 1 | Ăn uống (F&B) | 🍜 |
| 2 | Mua sắm | 🛍️ |
| 3 | Di chuyển | 🚗 |
| 4 | Giải trí | 🎬 |
| 5 | Hóa đơn & Tiện ích | 🏠 |
| 6 | Sức khỏe | 💊 |

### 8.2. Danh mục tùy chỉnh (Custom)
- Người dùng **tự tạo** danh mục mới bất kỳ (ví dụ: "Nuôi mèo", "Đám cưới", "Đu Idol")
- Có trong **MVP**

### 8.3. Cách ly danh mục theo Ví
- Mỗi ví sở hữu **bộ danh mục riêng biệt**
- Ví cá nhân: Bộ mặc định + danh mục cá nhân
- Ví cửa hàng: Danh mục đặc thù ("Nhập hàng", "Thuê mặt bằng", "Trả lương")
- **Không lẫn lộn** danh mục giữa các ví

---

## 9. 🔐 Xác thực & Onboarding

### Đăng nhập
- **Chỉ Social Login**: Google & Apple
- Không email/password, không OTP
- **1 tap** để vào app

### Onboarding
- **Không có onboarding wizard**
- Sau đăng nhập → Vào thẳng màn hình **"Hôm nay"**
- Hệ thống tự tạo sẵn: 1 Ví cá nhân + 6 danh mục mặc định
- **Trải nghiệm "Wow" đầu tiên = Chụp ảnh**, không phải điền form

---

## 10. 🔔 Thông báo (Notifications)

| Phiên bản | Quyết định |
|---|---|
| **MVP** | ❌ **KHÔNG có push notifications** |
| **Sau MVP** | Xem xét: nhắc chụp ảnh, thông báo ví chung, recap tuần |

---

## 11. 🖥️ Nền tảng & Kỹ thuật

| Quyết định | Chi tiết |
|---|---|
| **Nền tảng MVP** | **Web App** (chạy trên browser) |
| **Mobile App** | Sau MVP |
| **Offline mode** | ❌ Không nằm trong scope |

---

## 12. 💰 Mô hình Kinh doanh

| Quyết định | Chi tiết |
|---|---|
| **Monetization** | **Miễn phí hoàn toàn** |
| **Paywall** | Không có |
| **Giới hạn tính năng** | Không có |

---

## 13. 🚀 Phân chia MVP vs. Sau MVP

### ✅ MVP (v1) — Phạm vi phát hành đầu tiên

| # | Tính năng | Ghi chú |
|---|---|---|
| 1 | Màn hình "Hôm nay" (Feed + Camera FAB) | Home screen |
| 2 | AI OCR hóa đơn giấy (tổng tiền + cửa hàng + ngày + auto-category) | Core AI |
| 3 | Nhật ký — Calendar view (lịch tháng, 1 ảnh/ô, badge "+N") | Tab Nhật ký |
| 4 | Nhật ký — Grid view (gallery ảnh + số tiền phủ mờ) | Tab Nhật ký |
| 5 | "Nhìn lại" — Biểu đồ tròn/thanh truyền thống | Tab Nhìn lại |
| 6 | Ví cá nhân (1 ví mặc định, tạo sẵn) | Wallet |
| 7 | Custom categories (tự tạo danh mục) | Categories |
| 8 | Ảnh Life Log (không có số tiền, lưu kỷ niệm vào Calendar) | Life Log |
| 9 | Social Login (Google, Apple) | Auth |
| 10 | Zero onboarding (vào thẳng app) | Onboarding |

### 📋 Sau MVP (v2+) — Roadmap tương lai

| # | Tính năng | Ghi chú |
|---|---|---|
| 1 | AI OCR bóc tách từng dòng sản phẩm (Parent-Children) | AI nâng cao |
| 2 | AI OCR screenshot chuyển khoản (Momo, VCB, ZaloPay) | AI nâng cao |
| 3 | AI học từ hành vi sửa lỗi (Personalized Learning) | AI nâng cao |
| 4 | "Nhìn lại" — Visual Mosaic recap (mặc định) | UX nâng cao |
| 5 | Ví chung + Multi-tenant + Phân quyền (Trust / Control) | Multi-user |
| 6 | Wishlist (ảnh sản phẩm → danh sách ước muốn) | Tính năng mới |
| 7 | Push Notifications | Engagement |
| 8 | Mobile App (iOS / Android) | Platform |

---

## 14. ❌ Tính năng Đã Loại Bỏ (Out of Scope)

| Tính năng | Lý do |
|---|---|
| **HabitFriend (Thói quen trực quan)** | Loại hoàn toàn khỏi scope để giữ sản phẩm tập trung vào Life Log + Tài chính |
| **Offline mode** | Không nằm trong scope |
| **Email/Password login** | Chỉ dùng Social Login để tối giản |
| **Onboarding wizard** | Zero-friction — vào thẳng app |

---

## 15. 📐 Tóm tắt User Flow chính (MVP)

### Flow 1: Người dùng mới lần đầu
```
Mở app → Đăng nhập Google/Apple (1 tap)
  → Vào thẳng "Hôm nay" (ví + danh mục mặc định đã sẵn)
  → Thấy Camera FAB nổi bật
  → Chụp ảnh đầu tiên → WOW moment ✨
```

### Flow 2: Chụp hóa đơn (Zero-tap)
```
Bấm Camera FAB → Chụp hóa đơn
  → AI xử lý (< 2s) → Card pop-up: "Cà phê · 75.000đ · F&B · Ví Cá nhân"
  → Không chạm gì → Auto-save sau 3s
  → Ảnh xuất hiện trong Feed "Hôm nay" + Calendar
```

### Flow 3: Chụp ảnh Life Log
```
Bấm Camera FAB → Chụp ly Latte Art
  → AI xử lý → Card: "Coffee · 0đ · Life Log"
  → Auto-save → Ảnh vào Calendar như kỷ niệm
  → (Tùy chọn) Sau đó chạm ảnh → "Thêm chi phí" → 75.000đ
```

### Flow 4: Sửa giao dịch sai
```
Mở tab "Nhật ký" → Calendar hoặc Grid
  → Chạm ảnh hóa đơn bị AI nhận sai
  → Màn hình "Chi tiết giao dịch"
  → Sửa số tiền / danh mục / ví
  → Lưu ✅
```

### Flow 5: Xem báo cáo (Nhìn lại)
```
Mở tab "Nhìn lại"
  → Xem biểu đồ chi tiêu theo tuần/tháng/danh mục
  → (Sau MVP) Toggle sang Visual Mosaic để xem recap bằng ảnh
```

---

> 📌 **Ghi chú cuối cùng:** Tài liệu này là nguồn sự thật duy nhất cho sản phẩm MemoirFinance.  
> Mọi quyết định thiết kế, kỹ thuật và kinh doanh phải tham chiếu từ file này.  
> Cập nhật version khi có thay đổi được thống nhất giữa các bên.
