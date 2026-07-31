import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from 'lucide-react'

const USER_EMAIL = '26ai.chuongph@vinuni.edu.vn'

function VLearnLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="url(#vl-grad)" />
        <path d="M9 9.5h3.6l3.4 10.2 3.4-10.2H23l-5.3 14.2h-3.4L9 9.5Z" fill="#fff" />
        <defs>
          <linearGradient id="vl-grad" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#10b981" />
            <stop offset="1" stopColor="#0d9488" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        V<span className="text-emerald-600 dark:text-emerald-400">Learn</span>
      </span>
    </div>
  )
}

export default function TopNav({ dark, onToggleDark, lang, onToggleLang }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClickAway = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onEscape = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onClickAway)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickAway)
      document.removeEventListener('keydown', onEscape)
    }
  }, [menuOpen])

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex w-1/4 min-w-0 items-center gap-3">
        <button
          type="button"
          title="Quay lại"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <VLearnLogo />
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center px-4">
        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
          day01_302.pdf
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          COMP2010 · Lecture_material
        </p>
      </div>

      <div className="flex w-1/4 items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onToggleLang}
          title="Đổi ngôn ngữ"
          className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
        >
          {lang}
        </button>

        <button
          type="button"
          onClick={onToggleDark}
          title={dark ? 'Chế độ sáng' : 'Chế độ tối'}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 max-w-[190px] items-center gap-2 rounded-lg pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              PC
            </span>
            <span className="hidden truncate text-xs font-medium text-slate-700 lg:block dark:text-slate-200">
              26ai.chuongph@...
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                menuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {menuOpen && (
            <div className="animate-rise absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Phạm Hoàng Chương
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {USER_EMAIL}
                </p>
              </div>
              <ul className="p-1.5 text-sm">
                {[
                  { icon: User, label: 'Hồ sơ cá nhân' },
                  { icon: Settings, label: 'Cài đặt' },
                  { icon: Check, label: 'Tiến độ học tập' },
                ].map(({ icon: Icon, label }) => (
                  <li key={label}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Icon className="h-4 w-4 text-slate-400" />
                      {label}
                    </button>
                  </li>
                ))}
                <li className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-700">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
