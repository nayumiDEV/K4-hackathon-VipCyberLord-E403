import { useEffect, useRef, useState } from 'react'
import { X, Gamepad2, ExternalLink } from 'lucide-react'

/**
 * FlappyQuizPopup — Cửa sổ popup chứa game Flappy Quiz
 *
 * Props:
 *  - open: boolean — có đang mở không
 *  - onClose: () => void — đóng popup
 *  - quizData?: Array<{q, options, correct}> — dữ liệu quiz (mặc định dùng trong HTML)
 *  - position?: { x, y } — vị trí popup (mặc định căn giữa)
 *  - size?: { w, h } — kích thước popup
 */
export default function FlappyQuizPopup({
  open,
  onClose,
  quizData,
  position = { x: null, y: null }, // null = căn giữa
  size = { w: 520, h: 760 },
}) {
  const iframeRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [pos, setPos] = useState({ x: position.x, y: position.y })
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // Khi mở/đóng: tiêu điểm + ESC để đóng
  useEffect(() => {
    if (!open) return
    const handleEsc = (e) => { if (e.key === 'Escape') onClose?.() }
    const handleMsg = (e) => {
      if (e.data?.type === 'flappy-quiz-close') onClose?.()
    }
    document.addEventListener('keydown', handleEsc)
    window.addEventListener('message', handleMsg)
    return () => {
      document.removeEventListener('keydown', handleEsc)
      window.removeEventListener('message', handleMsg)
    }
  }, [open, onClose])

  // Inject quiz data vào iframe qua postMessage khi sẵn sàng
  useEffect(() => {
    if (!open || !iframeRef.current || !quizData) return
    const sendData = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'flappy-quiz-data', payload: quizData },
        '*'
      )
    }
    // Đợi iframe load
    const iframe = iframeRef.current
    iframe.addEventListener('load', sendData)
    // Trường hợp iframe đã load sẵn
    sendData()
    return () => iframe.removeEventListener('load', sendData)
  }, [open, quizData])

  if (!open) return null

  // Kích thước viewport để căn giữa khi position null
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 720
  const computedX = pos.x ?? Math.max(20, (viewportW - size.w) / 2)
  const computedY = pos.y ?? Math.max(20, (viewportH - size.h) / 2)

  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return
    setDragging(true)
    dragOffsetRef.current = {
      x: e.clientX - computedX,
      y: e.clientY - computedY,
    }
  }
  useEffect(() => {
    if (!dragging) return
    const handleMove = (e) => {
      setPos({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      })
    }
    const handleUp = () => setDragging(false)
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [dragging])

  const openInNewTab = () => {
    const url = '/flappy-quiz.html'
    window.open(url, '_blank', `width=${size.w},height=${size.h}`)
  }

  return (
    <>
      {/* Backdrop mờ (click ra ngoài để đóng) */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 9998,
        }}
      />

      {/* Cửa sổ popup */}
      <div
        style={{
          position: 'fixed',
          left: computedX,
          top: computedY,
          width: size.w,
          height: size.h,
          zIndex: 9999,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          cursor: dragging ? 'grabbing' : 'default',
        }}
      >
        {/* Header (drag handle) */}
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={openInNewTab}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <Gamepad2 size={18} />
          <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>
            Flappy Quiz · VLearn Mini Game
          </span>
          <button
            type="button"
            className="no-drag"
            onClick={openInNewTab}
            title="Mở trong tab mới"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 6,
              padding: 6,
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ExternalLink size={14} />
          </button>
          <button
            type="button"
            className="no-drag"
            onClick={onClose}
            title="Đóng (ESC)"
            style={{
              background: 'rgba(229,57,53,0.9)',
              border: 'none',
              borderRadius: 6,
              padding: 6,
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Iframe game */}
        <div style={{ flex: 1, position: 'relative', background: '#4ec0ca' }}>
          <iframe
            ref={iframeRef}
            src="/flappy-quiz.html"
            title="Flappy Quiz Game"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        </div>

        {/* Footer */}
        <div
          className="no-drag"
          style={{
            padding: '6px 14px',
            background: '#f5f5f5',
            borderTop: '1px solid #e0e0e0',
            fontSize: 11,
            color: '#666',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>🖱️ Click chuột / Space để chim bay</span>
          <span>ESC để đóng · Double-click header để bung ra tab mới</span>
        </div>
      </div>
    </>
  )
}