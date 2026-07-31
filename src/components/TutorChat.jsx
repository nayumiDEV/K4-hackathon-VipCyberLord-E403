import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  CircleHelp,
  LoaderCircle,
  Paperclip,
  Send,
  Sparkles,
  User,
  X,
  XCircle,
} from 'lucide-react'

const GREETING = {
  id: 'welcome',
  role: 'bot',
  text: 'Xin chào! Mình là VLearn Tutor. Bạn có thể bôi đen một đoạn trên slide để hỏi hoặc chọn câu hỏi gợi ý bên dưới nhé!',
  time: '09:00',
}

const FALLBACK =
  'Tính năng trả lời câu hỏi tự do đang được phát triển trong phiên bản tiếp theo. Vui lòng chọn các câu hỏi gợi ý bên trên nhé!'

const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    prompt: 'Đâu là điểm khác biệt lớn nhất của AI Agent so với LLM truyền thống?',
    options: [
      { key: 'A', label: 'Có khả năng tạo văn bản' },
      { key: 'B', label: 'Có khả năng tự hành động thông qua Tools' },
      { key: 'C', label: 'Cần ít token hơn' },
    ],
    correctKey: 'B',
    explanation:
      'Đúng rồi! LLM chỉ sinh văn bản, còn AI Agent được gắn thêm Tools/APIs để tự thực hiện hành động (gửi email, lướt web, truy vấn DB...).',
    wrongExplanations: {
      A: 'Sai rồi. Cả LLM lẫn AI Agent đều tạo được văn bản — đây không phải điểm khác biệt.',
      C: 'Sai rồi. AI Agent thường dùng nhiều token hơn vì phải lập kế hoạch và gọi tool nhiều lần.',
    },
  },
  {
    id: 'q2',
    prompt: 'Theo Agenda buổi học, phần nào nằm giữa “Bức tranh AI / Lịch sử AI” và “AI Agent”?',
    options: [
      { key: 'A', label: 'Cơ chế vận hành của LLM' },
      { key: 'B', label: 'Cách gọi API cơ bản' },
      { key: 'C', label: 'Fine-tuning model' },
    ],
    correctKey: 'A',
    explanation:
      'Chính xác! Lộ trình đi từ bức tranh AI → cơ chế LLM → tiến hóa lên AI Agent → rồi mới tới gọi API.',
    wrongExplanations: {
      B: 'Gần đúng thứ tự buổi học, nhưng “Cách gọi API” nằm ở phần cuối Agenda, không phải phần giữa.',
      C: 'Sai rồi. Fine-tuning không nằm trong Agenda slide này.',
    },
  },
  {
    id: 'q3',
    prompt: 'Nếu bạn “mất gốc”, nên bắt đầu từ đâu theo gợi ý của VLearn Tutor?',
    options: [
      { key: 'A', label: 'Nhảy thẳng vào code gọi API' },
      { key: 'B', label: 'Đọc “Bức tranh AI & các tầng của AI”, bỏ qua code lúc đầu' },
      { key: 'C', label: 'Học fine-tuning trước' },
    ],
    correctKey: 'B',
    explanation:
      'Đúng! Nên nắm nền tảng khái niệm trước, tạm bỏ phần code/API, rồi mới đi sâu dần.',
    wrongExplanations: {
      A: 'Sai rồi. Nhảy vào code khi chưa có nền tảng dễ bị rối và bỏ cuộc sớm.',
      C: 'Sai rồi. Fine-tuning là chủ đề nâng cao, chưa phù hợp khi mới bắt đầu.',
    },
  },
]

/** Predefined Q&A brain — exact question match returns the paired response. */
const QA_BANK = [
  {
    question: 'Tóm tắt nhanh slide này',
    type: 'text',
    answer:
      'Slide này giới thiệu Agenda tổng quan buổi học, bao gồm 4 ý chính: (1) Bức tranh toàn cảnh & Lịch sử AI, (2) Cơ chế vận hành của LLM, (3) Sự tiến hóa từ LLM lên AI Agent, và (4) Cách gọi API cơ bản. Bạn muốn đi sâu vào phần nào?',
  },
  {
    question: 'AI Agent khác gì LLM?',
    type: 'text',
    answer:
      "Rất dễ hiểu! LLM (như GPT-4) chỉ là 'bộ não' tạo ra văn bản. Còn AI Agent là LLM được gắn thêm 'chân tay' (Tools/APIs) để tự động thực hiện hành động (như gửi email, lướt web, truy vấn database) thay vì chỉ chat.",
  },
  {
    question: 'Tạo 3 câu trắc nghiệm',
    type: 'quiz',
    answer: 'Chắc chắn rồi, thử sức nhé! Chọn đáp án bên dưới — mình sẽ chấm ngay và giải thích.',
    quiz: QUIZ_QUESTIONS,
  },
  {
    question: 'Tôi bị mất gốc, nên học từ đâu?',
    type: 'text',
    answer:
      "Đừng lo! Dựa vào lộ trình này, bạn nên bắt đầu từ mục 'Bức tranh AI & các tầng của AI' trước. Hãy đọc tài liệu nền tảng, bỏ qua phần code (API) ở giai đoạn này. Cần mình giải thích khái niệm nào cứ hỏi nhé!",
  },
]

const SUGGESTIONS = QA_BANK.map((item) => item.question)

const now = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

function resolveResponse(question) {
  const normalized = question.trim().toLowerCase()
  const match = QA_BANK.find((item) => item.question.toLowerCase() === normalized)
  if (!match) return { type: 'text', text: FALLBACK }
  if (match.type === 'quiz') {
    return {
      type: 'quiz',
      text: match.answer,
      quiz: match.quiz,
    }
  }
  return { type: 'text', text: match.answer }
}

function TypingBubble() {
  return (
    <div className="animate-rise flex items-end gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
        <Bot className="h-4 w-4 text-slate-500 dark:text-slate-300" />
      </span>
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        AI đang suy nghĩ...
      </div>
    </div>
  )
}

function InteractiveQuiz({ quiz, onAnswer }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])

  const question = quiz[index]
  const finished = index >= quiz.length
  const score = answers.filter((a) => a.isCorrect).length

  const handleSelect = (key) => {
    if (selected) return
    const isCorrect = key === question.correctKey
    const explanation = isCorrect
      ? question.explanation
      : question.wrongExplanations[key] || question.explanation

    setSelected(key)
    setAnswers((prev) => [
      ...prev,
      { questionId: question.id, key, isCorrect, explanation },
    ])
    onAnswer?.()
  }

  const goNext = () => {
    setSelected(null)
    setIndex((i) => i + 1)
    onAnswer?.()
  }

  if (finished) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-800 dark:bg-slate-900">
        <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">
          Hoàn thành trắc nghiệm!
        </p>
        <p className="mt-1 text-[13px] text-slate-700 dark:text-slate-200">
          Bạn đúng {score}/{quiz.length} câu.
          {score === quiz.length
            ? ' Xuất sắc — nắm chắc Agenda rồi!'
            : score >= 2
              ? ' Khá tốt — xem lại phần giải thích ở trên nhé.'
              : ' Đừng nản — thử lại bằng chip “Tạo 3 câu trắc nghiệm”.'}
        </p>
      </div>
    )
  }

  const feedback = selected
    ? selected === question.correctKey
      ? question.explanation
      : question.wrongExplanations[selected]
    : null

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
          <CircleHelp className="h-3.5 w-3.5" />
          Câu {index + 1}/{quiz.length}
        </span>
        <span className="text-[10px] text-slate-400">
          Đúng {score}/{answers.length || 0}
        </span>
      </div>

      <p className="text-[13px] font-semibold leading-snug text-slate-800 dark:text-slate-100">
        {question.prompt}
      </p>

      <div className="mt-2.5 space-y-1.5">
        {question.options.map((opt) => {
          const isChosen = selected === opt.key
          const isCorrectOpt = opt.key === question.correctKey
          let style =
            'border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:bg-sky-950'

          if (selected) {
            if (isCorrectOpt) {
              style =
                'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-200'
            } else if (isChosen) {
              style =
                'border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-600 dark:bg-rose-950 dark:text-rose-200'
            } else {
              style =
                'border-slate-200 bg-slate-50 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-800'
            }
          }

          return (
            <button
              key={opt.key}
              type="button"
              disabled={Boolean(selected)}
              onClick={() => handleSelect(opt.key)}
              className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-[12.5px] transition active:scale-[0.99] disabled:cursor-default ${style}`}
            >
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold shadow-sm dark:bg-slate-900">
                {opt.key}
              </span>
              <span className="flex-1 leading-snug">{opt.label}</span>
              {selected && isCorrectOpt && (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              )}
              {selected && isChosen && !isCorrectOpt && (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              )}
            </button>
          )
        })}
      </div>

      {feedback && (
        <div
          className={`animate-rise mt-2.5 rounded-lg px-2.5 py-2 text-[12px] leading-relaxed ${
            selected === question.correctKey
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
          }`}
        >
          <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
            {selected === question.correctKey ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Chính xác
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Chưa đúng
              </>
            )}
          </p>
          {feedback}
        </div>
      )}

      {selected && (
        <button
          type="button"
          onClick={goNext}
          className="mt-2.5 w-full rounded-lg bg-sky-600 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-sky-700 active:scale-[0.99]"
        >
          {index + 1 < quiz.length ? 'Câu tiếp theo →' : 'Xem kết quả'}
        </button>
      )}
    </div>
  )
}

function MessageBubble({ message, onQuizAnswer }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`animate-rise flex items-end gap-2 ${
        isUser ? 'flex-row-reverse' : ''
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-sky-100 dark:bg-sky-900'
            : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-sky-600 dark:text-sky-300" />
        ) : (
          <Bot className="h-4 w-4 text-slate-500 dark:text-slate-300" />
        )}
      </span>

      <div className={`flex max-w-[92%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
            isUser
              ? 'rounded-br-sm bg-sky-600 text-white'
              : 'rounded-bl-sm border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          {message.quote && (
            <p
              className={`mb-2 border-l-2 pl-2 text-[11px] italic ${
                isUser
                  ? 'border-white/50 text-sky-50'
                  : 'border-slate-300 text-slate-500 dark:border-slate-600'
              }`}
            >
              “{message.quote}”
            </p>
          )}
          <p className="whitespace-pre-wrap">{message.text}</p>

          {message.quiz && (
            <InteractiveQuiz quiz={message.quiz} onAnswer={onQuizAnswer} />
          )}
        </div>
        <span className="mt-1 px-1 text-[10px] text-slate-400">{message.time}</span>
      </div>
    </div>
  )
}

export default function TutorChat({ page, selectedText, onClearSelection }) {
  const [messages, setMessages] = useState([GREETING])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [quizTick, setQuizTick] = useState(0)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isTyping, quizTick])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const sendMessage = (raw) => {
    const text = (raw ?? inputValue).trim()
    if (!text || isTyping) return

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      quote: selectedText || undefined,
      time: now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    onClearSelection()
    setIsTyping(true)

    const response = resolveResponse(text)

    timerRef.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: response.text,
          quiz: response.quiz,
          time: now(),
        },
      ])
      setIsTyping(false)
      inputRef.current?.focus()
    }, 1000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <aside className="flex w-1/4 min-w-[300px] flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
            <Bot className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
              VLearn Tutor
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              Trợ lý học theo ngữ cảnh
            </p>
          </div>
        </div>

        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900">
          <Sparkles className="h-3 w-3" />
          Ngữ cảnh: Slide trang {page}
        </div>
      </div>

      <div ref={scrollRef} className="scroll-slim flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onQuizAnswer={() => setQuizTick((n) => n + 1)}
          />
        ))}
        {isTyping && <TypingBubble />}
      </div>

      <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800">
        {selectedText && (
          <div className="animate-rise mb-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 dark:border-emerald-800 dark:bg-emerald-950">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="line-clamp-2 flex-1 text-[11px] italic text-emerald-800 dark:text-emerald-200">
              “{selectedText}”
            </p>
            <button
              type="button"
              onClick={onClearSelection}
              title="Bỏ đoạn đã chọn"
              className="rounded p-0.5 text-emerald-600 transition hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="scroll-slim mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
          {SUGGESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              disabled={isTyping}
              onClick={() => sendMessage(question)}
              className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              {question}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-sky-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-sky-600 dark:focus-within:ring-sky-900/50">
          <button
            type="button"
            title="Đính kèm tệp"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi hoặc chọn gợi ý..."
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!inputValue.trim() || isTyping}
            title="Gửi câu hỏi"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm transition hover:bg-sky-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-slate-400">
          Nhấn Enter để gửi · Chọn gợi ý để nhận câu trả lời chính xác
        </p>
      </div>
    </aside>
  )
}
