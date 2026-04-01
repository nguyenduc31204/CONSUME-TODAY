# Quy chuẩn API Design

1. **Path**: Sử dụng danh từ số nhiều (Ví dụ: `/api/v1/transactions`).
2. **Methods**: 
   - `GET`: Lấy dữ liệu.
   - `POST`: Tạo mới.
   - `PUT`: Cập nhật toàn bộ.
   - `PATCH`: Cập nhật một phần.
   - `DELETE`: Xóa.
3. **Response**: Luôn trả về định dạng JSON với cấu trúc: `{ "success": true, "data": ..., "message": "" }`.
4. **Status Codes**: 
   - 200 OK, 201 Created.
   - 400 Bad Request, 401 Unauthorized, 404 Not Found.
   - 500 Internal Server Error.