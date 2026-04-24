// components/admin/platform/PageDesignPopover.js
import { useRef, useEffect, useState } from 'react'

const overlineCls = 'text-[10px] font-mono font-medium text-ink-4 uppercase tracking-[0.14em]'
const pillCls = 'text-[10px] font-mono uppercase tracking-[0.12em] px-2.5 py-1 border transition-colors'

export default function PageDesignPopover({ page, onUpdate, onClose, anchorEl }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const cover = page.cover || { imageUrl: '', height: 'full', overlayText: '', variant: 'showcase', buttonStyle: 'solid' }

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
      className="fixed bg-paper border border-rule z-[9999]"
      style={{ width: 220, overflow: 'auto', maxHeight: pos?.maxHeight ?? '80vh', left: pos?.left, top: pos?.top, boxShadow: 'var(--pane-shadow-lift)' }}
    >
      <div className="px-3 pt-2.5 pb-2 border-b border-rule flex items-center justify-between">
        <span className={overlineCls}>Page Design</span>
        <button onClick={onClose} className="text-ink-4 hover:text-ink-2 text-base leading-none transition-colors">×</button>
      </div>

      <div className="px-3 py-3 space-y-4">
        {/* Height */}
        <div>
          <div className={`${overlineCls} mb-2`}>Cover height</div>
          <div className="flex gap-1.5">
            {['full', 'partial'].map(h => (
              <button
                key={h}
                onClick={() => update({ height: h })}
                className={`${pillCls} ${
                  cover.height === h ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-3 hover:border-ink-4'
                }`}
              >
                {h === 'full' ? 'Full' : 'Partial'}
              </button>
            ))}
          </div>
        </div>

        {/* Button style */}
        {(page.slideshow?.enabled || page.clientFeatures?.enabled) && (
          <div>
            <div className={`${overlineCls} mb-2`}>Button style</div>
            <div className="flex gap-1.5">
              {['solid', 'outline', 'ghost'].map(s => (
                <button
                  key={s}
                  onClick={() => update({ buttonStyle: s })}
                  className={`${pillCls} ${
                    (cover.buttonStyle || 'solid') === s
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule text-ink-3 hover:border-ink-4'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
