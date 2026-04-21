// components/admin/platform/PageDesignPopover.js
import { useRef, useEffect, useState } from 'react'

export default function PageDesignPopover({ page, onUpdate, onClose, anchorEl }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const cover = page.cover || { height: 'full' }

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const top = Math.max(8, rect.bottom + 4)
    const maxHeight = window.innerHeight - top - 8
    setPos({ left: rect.left, top, maxHeight })
  }, [anchorEl])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorEl && !anchorEl.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorEl])

  function update(patch) {
    onUpdate({ ...page, cover: { ...cover, ...patch } })
  }

  return (
    <div
      ref={ref}
      className="fixed bg-white border border-stone-200 shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-[9999]"
      style={{ width: 220, overflow: 'auto', maxHeight: pos?.maxHeight ?? '80vh', left: pos?.left, top: pos?.top }}
    >
      <div className="px-3 pt-2.5 pb-2 border-b border-stone-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-700 tracking-wide">Page Design</span>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-base leading-none">×</button>
      </div>

      <div className="px-3 py-3 space-y-4">
        {/* Height */}
        <div>
          <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Cover height</div>
          <div className="flex gap-1.5">
            {['full', 'partial'].map(h => (
              <button
                key={h}
                onClick={() => update({ height: h })}
                className={`text-xs px-2.5 py-1 border transition-colors ${
                  cover.height === h ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-400'
                }`}
              >
                {h === 'full' ? 'Full' : 'Partial'}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
