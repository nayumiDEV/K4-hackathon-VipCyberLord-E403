# Nhiệm vụ: User Researcher & QA (Đảm bảo chất lượng)

**Tên người nhận việc:** [Điền tên]
**Mục tiêu:** Là tiếng nói của Khách hàng (User). Cung cấp dữ liệu thật để chứng minh sản phẩm có ích, và là người "phá" phần mềm (QA) để tìm lỗi trước khi Ban Giám Khảo tìm ra.

## 📋 Chi tiết các bước thực hiện (Từ số 0 đến hoàn chỉnh):

### Giai đoạn 1: Data Mining & Problem Validation
- [ ] Truy cập thư mục `data/` chứa Chatlog thật của khóa học.
- [ ] Đọc lướt 200 tin nhắn. Tìm pattern: Người học hay gặp khó khăn gì? (Đọc tài liệu quá dài? Không hiểu từ chuyên ngành? Cần người dò bài?).
- [ ] Đếm số liệu (Ví dụ: 50/200 tin nhắn là hỏi về thuật ngữ mới). Ghi chú lại 5 đoạn quote đau đớn nhất để ném vào Slide.
- [ ] Xác định Persona (Người dùng mục tiêu): Họ là ai? Học vào giờ nào? Tại sao lại lười đọc PDF?

### Giai đoạn 2: Định nghĩa Quality Bar (Cùng AI Engineer)
- [ ] "Thế nào là một câu trả lời Tốt?". Viết định nghĩa rõ ràng: 
  - Đạt 3 điểm: Đúng kiến thức, giọng điệu dễ thương, độ dài < 100 chữ, trích dẫn đúng số trang Slide.
  - Đạt 1 điểm: Bịa kiến thức hoặc trả lời quá 300 chữ (Học viên lười đọc sẽ không đọc nổi).

### Giai đoạn 3: QA (Kiểm thử hệ thống)
- [ ] Khi Frontend và Backend vừa code xong bản Draft (Kể cả chạy bằng mock data). Bạn là người đầu tiên xài thử.
- [ ] Test mọi kịch bản lỗi (Edge cases):
  - Bấm nút "Quiz" liên tục 10 lần xem web có lag không?
  - Highlight toàn bộ 10 trang PDF rồi bấm "Tóm tắt" xem hệ thống có sập vì quá tải chữ không?
  - Tắt mạng (Offline) rồi bấm xem Frontend có hiện thông báo lỗi tử tế không, hay bị trắng trang?
- [ ] Ghi danh sách Bug (Lỗi) bắt Dev sửa.

### Giai đoạn 4: User Validation (Sáng ngày 2)
- [ ] Lập kịch bản phỏng vấn Usability Test:
  - Task 1: "Cậu hãy thử dùng tool này làm 1 bài quiz của trang 5".
  - Task 2: "Cậu hãy tìm cách bảo con AI tóm tắt giúp cậu".
- [ ] Cầm máy đi kiếm 5 học viên khác nhóm. Bấm giờ xem họ mất bao lâu để tìm ra nút bấm. Nhìn xem họ có bị bối rối không.
- [ ] Viết Feedback Log: Họ khen gì, chê gì. Rút ra 2 thay đổi bắt buộc Dev phải sửa trước giờ G.
