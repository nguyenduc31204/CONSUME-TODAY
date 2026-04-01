# Xử lý lỗi và Nhật ký hệ thống

1. **Global Exception Handler**: Phải có một bộ lọc lỗi tập trung trong FastAPI để bắt mọi lỗi phát sinh.
2. **Error Codes**: Định nghĩa bộ mã lỗi riêng cho Business (Ví dụ: `ERR_INSUFFICIENT_FUNDS`).
3. **Logging**: 
   - Sử dụng thư viện `loguru`.
   - Log ở mức `INFO` cho các hành động quan trọng (User login, Transaction created).
   - Log ở mức `ERROR` kèm theo `stack_trace` cho các lỗi hệ thống.
4. **No Print**: Tuyệt đối không sử dụng lệnh `print()` trong code production.