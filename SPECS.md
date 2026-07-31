# SPECS.md

# VLearn AI Study Assistant

## 1. Tổng quan

### Tên đề tài
VLearn AI Study Assistant

### Mục tiêu

Xây dựng hệ thống AI hỗ trợ học tập ngay bên trong VLearn, giúp học viên có thể học, ôn tập và ghi nhớ kiến thức nhanh hơn mà không cần đọc toàn bộ tài liệu nhiều lần.

AI sẽ hiểu toàn bộ nội dung bài giảng, hỗ trợ tóm tắt, tạo câu hỏi ôn tập, flashcard, mindmap và đưa ra lộ trình ôn tập cá nhân hóa dựa trên kết quả học của từng người.

---

# 2. Problem Statement

## Ai đang gặp vấn đề

Học viên đang học trên hệ thống VLearn.

## Pain Points

Hiện tại chatbot chỉ có thể trả lời trong phạm vi context nhỏ, chưa hiểu toàn bộ bài học nên chưa đáp ứng được nhu cầu học tập thực tế.

Các vấn đề chính:

- Không thể tóm tắt toàn bộ chương hoặc toàn bộ khóa học.
- Không thể liên kết kiến thức giữa nhiều bài học.
- Chưa có quiz cá nhân hóa.
- Không biết người học đang yếu phần nào.
- Không có lộ trình ôn tập phù hợp.
- Người học phải thao tác nhiều bước để sử dụng AI.
- Không thể hỏi AI ngay từ Dashboard hoặc trang khóa học.

---

# 3. Evidence

Các vấn đề được ghi nhận:

1. Người học muốn ôn tập nhanh theo đúng phần mình chưa hiểu nhưng chưa có công cụ hỗ trợ.

2. Chưa có quy trình học tập khoa học bằng AI.

3. AI chưa thể kết nối kiến thức giữa nhiều bài học.

4. Sau khi làm quiz không có đánh giá để đề xuất ôn tập.

5. Người học phải mở tài liệu rồi mới sử dụng chatbot.

6. Không thể tương tác với AI ngay tại Dashboard hoặc Course.

---

# 4. One Sentence

> Làm sao để học viên nắm được nội dung chính của bài giảng một cách nhanh chóng, trực quan và cá nhân hóa nhất.

---

# 5. Solution

Xây dựng AI Study Assistant hoạt động xuyên suốt toàn bộ hệ thống VLearn.

AI sẽ:

- Đọc toàn bộ tài liệu PDF/PPT.
- Hiểu cấu trúc môn học.
- Hiểu mối liên kết giữa các bài học.
- Trả lời theo toàn bộ học phần thay vì chỉ slide hiện tại.
- Tự động tạo tài liệu ôn tập.
- Theo dõi kết quả học.
- Đề xuất phần cần ôn.

---

# 6. Scope

## Trong phạm vi

### 1. AI Summary

Người dùng có thể:

- Tóm tắt slide hiện tại
- Tóm tắt bài học
- Tóm tắt toàn bộ chương
- Tóm tắt toàn bộ môn

Output:

- Bullet points
- Timeline
- Concept summary

---

### 2. Key Points

AI trích xuất:

- Ý chính
- Công thức
- Định nghĩa
- Keyword
- Những nội dung dễ thi

---

### 3. Explain

Giải thích:

- Thuật ngữ
- Công thức
- Ví dụ
- So sánh khái niệm

Có nhiều mức:

- Beginner
- Intermediate
- Advanced

---

### 4. Mindmap Generator

Sinh Mindmap từ toàn bộ bài học.

Bao gồm:

- Chủ đề
- Nhánh
- Quan hệ giữa các khái niệm

---

### 5. Flashcard Generator

Sinh Flashcard tự động.

Các loại:

- Definition
- Concept
- Formula
- True / False
- Question / Answer

---

### 6. Quiz Generator

Sinh quiz theo:

- Slide hiện tại
- Bài học
- Chương
- Toàn bộ khóa học

Các dạng:

- Multiple Choice
- True / False
- Fill Blank
- Matching

Có thể chọn:

- 5 câu
- 10 câu
- 20 câu
- 50 câu

---

### 7. Personalized Quiz

AI sử dụng:

- Lịch sử quiz
- Những câu sai
- Chủ đề yếu

để tạo đề mới phù hợp với từng người.

---

### 8. Learning Recommendation

Sau mỗi lần học AI sẽ đề xuất:

- Nên học tiếp bài nào
- Ôn lại phần nào
- Nội dung nào dễ quên

---

### 9. Knowledge Linking

AI liên kết:

Ví dụ:

Database Index

↓

Database Optimization

↓

Transaction

↓

Deadlock

↓

Concurrency

Thay vì coi từng bài riêng lẻ.

---

### 10. Dashboard AI

Ngay từ Dashboard người dùng có thể:

- Hỏi AI
- Tìm kiếm kiến thức
- Tóm tắt khóa học
- Làm quiz nhanh

Không cần mở tài liệu.

---

### 11. In-Lecture AI

Khi xem slide:

Có menu nhanh:

- Tóm tắt slide
- Giải thích
- Tạo Flashcard
- Tạo Quiz
- Mindmap
- Key points

---

# 7. User Flow

```
Dashboard

↓

Chọn khóa học

↓

AI Index toàn bộ tài liệu

↓

Người dùng chọn chức năng

↓

AI sinh nội dung

↓

Người dùng học

↓

Quiz

↓

Đánh giá kết quả

↓

AI đề xuất nội dung cần ôn

↓

Tiếp tục học
```

---

# 8. Functional Requirements

## AI Context Engine

- Đọc PDF
- Đọc PPT
- Đọc OCR
- Chunk tài liệu
- Vector Search
- Semantic Search

---

## AI Learning Engine

Hỗ trợ:

- Summary
- Explain
- Flashcard
- Quiz
- Mindmap
- Key Points

---

## Quiz Engine

Quản lý:

- Sinh đề
- Chấm điểm
- Lưu kết quả
- Phân tích điểm yếu

---

## Recommendation Engine

Đề xuất:

- Chủ đề cần học
- Chủ đề cần ôn
- Mức độ thành thạo

---

## Progress Tracking

Theo dõi:

- Số lần học
- Quiz history
- Accuracy
- Weak topics
- Strong topics

---

# 9. Non-functional Requirements

- Phản hồi dưới 5 giây cho các tác vụ phổ biến.
- Hỗ trợ đồng thời nhiều người dùng.
- Có khả năng mở rộng theo số lượng khóa học.
- Dữ liệu học tập được lưu an toàn.
- AI có thể tái sử dụng context giữa nhiều cuộc hội thoại.

---

# 10. AI Responsibilities

AI có thể tự động:

✅ Đọc PDF

✅ Đọc PPT

✅ Hiểu toàn bộ bài học

✅ Hiểu toàn bộ chương

✅ Liên kết kiến thức

✅ Sinh Summary

✅ Sinh Quiz

✅ Sinh Flashcard

✅ Sinh Mindmap

✅ Giải thích thuật ngữ

✅ Đánh giá điểm yếu

✅ Gợi ý lộ trình học

---

# 11. Success Metrics

Sau khi triển khai:

- Giảm số thao tác để bắt đầu học với AI từ nhiều bước xuống còn 1–2 thao tác.
- Người học có thể tạo quiz trong dưới 10 giây.
- 100% bài giảng có thể được tóm tắt tự động.
- AI có thể trả lời dựa trên toàn bộ nội dung môn học thay vì chỉ slide hiện tại.
- Quiz được cá nhân hóa dựa trên lịch sử học và kết quả trước đó.
- Tăng tỷ lệ hoàn thành bài học và mức độ ghi nhớ thông qua các tính năng ôn tập chủ động (Active Recall, Spaced Repetition).

---

# 12. Future Scope

- Voice Chat với AI.
- AI Tutor theo dõi quá trình học theo thời gian thực.
- Ôn tập bằng Spaced Repetition.
- Học nhóm với AI.
- AI tự sinh đề thi giữa kỳ và cuối kỳ.
- AI đánh giá mức độ sẵn sàng trước kỳ thi.
- Đồng bộ tiến độ học trên nhiều thiết bị.
```
