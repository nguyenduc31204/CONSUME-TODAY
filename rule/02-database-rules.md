# Quy chuẩn Database (PostgreSQL)

1. **Naming**: Sử dụng `snake_case` cho tên bảng và tên cột (Ví dụ: `user_transactions`).
2. **Primary Key**: Luôn sử dụng `UUID` cho tất cả các bảng thay vì Integer ID.
3. **Audit Columns**: Mọi bảng phải có 3 cột: `created_at`, `updated_at`, và `deleted_at` (Soft delete).
4. **Migration**: Tuyệt đối không sửa DB trực tiếp. Mọi thay đổi phải thông qua file migration (Alembic).
5. **Relationships**: Luôn định nghĩa Foreign Key rõ ràng và có Index cho các cột hay dùng để Filter.