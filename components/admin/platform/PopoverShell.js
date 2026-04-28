import { useRef, useEffect, useState } from 'react'

export default function PopoverShell({ anchorEl, onClose, width = 320, title, children, headerRight, onBack }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const belowSpace = window.innerHeight - rect.bottom - 8
    const aboveSpace = rect.top - 8
    const shouldOpenUp = belowSpace < 320 && aboveSpace > belowSpace
    const maxHeight = Math.max(180, Math.min(560, shouldOpenUp ? aboveSpace : belowSpace))
    const top = shouldOpenUp
      ? Math.max(8, rect.top - maxHeight - 6)
      : Math.max(8, rect.bottom + 6)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    setPos({ left, top, maxHeight })
  }, [anchorEl, width])

  useEffect(() => {
    function handler(e) {
      if (e.target.closest('[data-photo-picker]')) return
      if (ref.current && !ref.current.contains(e.target) && anchorEl && !anchorEl.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorEl])

  return (
    <div
      ref={ref}
      className="fixed z-[9999] overflow-auto rounded-xl"
      style={{
        width,
        maxHeight: pos?.maxHeight ?? '80vh',
        left: pos?.left,
        top: pos?.top,
        visibility: pos ? undefined : 'hidden',
        background: 'var(--popover)',
        boxShadow: 'var(--popover-shadow)',
      }}
    >
      {/* Header */}
      <div
        className="px-3.5 flex items-center sticky top-0 z-10 rounded-t-xl"
        style={{
          height: 40,
          background: 'var(--popover)',
          borderBottom: '1px solid rgba(160,140,110,0.22)',
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="transition-colors flex-shrink-0 mr-1.5 -ml-1 w-6 h-6 flex items-center justify-center rounded hover:bg-black/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {title && (
          typeof title === 'string' ? (
            <span
              className="font-mono uppercase truncate"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.13em',
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
            >
              {title}
            </span>
          ) : (
            title
          )
        )}
        <div className="ml-auto flex items-center gap-0.5">
          {headerRight}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5 flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}
