# Nhiệm vụ: Nhóm Trưởng (Project Manager & Architect)

**Tên người nhận việc:** [Điền tên]
**Mục tiêu:** Xây dựng quy trình làm việc chuẩn từ con số 0, thiết kế kiến trúc hệ thống, viết tài liệu đặc tả (Spec) và quản lý đầu ra của cả 4 người còn lại.

## 📋 Chi tiết các bước thực hiện (Từ số 0 đến hoàn chỉnh):

### Giai đoạn 1: Khởi tạo dự án & Kiến trúc (0-1)
- [ ] **Khởi tạo Repository:** (Nếu bắt đầu từ repo trống)
  - Chạy `git init`.
  - Cấu trúc folder chuẩn:
    ```
    repo/
    ├── frontend/       (Code React/Vite do Frontend làm)
    ├── backend/        (Code Nodejs/Python do Backend làm)
    ├── docs/           (Chứa spec.md, slide, rubric)
    ├── data/           (Dữ liệu thô và file thiết kế)
    └── eval/           (Bộ test AI)
    ```
  - Tạo file `.gitignore` để chặn thư mục `node_modules/` và file `.env` chứa API Key.
- [ ] **Thiết kế System Architecture (Kiến trúc hệ thống):**
  - Vẽ sơ đồ luồng dữ liệu: `User click text -> Frontend gửi text lên Backend -> Backend bọc text vào Prompt -> Gọi LLM API -> Trả kết quả về Backend -> Frontend render HTML/UI`.
  - Phổ biến luồng này cho Frontend và Backend.

### Giai đoạn 2: Đặc tả Sản phẩm (Product Spec)
- [ ] Viết file `spec.md` hoàn chỉnh:
  - Định nghĩa chính xác "Lát cắt 1 câu".
  - Phân tích rủi ro (Risk Matrix): Hallucination, Bias, Data Privacy, Cost.
  - Định nghĩa Cost of error: AI làm sai thì user tốn gì? (Để chọn mức độ tự động hóa: Tự động hay chỉ Gợi ý).
  - Chọn 4 nguyên tắc HAX/PAIR và chỉ định rõ Frontend phải code tính năng nào để đáp ứng (VD: HAX G10 - Thu hẹp phạm vi -> Yêu cầu Frontend làm nút "Báo cáo AI trả lời sai").

### Giai đoạn 3: Quản lý & Lắp ráp (Integration)
- [ ] Đốc thúc Frontend và Backend chốt "API Contract" (Giao thức kết nối: Gửi lên file JSON có format thế nào, trả về format ra sao) ngay trong 2 tiếng đầu tiên.
- [ ] Code review: Đảm bảo Backend không commit API Key lên Github.
- [ ] Gom toàn bộ file báo cáo, log test, golden set từ các thành viên khác vào đúng thư mục trước deadline (23:59).

### Giai đoạn 4: Thuyết trình & Demo
- [ ] Làm Slide 6 trang: Đưa số liệu từ User Researcher và AI Engineer vào slide.
- [ ] Viết kịch bản demo: Ai bấm chuột, bấm vào kịch bản lỗi nào để khoe cách xử lý lỗi, ai sẽ nói phần nào. Đảm bảo chạy thử (Dry-run) 3 lần trước khi lên thớt.
