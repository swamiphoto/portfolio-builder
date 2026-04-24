import { useRef, useEffect, useState } from 'react'

export default function PopoverShell({ anchorEl, onClose, width = 320, title, children, headerRight, onBack }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const top = Math.max(8, rect.bottom + 4)
    const maxHeight = window.innerHeight - top - 8
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    setPos({ left, top, maxHeight })
  }, [anchorEl, width])

  useEffect(() => {
    function handler(e) {
      if (
        ref.current && !ref.current.contains(e.target) &&
        anchorEl && !anchorEl.contains(e.target)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorEl])

  return (
    <div
      ref={ref}
      className="fixed z-[9999] overflow-auto scroll-quiet"
      style={{
        width,
        maxHeight: pos?.maxHeight ?? '80vh',
        left: pos?.left,
        top: pos?.top,
        visibility: pos ? undefined : 'hidden',
        background: 'var(--paper)',
        border: '1px solid var(--rule)',
        boxShadow: 'var(--pane-shadow-lift)',
      }}
    >
      {title ? (
        <div
          className="px-3 pt-2.5 pb-2 flex items-center justify-between sticky top-0 z-10"
          style={{ background: 'var(--paper)', borderBottom: '1px solid var(--rule)' }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {onBack && (
              <button onClick={onBack} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink-4)', display: 'flex', alignItems: 'center', padding: 0, marginLeft: -2 }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }} className="truncate">{title}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            {headerRight}
            <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink-4)', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', padding: 2 }}>×</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end px-2 pt-1.5 sticky top-0 z-10" style={{ background: 'var(--paper)' }}>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink-4)', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}
      {children}
    </div>
  )
}
