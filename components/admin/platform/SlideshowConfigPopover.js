import { useState, useEffect, useRef } from 'react'
import { buildPreviewSequence, MUSIC_POOL, musicIdToUrl, musicUrlToId } from '../../../common/slideshowSync'
import { resolveCaption } from '../../../common/captionResolver'

const SLIDESHOW_LAYOUTS = [
  { value: 'kenburns', label: 'Ken Burns' },
  { value: 'film-stack', label: 'Film Stack' },
  { value: 'film-single', label: 'Film Single' },
]

export default function SlideshowConfigPopover({ page, anchorEl, assetsByUrl, onSlideshowChange, onClose }) {
  const slideshow = page.slideshow || {}
  const [excluded, setExcluded] = useState(slideshow.excluded || [])
  const [pos, setPos] = useState(null)
  const currentId = musicUrlToId(slideshow.musicUrl || '')
  const isPoolTrack = MUSIC_POOL.some(t => t.id === currentId)
  const [musicMode, setMusicMode] = useState(isPoolTrack || !slideshow.musicUrl ? 'pool' : 'custom')
  const [customUrl, setCustomUrl] = useState(!isPoolTrack ? (slideshow.musicUrl || '') : '')
  const ref = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const rawSequence = buildPreviewSequence(page.blocks || [], excluded)
  const sequence = rawSequence.map(item =>
    item.type === 'image'
      ? { ...item, caption: resolveCaption({ url: item.url, caption: item.caption }, assetsByUrl || {}) }
      : item
  )

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const ESTIMATE = 480
    const iconCenter = rect.top + rect.height / 2
    const idealTop = iconCenter - ESTIMATE / 2
    const top = Math.max(8, Math.min(idealTop, window.innerHeight - ESTIMATE - 8))
    const maxHeight = window.innerHeight - top - 8
    setPos({ left: rect.right + 8, top, maxHeight })
  }, [anchorEl])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target) && anchorEl && !anchorEl.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorEl])

  function updateSetting(patch) {
    onSlideshowChange({ ...slideshow, ...patch, excluded })
  }

  function toggleExcluded(url) {
    const next = excluded.includes(url)
      ? excluded.filter(u => u !== url)
      : [...excluded, url]
    setExcluded(next)
    onSlideshowChange({ ...slideshow, excluded: next })
  }

  const includedCount = sequence.filter(s => s.type === 'image' && !s.excluded).length
  const textCount = sequence.filter(s => s.type === 'text').length

  return (
    <div
      ref={ref}
      className="fixed bg-paper border border-rule z-[9999] flex flex-col"
      style={{ width: 300, maxHeight: pos?.maxHeight ?? '80vh', left: pos?.left, top: pos?.top, boxShadow: 'var(--pane-shadow-lift)' }}
    >
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 border-b border-rule flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] font-mono font-medium text-ink-4 uppercase tracking-[0.14em]">Slideshow</span>
        <button onClick={onClose} className="text-ink-4 hover:text-ink-2 text-base leading-none transition-colors">×</button>
      </div>

      <div className="overflow-y-auto flex-1">
        {/* Settings */}
        <div className="px-3 py-3 space-y-2 border-b border-rule">
          <div>
            <div className="text-[10px] font-mono font-medium text-ink-4 uppercase tracking-[0.14em] mb-1">Layout</div>
            <select
              className="w-full border border-rule rounded px-2 py-1 text-xs text-ink-2 outline-none focus:border-ink-3 bg-paper"
              value={slideshow.layout || 'kenburns'}
              onChange={(e) => updateSetting({ layout: e.target.value })}
            >
              {SLIDESHOW_LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] font-mono font-medium text-ink-4 uppercase tracking-[0.14em] mb-1">Music</div>
            <select
              className="w-full border border-rule rounded px-2 py-1 text-xs text-ink-2 outline-none focus:border-ink-3 bg-paper"
              value={musicMode === 'custom' ? '__custom__' : (currentId || '')}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setMusicMode('custom')
                } else {
                  setMusicMode('pool')
                  updateSetting({ musicUrl: musicIdToUrl(e.target.value) })
                }
              }}
            >
              <option value="" disabled>Select a track…</option>
              {MUSIC_POOL.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
              <option value="__custom__">Custom YouTube URL…</option>
            </select>
            {musicMode === 'custom' && (
              <input
                type="text"
                autoFocus
                className="w-full border border-rule rounded px-2 py-1 text-xs text-ink-2 outline-none focus:border-ink-3 bg-paper mt-1.5"
                placeholder="https://youtube.com/watch?v=…"
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value)
                  updateSetting({ musicUrl: e.target.value })
                }}
              />
            )}
          </div>
        </div>

        {/* Sequence */}
        <div className="px-3 pt-3 pb-3">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] font-mono font-medium text-ink-4 uppercase tracking-[0.14em]">
              Sequence
            </div>
            <div className="text-[10px] text-ink-4">
              {includedCount} image{includedCount !== 1 ? 's' : ''}{textCount > 0 ? ` · ${textCount} text` : ''}
            </div>
          </div>

          {sequence.length === 0 ? (
            <div className="h-16 flex items-center justify-center text-[10px] text-ink-4 border border-dashed border-rule-2 rounded">
              Add blocks to the gallery to populate the slideshow
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {sequence.map((item, i) => {
                if (item.type === 'text') {
                  return (
                    <div
                      key={`text-${i}`}
                      onMouseEnter={(e) => {
                        if (!item.content) return
                        const r = e.currentTarget.getBoundingClientRect()
                        setTooltip({ text: item.content, x: r.left + r.width / 2, y: r.top })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      className="w-11 h-11 bg-paper-2 border border-rule rounded flex items-center justify-center cursor-default flex-shrink-0"
                    >
                      <svg className="w-4 h-4 text-ink-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                      </svg>
                    </div>
                  )
                }
                return (
                  <button
                    key={`img-${item.url}-${i}`}
                    onClick={() => toggleExcluded(item.url)}
                    onMouseEnter={(e) => {
                      if (!item.caption) return
                      const r = e.currentTarget.getBoundingClientRect()
                      setTooltip({ text: item.caption, x: r.left + r.width / 2, y: r.top })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    className={`relative group w-11 h-11 overflow-hidden rounded border flex-shrink-0 transition-all ${
                      item.excluded ? 'opacity-25 border-rule' : 'opacity-100 border-rule-2'
                    }`}
                  >
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity pointer-events-none">
                      {item.excluded ? (
                        <svg className="w-3.5 h-3.5 text-paper" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-paper" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-[10000] px-2 py-1 bg-ink text-paper text-[10px] rounded pointer-events-none max-w-[200px] leading-snug"
          style={{ left: tooltip.x, top: tooltip.y - 6, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
