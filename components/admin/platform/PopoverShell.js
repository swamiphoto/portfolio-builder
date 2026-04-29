import { useRef, useEffect, useState } from 'react'

export default function PopoverShell({ anchorEl, anchorRect: anchorRectProp, onClose, width = 320, title, children, headerRight, onBack, placement = 'below', draggable = false }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 })
  const dragStateRef = useRef(null)

  useEffect(() => {
    const rect = anchorRectProp || (anchorEl ? anchorEl.getBoundingClientRect() : null)
    if (!rect) return

    if (placement === 'right') {
      const rightSpace = window.innerWidth - rect.right - 8
      const leftSpace = rect.left - 8
      const openLeft = rightSpace < width && leftSpace > rightSpace
      const left = openLeft
        ? Math.max(8, rect.left - width - 8)
        : Math.min(rect.right + 8, window.innerWidth - width - 8)
      const maxHeight = Math.max(200, window.innerHeight - 16)
      const top = Math.max(8, Math.min(rect.top, window.innerHeight - maxHeight - 8))
      setPos({ left, top, maxHeight })
      return
    }

    const belowSpace = window.innerHeight - rect.bottom - 8
    const aboveSpace = rect.top - 8
    const shouldOpenUp = belowSpace < 320 && aboveSpace > belowSpace
    const maxHeight = Math.max(180, Math.min(560, shouldOpenUp ? aboveSpace : belowSpace))
    const top = shouldOpenUp
      ? Math.max(8, rect.top - maxHeight - 6)
      : Math.max(8, rect.bottom + 6)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    setPos({ left, top, maxHeight })
  }, [anchorEl, anchorRectProp, width, placement])

  useEffect(() => {
    function handler(e) {
      if (e.target.closest('[data-photo-picker]')) return
      const outsidePopover = ref.current && !ref.current.contains(e.target)
      const outsideAnchor = !anchorEl || !anchorEl.contains(e.target)
      if (outsidePopover && outsideAnchor) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorEl])

  useEffect(() => {
    if (!draggable) return
    function onMove(e) {
      if (!dragStateRef.current) return
      setDragDelta({
        x: dragStateRef.current.origX + (e.clientX - dragStateRef.current.startX),
        y: dragStateRef.current.origY + (e.clientY - dragStateRef.current.startY),
      })
    }
    function onUp() { dragStateRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [draggable])

  function handleHeaderMouseDown(e) {
    if (!draggable) return
    if (e.target.closest('button')) return
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, origX: dragDelta.x, origY: dragDelta.y }
    e.preventDefault()
  }

  return (
    <div
      ref={ref}
      className="fixed z-[9999] overflow-auto rounded-xl"
      style={{
        width,
        maxHeight: pos?.maxHeight ?? '80vh',
        left: (pos?.left ?? 0) + dragDelta.x,
        top: (pos?.top ?? 0) + dragDelta.y,
        visibility: pos ? undefined : 'hidden',
        background: 'var(--popover)',
        boxShadow: 'var(--popover-shadow)',
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="px-3.5 flex items-center sticky top-0 z-10 rounded-t-xl"
        style={{
          height: 40,
          background: 'var(--popover)',
          borderBottom: '1px solid rgba(160,140,110,0.22)',
          cursor: draggable ? 'move' : undefined,
          userSelect: draggable ? 'none' : undefined,
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
