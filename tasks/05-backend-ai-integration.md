# Nhiệm vụ: Backend Developer (Xây dựng API & Tích hợp AI)

**Tên người nhận việc:** [Điền tên]
**Mục tiêu:** Xây dựng máy chủ Server xử lý logic, giấu API Key an toàn và giao tiếp trực tiếp với LLM (Gemini/OpenAI/Claude).

## 📋 Chi tiết các bước thực hiện (Từ số 0 đến hoàn chỉnh):

### Giai đoạn 1: Khởi tạo Server
- [ ] Khởi tạo dự án Nodejs: `npm init -y` trong thư mục `backend/`.
- [ ] Cài đặt: `npm install express cors dotenv @google/generative-ai` (Nếu dùng Gemini).
- [ ] Setup file `.env` chứa `GEMINI_API_KEY=xxxxx`. BẮT BUỘC đưa `.env` vào `.gitignore`.
- [ ] Thiết lập Express Server cơ bản (Cổng 3000), bật CORS để Frontend ở cổng 5173 gọi được không bị chặn.

### Giai đoạn 2: Xây dựng AI Service
- [ ] Tạo file `aiService.js`.
- [ ] Khởi tạo client kết nối với LLM (Ví dụ: `const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);`).
- [ ] Viết hàm `generateAIResponse(systemPrompt, userText, context)`. Hàm này sẽ trộn Prompt của bạn số 2 + Đoạn text user bôi đen + Ngữ cảnh trang PDF để gửi cho LLM.

### Giai đoạn 3: Viết API Endpoints (Routing)
- [ ] Tạo Router: `POST /api/action`
- [ ] Nhận Body từ Frontend: `req.body = { actionType, selectedText, contextPage }`.
- [ ] Dùng `switch(actionType)` để điều phối:
  - Nếu `actionType === 'summarize'`: Lấy Prompt Tóm tắt -> Gọi AI Service -> Trả về JSON `{ success: true, data: "..." }`.
  - Nếu `actionType === 'quiz'`: Lấy Prompt Quiz -> Yêu cầu AI trả định dạng JSON -> Gọi AI Service -> Trả về Frontend.

### Giai đoạn 4: Xử lý Lỗi & Tối ưu hóa (Error Handling & Rate Limit)
- [ ] LLM rất hay bị Timeout hoặc lỗi API Key hỏng. Cần bọc `try/catch` trong mọi hàm gọi AI.
- [ ] Nếu LLM bị lỗi, trả về HTTP Status 500 kèm thông báo lỗi rõ ràng `{ error: "Lỗi kết nối AI" }` để Frontend xử lý, KHÔNG để Server bị crash (chết).
- [ ] (Nâng cao): Nếu làm "Quiz", LLM đôi khi không tuân thủ định dạng JSON. Cần viết một hàm Parser nhỏ ở Backend để cố gắng bóc tách mã JSON ra khỏi câu trả lời của LLM (Dùng regex tìm thẻ `{...}`) trước khi gửi về Frontend.
- [ ] Lưu Log: Chặn mọi request và response in ra Terminal (`console.log`) để quá trình chạy thử (Evals) Nhóm trưởng và AI Engineer dễ dàng copy paste vào file báo cáo.
