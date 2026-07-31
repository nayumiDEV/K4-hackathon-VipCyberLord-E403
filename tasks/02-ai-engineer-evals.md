# Nhiệm vụ: AI / Prompt Engineer

**Tên người nhận việc:** [Điền tên]
**Mục tiêu:** Là "não bộ" của hệ thống. Đảm bảo LLM hiểu đúng ngữ cảnh, trả về đúng định dạng, và đo lường được tỷ lệ sai sót.

## 📋 Chi tiết các bước thực hiện (Từ số 0 đến hoàn chỉnh):

### Giai đoạn 1: Context Engineering (Xử lý ngữ cảnh)
- [✅] Bài toán: AI cần đọc PDF. LLM không thể tự nhìn PDF. 
- [✅] Nhiệm vụ: Bàn với Backend cách bóc tách chữ từ PDF (Dùng thư viện OCR hoặc thư viện parse PDF to Text).
- [✅] Thiết kế cơ chế RAG (Retrieval-Augmented Generation) siêu cơ bản: Chỉ cần ném nội dung của Trang Slide hiện tại (Current Page Content) vào Prompt thay vì ném cả file PDF dài 100 trang để tiết kiệm Token và tránh AI bị "ngáo".

### Giai đoạn 2: Prompt Design (Thiết kế Prompt)
- [✅] Tạo 4 System Prompts riêng biệt cho 4 chức năng:
  1. `PROMPT_SUMMARIZE`: "Bạn là VLearn Tutor. Hãy tóm tắt đoạn văn bản sau bằng tiếng Việt, dùng bullet points ngắn gọn..."
  2. `PROMPT_EXPLAIN`: "Bạn là chuyên gia giáo dục. Hãy giải thích thuật ngữ [X] trong ngữ cảnh đoạn văn [Y] sao cho học sinh lớp 12 hiểu được."
  3. `PROMPT_MINDMAP`: "Dựa vào đoạn [X], hãy trả về một cấu trúc Markdown dạng cây (Tree) để vẽ Mindmap..."
  4. `PROMPT_QUIZ`: "Dựa vào nội dung [X], sinh ra 1 câu hỏi trắc nghiệm. Trả về đúng định dạng JSON: { question: '', options: [{id, text, isCorrect, explanation}] }." (Quan trọng: Bắt AI trả JSON để Frontend dễ vẽ nút bấm).

### Giai đoạn 3: Xây dựng Golden Set & Evals (Kiểm thử AI)
- [✅] Lập file Excel/CSV `eval/golden_set.csv`.
- [✅] Cột: `ID`, `Chức năng`, `Input (Đoạn text bôi đen)`, `Kỳ vọng (Output phải có gì)`, `Đánh giá (Pass/Fail)`.
- [✅] Tạo 20 cases. Phải cố tình tạo ra case "Hiểm": Bôi đen một đoạn text vô nghĩa, bôi đen câu chửi thề, hoặc hỏi một câu không có trong tài liệu xem AI có biết "Từ chối trả lời" hay không.
- [✅] Đưa prompt cho Backend ráp vào code. Sau đó chạy 20 cases này qua hệ thống thật, đếm tỷ lệ Pass. Chỉnh sửa prompt (Tuning) cho đến khi Pass >= 80%.
- [✅] Cấu hình Model Parameter: Nên set `Temperature = 0.2` (thấp) để AI trả lời bám sát tài liệu, không bịa chuyện (Hallucination).
