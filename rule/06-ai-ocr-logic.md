# Logic Tích hợp AI OCR (Gemini/Claude API)

1. **Preprocessing**: Ảnh hóa đơn gửi lên phải được nén và xử lý độ sáng trước khi đưa vào AI.
2. **Prompting**: Sử dụng kỹ thuật Few-shot prompting để ép AI trả về dữ liệu định dạng JSON chính xác (Merchant, Date, Amount, Currency).
3. **Validation**: Sau khi AI bóc tách, hệ thống phải so sánh tổng số tiền (Total) với tổng các món đồ (Items) để đảm bảo tính nhất quán.
4. **Human-in-the-loop**: Luôn cung cấp giao diện cho phép User sửa lại thông tin nếu AI bóc tách sai.