// components/admin/platform/PageDesignPopover.js
import { useRef, useEffect, useState } from 'react'
import { getSizedUrl } from '../../../common/imageUtils'

export default function PageDesignPopover({ page, onUpdate, onClose, anchorEl, onPickCoverImage }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const cover = page.cover || { imageUrl: '', height: 'full', overlayText: '' }

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const popoverHeight = 320
    const spaceBelow = window.innerHeight - rect.bottom
    if (spaceBelow < popoverHeight) {
      setPos({ left: rect.left, bottom: window.innerHeight - rect.top + 4, top: 'auto' })
    } else {
      setPos({ left: rect.left, top: rect.bottom + 4 })
    }
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

  function clearCover() {
    onUpdate({ ...page, cover: null })
  }

  return (
    <div
      ref={ref}
      className="fixed bg-white border border-stone-200 shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-[9999]"
      style={{ width: 260, ...(pos || {}) }}
    >
      <div className="px-3 pt-2.5 pb-2 border-b border-stone-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-700 tracking-wide">Page Design</span>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-base leading-none">×</button>
      </div>

      <div className="px-3 py-3 space-y-4">
        {/* Cover image */}
        <div>
          <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Cover image</div>
          <div className="flex items-center gap-3">
            <div
              onClick={onPickCoverImage}
              className={`w-16 h-16 overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 cursor-pointer hover:border-stone-400 transition-colors ${cover.imageUrl ? '' : 'bg-stone-50'}`}
            >
              {cover.imageUrl ? (
                <img src={getSizedUrl(cover.imageUrl, 'thumbnail')} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-stone-300">+</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={onPickCoverImage} className="text-xs text-stone-700 hover:text-stone-900 text-left">
                {cover.imageUrl ? 'Change…' : 'Select from library'}
              </button>
              {cover.imageUrl && (
                <button onClick={clearCover} className="text-xs text-stone-400 hover:text-red-600 text-left">Remove cover</button>
              )}
            </div>
          </div>
        </div>

        {/* Height */}
        <div>
          <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Height</div>
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

        {/* Overlay text */}
        <div>
          <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Overlay text</div>
          <input
            className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
            placeholder={page.title || 'Use page title'}
            value={cover.overlayText}
            onChange={(e) => update({ overlayText: e.target.value })}
          />
          <div className="text-[10px] text-stone-400 mt-1">Leave blank to use the page title.</div>
        </div>
      </div>
    </div>
  )
}
