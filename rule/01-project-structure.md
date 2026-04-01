# Kiến trúc Hệ thống (Hexagonal Architecture)

Mọi code Backend (FastAPI) phải tuân thủ nghiêm ngặt cấu trúc 3 tầng:
1. **Domain Layer**: Chứa các Entity và Business Logic thuần túy. Không phụ thuộc vào bất kỳ thư viện bên ngoài nào.
2. **Application Layer**: Chứa các Service (Use Cases) và Port (Interface). Đây là nơi điều phối luồng dữ liệu.
3. **Infrastructure Layer**: Chứa các Adapter (Database, AI OCR Service, Mailer). Thực thi các Port được định nghĩa ở tầng Application.

**Quy tắc thư mục:**
- `/app/domain`: Models và logic lõi.
- `/app/application`: Services và Interfaces.
- `/app/infrastructure`: Repositories và External Clients.