# Requirements: MemoirFinance

## REQ-ID Format

`[CATEGORY]-[NUMBER]` — Category = AUTH | HOME | OCR | JOUR | WALL | LIFE | REPO | POST

---

## v1.0 MVP Requirements

### AUTH — Authentication & Onboarding

- [ ] **AUTH-01**: Social Login (Google, Apple)
  - User có thể đăng nhập bằng Google hoặc Apple ID
  - 1 tap để vào app — không email/password, không OTP
  - Firebase Auth
  - *Phase: 2 (Backend Core)*

- [ ] **AUTH-02**: Zero Onboarding
  - Sau đăng nhập → vào thẳng màn hình "Hôm nay"
  - Hệ thống tự tạo sẵn: 1 Ví cá nhân + 6 danh mục mặc định
  - Trải nghiệm "Wow" đầu tiên = Chụp ảnh
  - *Phase: 2 (Backend Core)*

---

### HOME — Home Screen ("Hôm Nay")

- [ ] **HOME-01**: "Hôm Nay" Feed Screen
  - Feed dọc (vertical scroll), mỗi ảnh là 1 card lớn, đẹp mắt
  - Card hiển thị: ảnh gốc + số tiền + danh mục + thời gian + tên ví
  - Cuộn xuống → hiển thị ảnh các ngày trước (social feed style)
  - Chạm vào card → Mở chi tiết giao dịch (editable)
  - *Phase: 4 (Frontend Core)*

- [ ] **HOME-02**: Camera FAB (Floating Action Button)
  - Vị trí: giữa bottom nav, kích thước lớn hơn các tab
  - Luôn hiển thị trên mọi màn hình (không chỉ tab "Hôm nay")
  - Hành vi: Mở camera → Chụp ảnh hoặc Chọn từ thư viện
  - *Phase: 4 (Frontend Core)*

---

### OCR — AI OCR Processing

- [ ] **OCR-01**: AI OCR Invoice Reading
  - Đọc tổng tiền, tên cửa hàng, ngày từ hóa đơn giấy
  - Tự động phân loại vào danh mục phù hợp (F&B, Mua sắm, Di chuyển...)
  - Xử lý trong < 2 giây
  - AI nhận diện sai → User có thể sửa bất kỳ trường nào (Human-in-the-loop)
  - Validation: So sánh tổng tiền (Total) với tổng các món để đảm bảo nhất quán
  - *Phase: 3 (AI OCR + Life Log)*

---

### JOUR — Journal / Nhật Ký

- [ ] **JOUR-01**: Calendar View
  - Toggle với Grid view trên cùng 1 màn hình
  - Layout: Lưới tháng, mỗi ô ngày là 1 thumbnail ảnh
  - Ô ngày có nhiều ảnh: Hiển thị 1 ảnh đại diện + badge "+N" ở góc
  - Chạm ô ngày → Pop-up hiển thị tất cả ảnh trong ngày
  - *Phase: 4 (Frontend Core)*

- [ ] **JOUR-02**: Grid/Gallery View
  - Layout: Gallery ảnh xếp liên tiếp (Instagram/Google Photos style)
  - Lớp phủ: Số tiền chi tiêu hiển thị phủ mờ (semi-transparent overlay) ở góc mỗi ảnh
  - Mục đích: Tập trung hoàn toàn vào yếu tố thẩm mỹ hình ảnh
  - Toggle Calendar ↔ Grid bằng nút ở phía trên
  - *Phase: 4 (Frontend Core)*

---

### WALL — Wallet & Categories

- [ ] **WALL-01**: Personal Wallet
  - 1 ví mặc định "Ví cá nhân", tạo sẵn khi đăng ký
  - Giao dịch tự động gán vào ví mặc định (hoặc ví hay dùng nhất)
  - Đổi ví nhanh: Trên card pop-up → chạm tên ví → chọn ví khác (1 tap)
  - Đổi ví sau: Từ màn hình chi tiết → "Chuyển sang..." → chọn ví đích
  - *Phase: 2 (Backend Core)*

- [ ] **WALL-02**: Custom Categories
  - 6 danh mục mặc định: Ăn uống (F&B), Mua sắm, Di chuyển, Giải trí, Hóa đơn & Tiện ích, Sức khỏe
  - User tự tạo danh mục mới bất kỳ (ví dụ: "Nuôi mèo", "Đám cưới")
  - Mỗi ví sở hữu bộ danh mục riêng biệt — không lẫn lộn
  - *Phase: 2 (Backend Core)*

---

### LIFE — Life Log (Ảnh không phải hóa đơn)

- [ ] **LIFE-01**: Life Log Photos
  - Ảnh không phải hóa đơn → AI gắn tag chủ đề (Coffee, Food...), số tiền = 0đ
  - Lưu vào Calendar như kỷ niệm (không phải giao dịch tài chính)
  - Muốn bổ sung chi phí sau: Chạm ảnh → "Thêm chi phí" → gõ số tiền → Ảnh biến thành giao dịch
  - Card pop-up: "Coffee · 0đ · Life Log"
  - *Phase: 3 (AI OCR + Life Log)*

---

### REPO — Reports ("Nhìn Lại")

- [ ] **REPO-01**: Traditional Charts Reports
  - Biểu đồ tròn / thanh truyền thống
  - Chi tiêu theo tuần, tháng, danh mục
  - Naming: Dùng "Nhìn lại" thay vì "Báo cáo" — đúng tone cảm xúc Life Log
  - *Phase: 5 (Nhìn lại + Polish)*

---

## Post-MVP Requirements

### OCR

- [ ] **OCR-02**: AI OCR Parent-Children (Supermarket item-level)
  - Bóc tách từng dòng sản phẩm từ hóa đơn siêu thị
  - Parent (hóa đơn tổng) → Children (từng món)
  - Mỗi dòng có tag phụ riêng → phục vụ báo cáo sâu

- [ ] **OCR-03**: AI OCR Bank Transfer Screenshots
  - Đọc tên người nhận, số tiền, nội dung chuyển khoản
  - Hỗ trợ: Momo, VCB, ZaloPay

- [ ] **OCR-04**: AI Learns from User Corrections
  - Khi user sửa danh mục cho cửa hàng X → AI ghi nhớ cho lần sau

### WALL

- [ ] **WALL-03**: Shared Wallets + Multi-tenant + Permissions
  - Ví gia đình/cặp đôi (Trust-based): tất cả thành viên xem/sửa/xóa ngang nhau
  - Ví kinh doanh/nhóm (Control-based): chỉ Maker/Admin được sửa/xóa

### REPO

- [ ] **REPO-02**: Visual Mosaic Recap
  - Mặc định thay thế biểu đồ truyền thống
  - Ví dụ: "Tháng này bạn dành 1.8tr cho 12 ly cafe" + bức tranh ghép từ 12 ảnh cafe

### Others

- [ ] **WLIST-01**: Wishlist
  - Ảnh sản phẩm có thẻ giá → nhận diện → thêm vào danh sách ước muốn

- [ ] **PUSH-01**: Push Notifications
  - Nhắc chụp ảnh, thông báo ví chung, recap tuần

- [ ] **APP-01**: Mobile App (iOS/Android)
  - Native mobile app thay thế web app

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| AUTH-01 | Phase 2 | Backend Core |
| AUTH-02 | Phase 2 | Backend Core |
| HOME-01 | Phase 4 | Frontend Core |
| HOME-02 | Phase 4 | Frontend Core |
| OCR-01 | Phase 3 | AI OCR + Life Log |
| JOUR-01 | Phase 4 | Frontend Core |
| JOUR-02 | Phase 4 | Frontend Core |
| WALL-01 | Phase 2 | Backend Core |
| WALL-02 | Phase 2 | Backend Core |
| LIFE-01 | Phase 3 | AI OCR + Life Log |
| REPO-01 | Phase 5 | Nhìn lại + Polish |
