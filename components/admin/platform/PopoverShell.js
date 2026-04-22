import { useRef, useEffect, useState } from 'react'

export default function PopoverShell({ anchorEl, onClose, width = 320, title, children, headerRight }) {
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
      className="fixed bg-white border border-stone-200 shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-[9999] overflow-auto"
      style={{
        width,
        maxHeight: pos?.maxHeight ?? '80vh',
        left: pos?.left,
        top: pos?.top,
        visibility: pos ? undefined : 'hidden',
      }}
    >
      {title ? (
        <div className="px-3 pt-2.5 pb-2 flex items-center justify-between sticky top-0 bg-white z-10">
          <span className="text-xs font-semibold text-stone-700 tracking-wide">{title}</span>
          <div className="flex items-center gap-1.5 ml-2">
            {headerRight}
            <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-base leading-none">×</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end px-2 pt-1.5 sticky top-0 bg-white z-10">
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-base leading-none">×</button>
        </div>
      )}
      {children}
    </div>
  )
}
