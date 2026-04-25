import { useRef, useEffect, useState } from 'react'

export default function PopoverShell({ anchorEl, onClose, width = 320, title, children, headerRight, onBack }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const top = Math.max(8, rect.bottom + 6)
    const maxHeight = window.innerHeight - top - 8
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    setPos({ left, top, maxHeight })
  }, [anchorEl, width])

  useEffect(() => {
    function handler(e) {
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
        className="px-3 pt-2.5 pb-2 flex items-center justify-between sticky top-0 z-10 rounded-t-xl"
        style={{ background: 'var(--popover)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {onBack && (
            <button onClick={onBack} className="transition-colors flex-shrink-0 -ml-0.5" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {title && (
            <span className="font-mono text-[11px] uppercase tracking-[0.07em] truncate" style={{ color: 'var(--text-secondary)' }}>
              {title}
            </span>
          )}
          {headerRight && <div className="ml-auto">{headerRight}</div>}
        </div>
        <button
          onClick={onClose}
          className="text-base leading-none transition-colors ml-2 flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  )
}
