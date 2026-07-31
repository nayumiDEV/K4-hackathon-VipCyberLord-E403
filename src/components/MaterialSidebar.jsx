import { useState } from 'react'
import {
  ChevronRight,
  FileText,
  FolderOpen,
  Presentation,
  Search,
} from 'lucide-react'

const DAYS = [
  {
    id: 'day01',
    label: 'Day 01',
    note: 'Nhập môn AI',
    items: [
      { id: 'day01_302', name: 'day01_302.pdf', meta: '12 trang · PDF', icon: FileText },
      { id: 'material_mrx', name: 'material_mrx...', meta: '8 trang · Slide', icon: Presentation },
    ],
  },
  {
    id: 'day02',
    label: 'Day 02',
    note: 'Machine Learning',
    items: [
      { id: 'day02_101', name: 'day02_101.pdf', meta: '15 trang · PDF', icon: FileText },
      { id: 'day02_lab', name: 'lab02_notebook...', meta: 'Bài thực hành', icon: Presentation },
    ],
  },
  {
    id: 'day03',
    label: 'Day 03',
    note: 'Deep Learning',
    items: [
      { id: 'day03_201', name: 'day03_201.pdf', meta: '20 trang · PDF', icon: FileText },
    ],
  },
  {
    id: 'day04',
    label: 'Day 04',
    note: 'LLM & AI Agent',
    items: [
      { id: 'day04_agent', name: 'day04_agent.pdf', meta: '18 trang · PDF', icon: FileText },
    ],
  },
]

export default function MaterialSidebar() {
  const [openDays, setOpenDays] = useState(['day01'])
  const [activeItem, setActiveItem] = useState('day01_302')
  const [query, setQuery] = useState('')

  const toggleDay = (id) =>
    setOpenDays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    )

  const visibleDays = DAYS.map((day) => ({
    ...day,
    items: query
      ? day.items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
      : day.items,
  })).filter((day) => !query || day.items.length > 0)

  return (
    <aside className="flex w-1/4 min-w-[240px] flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="shrink-0 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Học liệu môn học
          </h2>
        </div>
        <p className="mt-0.5 pl-6.5 text-xs text-slate-500 dark:text-slate-400">
          COMP2010 · 4 buổi · 6 tài liệu
        </p>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tài liệu..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8.5 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-emerald-600 dark:focus:bg-slate-800 dark:focus:ring-emerald-900/50"
          />
        </div>
      </div>

      <nav className="scroll-slim flex-1 space-y-1 overflow-y-auto p-2">
        {visibleDays.map((day) => {
          const isOpen = openDays.includes(day.id) || Boolean(query)
          return (
            <div key={day.id}>
              <button
                type="button"
                onClick={() => toggleDay(day.id)}
                className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                />
                <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {day.label}
                </span>
                <span className="text-[11px] text-slate-400">{day.note}</span>
              </button>

              {isOpen && (
                <ul className="ml-4.5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-700">
                  {day.items.map((item) => {
                    const Icon = item.icon
                    const active = activeItem === item.id
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setActiveItem(item.id)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                            active
                              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800'
                              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">
                              {item.name}
                            </span>
                            <span className="block truncate text-[11px] text-slate-400">
                              {item.meta}
                            </span>
                          </span>
                          {active && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}

        {visibleDays.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-slate-400">
            Không tìm thấy tài liệu phù hợp.
          </p>
        )}
      </nav>

      <div className="shrink-0 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>Tiến độ khóa học</span>
          <span className="text-emerald-600 dark:text-emerald-400">25%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full w-1/4 rounded-full bg-emerald-500" />
        </div>
      </div>
    </aside>
  )
}
