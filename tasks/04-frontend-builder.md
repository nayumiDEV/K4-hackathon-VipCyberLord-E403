# Nhiệm vụ: Frontend Developer (Xây dựng UI/UX Toàn diện)

**Tên người nhận việc:** [Điền tên]
**Mục tiêu:** Xây dựng ứng dụng Web hoàn chỉnh từ số 0, quản lý trạng thái phức tạp và gọi API mượt mà.

## 📋 Chi tiết các bước thực hiện (Từ số 0 đến hoàn chỉnh):

### Giai đoạn 1: Khởi tạo & Cấu trúc UI
- [ ] Khởi tạo dự án (Nên dùng React/Vite cho nhanh): `npm create vite@latest frontend -- --template react-ts`.
- [ ] Cài đặt thư viện: `TailwindCSS` (làm style cho nhanh), `Lucide-React` (làm icon), `Axios` (gọi API).
- [ ] Chia Component Architecture:
  - `<Sidebar />`: Menu điều hướng các ngày học.
  - `<PdfViewer />`: Vùng hiển thị tài liệu.
  - `<ActionTooltip />`: Cái menu nổi lên khi bôi đen chữ.
  - `<ChatPanel />`: Khung chat của AI Tutor bên phải.
  - `<QuizCard />`: Component render câu hỏi trắc nghiệm có trạng thái Đúng/Sai.

### Giai đoạn 2: Xử lý Logic (State Management)
- [ ] Xử lý sự kiện bôi đen (Text Selection): Bắt sự kiện `onMouseUp` trong vùng PDF, lấy `window.getSelection().toString()`. Nếu có chữ -> Hiển thị `<ActionTooltip />` tại tọa độ chuột.
- [ ] Quản lý State Chat: Dùng `useState` lưu mảng `messages: [{role: 'user', content: '...'}, {role: 'ai', content: '...'}]`.
- [ ] Xử lý Loading: Khi đợi API trả về, phải hiện Skeleton loading hoặc Typing indicator (3 dấu chấm nhấp nháy) để User biết AI đang suy nghĩ.

### Giai đoạn 3: Kết nối Backend (API Integration)
- [ ] Bắt tay với Backend chốt API Contract. (VD: `POST /api/ai/action`, body: `{ action: "quiz", text: "...", context: "Slide 5" }`).
- [ ] Code hàm fetch API. Xử lý các kịch bản lỗi:
  - Nếu API lỗi 500: Render thông báo "Hệ thống AI đang quá tải, vui lòng thử lại".
  - Bọc khối `try/catch` cẩn thận để không bị crash toàn bộ app.

### Giai đoạn 4: Hoàn thiện UX (Trải nghiệm người dùng)
- [ ] Auto-scroll: Khi có tin nhắn mới trong Chat, tự động cuộn xuống dưới cùng.
- [ ] Xử lý JSON từ AI: Nếu gọi tính năng "Quiz", API sẽ trả về JSON. Frontend phải parse JSON đó và đưa vào `<QuizCard />` chứ không được in nguyên chuỗi JSON ra màn hình.
- [ ] Xử lý Markdown: Nếu AI trả về Mindmap dạng chữ hoặc in đậm in nghiêng, cần dùng thư viện (như `react-markdown`) để render cho đẹp.
