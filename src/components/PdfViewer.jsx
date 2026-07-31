import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Highlighter,
  Minus,
  Pen,
  Plus,
  Trash2,
} from 'lucide-react'

const TOTAL_PAGES = 12
const WATERMARK = 'PHẠM HOÀNG CHƯƠNG - 26AI.CHUONGPH@VINUNI.EDU.VN'

/* The slide is laid out at a fixed 4:3 canvas and scaled to fit the column,
   so the composition never reflows or clips the way a real PDF page wouldn't. */
const PAGE_W = 720
const PAGE_H = 540

const TOOLS = [
  { id: 'read', label: 'Đọc', icon: BookOpen },
  { id: 'pen', label: 'Bút', icon: Pen },
  { id: 'highlight', label: 'Highlight', icon: Highlighter },
]

const AGENDA = [
  { title: 'Bức tranh AI', desc: 'Toàn cảnh hệ sinh thái trí tuệ nhân tạo hiện nay' },
  { title: 'Lịch sử AI', desc: 'Các cột mốc từ 1956 tới làn sóng học sâu' },
  { title: 'Từ LLM đến AI Agent', desc: 'Mô hình ngôn ngữ lớn và khả năng hành động' },
]

function ToolbarDivider() {
  return <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />
}

export default function PdfViewer({ page, onPageChange, onSelectText }) {
  const [tool, setTool] = useState('read')
  const [zoom, setZoom] = useState(100)
  const [fitScale, setFitScale] = useState(1)
  const scrollAreaRef = useRef(null)

  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setFitScale(Math.min(1, entry.contentRect.width / PAGE_W))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scale = fitScale * (zoom / 100)

  const handleMouseUp = () => {
    const text = window.getSelection()?.toString().trim()
    if (!text || text.length < 2) return
    onSelectText(text.length > 180 ? `${text.slice(0, 180)}…` : text)
  }

  return (
    <section className="flex w-1/2 flex-col overflow-hidden">
      <div className="m-4 mb-0 flex shrink-0 flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTool(id)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition active:scale-95 ${
              tool === id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}

        <ToolbarDivider />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Trang trước"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[74px] text-center text-xs font-semibold text-slate-700 dark:text-slate-200">
            Trang {page}
            <span className="font-normal text-slate-400"> / {TOTAL_PAGES}</span>
          </span>
          <button
            type="button"
            title="Trang sau"
            onClick={() => onPageChange(Math.min(TOTAL_PAGES, page + 1))}
            disabled={page === TOTAL_PAGES}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <ToolbarDivider />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Thu nhỏ"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Đặt lại 100%"
            onClick={() => setZoom(100)}
            className="min-w-[46px] rounded-md py-1 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {zoom}%
          </button>
          <button
            type="button"
            title="Phóng to"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            title="Tải xuống"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Xóa ghi chú"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-red-50 hover:text-red-600 active:scale-95 dark:text-slate-400 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollAreaRef}
        onMouseUp={handleMouseUp}
        className={`scroll-slim flex-1 overflow-auto p-4 ${
          tool === 'read' ? '' : 'cursor-crosshair'
        }`}
      >
        <div
          className="mx-auto"
          style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
        >
          <div
            className="relative origin-top-left overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md transition-transform duration-200 dark:border-slate-700"
            style={{
              width: PAGE_W,
              height: PAGE_H,
              transform: `scale(${scale})`,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex select-none flex-col justify-around overflow-hidden opacity-[0.06]"
            >
              {[0, 1, 2, 3, 4].map((row) => (
                <p
                  key={row}
                  className="-rotate-[24deg] whitespace-nowrap text-center text-sm font-bold tracking-wider text-slate-900"
                >
                  {WATERMARK} · {WATERMARK}
                </p>
              ))}
            </div>

            <div className="relative h-full p-10">
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
                      COMP2010 · Day 01
                    </p>
                    <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                      Agenda
                    </h1>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    Slide {page}
                  </span>
                </div>

                <div className="mt-6 flex-1 rounded-xl bg-emerald-600 p-7 text-white shadow-inner">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                    Nội dung buổi học
                  </p>
                  <ul className="mt-5 space-y-4">
                    {AGENDA.map((item, i) => (
                      <li key={item.title} className="flex items-start gap-3.5">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                          {i + 1}
                        </span>
                        <span>
                          <span className="block text-lg font-semibold leading-snug">
                            {item.title}
                          </span>
                          <span className="block text-sm text-emerald-100">
                            {item.desc}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-400">
                  <span>VinUniversity · College of Engineering &amp; Computer Science</span>
                  <span>{page} / {TOTAL_PAGES}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="pt-4 text-center text-[11px] text-slate-400">
          Bôi đen bất kỳ đoạn nội dung nào trên slide để hỏi VLearn Tutor.
        </p>
      </div>
    </section>
  )
}
