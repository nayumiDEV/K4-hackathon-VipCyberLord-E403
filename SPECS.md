# SPECS.md

# VLearn AI Study Assistant

## 1. Tổng quan

### Tên đề tài
VLearn AI Study Assistant

### Mục tiêu
Xây dựng hệ thống AI hỗ trợ học tập ngay bên trong VLearn, giúp học viên có thể học, ôn tập và ghi nhớ kiến thức nhanh hơn.
Bằng việc theo dõi ngữ cảnh tài liệu đang học, AI hỗ trợ tóm tắt, giải thích thuật ngữ, tạo mindmap và sinh quiz ôn tập cá nhân hóa một cách tức thời ngay trên giao diện đọc tài liệu.

---

# 2. Problem Statement

## Ai đang gặp vấn đề
Học viên đang ôn tập bài giảng trên hệ thống VLearn.

## Pain Points
Hiện tại chatbot chỉ có thể trả lời trong phạm vi context chung chung, người học phải thao tác nhiều bước thủ công để nhờ AI giải thích hoặc tạo bài tập. 
Các vấn đề chính:
- Người học phải thao tác nhiều bước làm gián đoạn quá trình học (mở tab mới, copy paste nội dung).
- Chưa có cách nào tạo ra quiz ôn tập cá nhân hóa nhanh chóng phù hợp với người dùng.
- Chatbot chưa theo sát được ngữ cảnh chính xác của đoạn tài liệu mà người dùng đang đọc.

---

# 3. Evidence

Các vấn đề được ghi nhận:
1. Người dùng muốn ôn tập nhanh một cách trực quan và cá nhân hoá theo từng phần không hiểu nhưng không có cách nào.
2. Việc chuyển đổi giữa tài liệu và các công cụ AI khác làm đứt gãy mạch tập trung.
3. Không biết kết quả quiz để gợi ý ôn tập phần còn yếu.

---

# 4. One Sentence

> **Học viên muốn ôn tập lại kiến thức bài cũ, AI dựa trên đoạn tài liệu được bôi đen để tự động sinh ra tóm tắt, giải thích, mindmap hoặc micro-quiz ngay tại màn hình bài học, giúp học viên phát hiện ngay lỗ hổng kiến thức mà không cần chuyển trang.**

---

# 5. Solution

Xây dựng tính năng "In-Lecture AI Tutor" hoạt động xuyên suốt khi học viên đọc tài liệu (PDF/PPT).
Khi người dùng bôi đen một đoạn văn bản bất kỳ, một menu nổi (Action Menu) sẽ xuất hiện cho phép gọi các tính năng AI hỗ trợ học tập tức thời, kết quả sẽ hiển thị ngay ở thanh Chat bên phải.

---

# 6. Scope (Phạm vi tính năng)

### 1. Tóm tắt ý chính (AI Summary)
- Chuyển đổi một đoạn tài liệu dài thành các ý chính ngắn gọn (Bullet points).
- Giúp người học nắm bắt nhanh cốt lõi vấn đề.

### 2. Giải thích thuật ngữ (AI Explain)
- Nhận diện thuật ngữ chuyên ngành trong ngữ cảnh bài học.
- Giải thích một cách dễ hiểu, có ví dụ minh họa đi kèm.

### 3. Tạo Mindmap (Mindmap Generator)
- Trích xuất cấu trúc thông tin từ đoạn văn bản được chọn.
- Trả về cấu trúc phân nhánh giúp người học dễ dàng hình dung mối quan hệ giữa các khái niệm.

### 4. Sinh Quiz cá nhân hoá (Personalized Micro-Quiz)
- Dựa trên phần kiến thức người học vừa chọn, AI tự động sinh ra một câu hỏi trắc nghiệm (1-5 câu).
- Tích hợp tính năng chấm điểm tức thời: Gạch đỏ nếu chọn sai, hiển thị đáp án đúng kèm lời giải thích cặn kẽ và trích nguồn số trang.

---

# 7. User Flow

```text
Trang đọc tài liệu (PDF Viewer)
↓
Học viên bôi đen đoạn văn bản không hiểu
↓
Menu công cụ AI nổi lên (Tóm tắt / Giải thích / Mindmap / Quiz)
↓
Học viên chọn 1 tính năng
↓
Hệ thống chuyển ngữ cảnh sang thanh VLearn Tutor Chat (Cạnh phải)
↓
AI hiển thị kết quả (Nếu là Quiz thì học viên bấm chọn đáp án trực tiếp trong Chat)
↓
AI chấm điểm và giải thích bổ sung
↓
Học viên tiếp tục đọc tài liệu
```

---

# 8. Functional Requirements

## Tích hợp Frontend
- Cơ chế bôi đen văn bản hiện Action Tooltip (Floating Menu).
- Giao diện Chatbot Sidebar để hiển thị phản hồi từ AI.
- Component Quiz Card bên trong Chatbot cho phép người dùng click chọn đáp án.

## Trình xử lý AI (Backend)
- Xây dựng API nhận yêu cầu từ Frontend (Text đã chọn + Loại tính năng + Ngữ cảnh slide).
- Đóng gói System Prompts riêng biệt cho từng tính năng.
- Tích hợp LLM API (Gemini/OpenAI) xử lý và trả về định dạng JSON (đặc biệt đối với Quiz) hoặc Markdown.

---

# 9. Non-functional Requirements
- Phản hồi nhanh chóng (dưới 5 giây).
- Xử lý lỗi mượt mà khi kết nối AI thất bại (hiển thị thông báo lỗi thân thiện thay vì crash web).
- Đảm bảo AI không sinh ra thông tin bịa đặt (hallucination) bằng cách thiết lập tham số Temperature thấp và yêu cầu AI bám sát context được cung cấp.

---

# 10. AI Responsibilities (Trách nhiệm của AI)
Trong phiên bản này, AI chịu trách nhiệm tự động hóa các tác vụ:
✅ Đọc và hiểu ngữ cảnh văn bản được chọn.
✅ Sinh Tóm tắt (Summary).
✅ Giải thích thuật ngữ theo ngữ cảnh.
✅ Trích xuất cấu trúc (Mindmap).
✅ Sinh câu hỏi trắc nghiệm khách quan (Quiz) và đáp án.

---

# 11. Success Metrics
- Rút ngắn thời gian thao tác để được AI hỗ trợ xuống còn 2 clicks (Bôi đen -> Chọn tính năng).
- Phản hồi từ người dùng (Validation): Tỷ lệ học viên hài lòng với độ chính xác của câu hỏi Quiz do AI sinh ra.
- Học viên có thể tự đánh giá nhanh mức độ hiểu bài thông qua Micro-Quiz ngay trong lúc học.
