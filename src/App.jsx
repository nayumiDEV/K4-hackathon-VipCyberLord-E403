import { useState } from 'react'
import TopNav from './components/TopNav.jsx'
import MaterialSidebar from './components/MaterialSidebar.jsx'
import PdfViewer from './components/PdfViewer.jsx'
import TutorChat from './components/TutorChat.jsx'

export default function App() {
  const [dark, setDark] = useState(false)
  const [lang, setLang] = useState('VI')
  const [page, setPage] = useState(3)
  const [selectedText, setSelectedText] = useState('')

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <TopNav
          dark={dark}
          onToggleDark={() => setDark((v) => !v)}
          lang={lang}
          onToggleLang={() => setLang((v) => (v === 'VI' ? 'EN' : 'VI'))}
        />

        <main className="flex flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
          <MaterialSidebar />
          <PdfViewer
            page={page}
            onPageChange={setPage}
            onSelectText={setSelectedText}
          />
          <TutorChat
            page={page}
            selectedText={selectedText}
            onClearSelection={() => setSelectedText('')}
          />
        </main>
      </div>
    </div>
  )
}
