// components/admin/platform/PageSettingsPanel.js
import { useState, useRef } from 'react'
import { getSizedUrl } from '../../../common/imageUtils'
import { generatePageId } from '../../../common/siteConfig'
import PageDesignPopover from './PageDesignPopover'

const SLIDESHOW_LAYOUTS = [
  { value: 'kenburns', label: 'Ken Burns' },
  { value: 'film-stack', label: 'Film Stack' },
  { value: 'film-single', label: 'Film Single' },
]

function Toggle({ checked, onChange, disabled, label, hint }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-start gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 mt-0.5 ${checked ? 'bg-stone-700' : 'bg-stone-300'}`}>
        <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
      </div>
      <div>
        <div className="text-xs text-stone-700 select-none leading-tight">{label}</div>
        {hint && <div className="text-[10px] text-stone-400 select-none leading-tight">{hint}</div>}
      </div>
    </div>
  )
}

export default function PageSettingsPanel({ page, onChange, onPickThumbnail, onPickCoverImage }) {
  const [expanded, setExpanded] = useState(true)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [designOpen, setDesignOpen] = useState(false)
  const brushRef = useRef(null)

  function update(patch) {
    onChange({ ...page, ...patch })
  }

  function updateTitle(title) {
    // Auto-regenerate slug only if user hasn't customized it (slug equals previous derived slug).
    const prevDerived = generatePageId(page.title || '')
    const slug = (page.slug && page.slug !== prevDerived) ? page.slug : generatePageId(title || '')
    update({ title, slug })
  }

  function updateSlideshow(patch) {
    update({ slideshow: { ...(page.slideshow || {}), ...patch } })
  }

  const cover = page.cover || null
  const thumbnail = page.thumbnail || { imageUrl: '', useCover: true }
  const effectiveThumbnailUrl = thumbnail.useCover ? (cover?.imageUrl || '') : (thumbnail.imageUrl || '')

  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden mb-1.5">
      <div className="w-full flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 flex-1 text-left hover:bg-stone-50 -mx-3 -my-2.5 px-3 py-2.5"
        >
          <span className="text-xs font-semibold text-stone-600 flex-1 tracking-wide">Page Settings</span>
          <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          ref={brushRef}
          onClick={() => setDesignOpen(v => !v)}
          title="Page design"
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-stone-100 text-stone-500"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-4">
          {/* Title */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Title</div>
            <input
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm font-medium text-stone-800 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Page title"
              value={page.title || ''}
              onChange={(e) => updateTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Description</div>
            <textarea
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-600 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Optional"
              rows={2}
              value={page.description || ''}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>

          {/* Thumbnail */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Thumbnail</div>
            <div className="flex items-center gap-3 pt-0.5">
              <div
                onClick={() => !thumbnail.useCover && onPickThumbnail()}
                className={`w-12 h-12 overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 ${thumbnail.useCover ? 'opacity-60' : 'cursor-pointer hover:border-stone-400'} ${effectiveThumbnailUrl ? '' : 'bg-stone-50'}`}
              >
                {effectiveThumbnailUrl ? (
                  <img src={getSizedUrl(effectiveThumbnailUrl, 'thumbnail')} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-stone-300">—</span>
                )}
              </div>
              <div className="flex-1">
                <Toggle
                  checked={thumbnail.useCover}
                  onChange={(v) => update({ thumbnail: { ...thumbnail, useCover: v, ...(v ? { imageUrl: '' } : {}) } })}
                  label="Use cover image"
                />
                {!thumbnail.useCover && (
                  <button onClick={onPickThumbnail} className="text-xs text-stone-500 hover:text-stone-900 mt-1">Select…</button>
                )}
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Password</div>
            <input
              type="text"
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Optional"
              value={page.password || ''}
              onChange={(e) => update({ password: e.target.value })}
            />
          </div>

          {/* Slideshow */}
          <div className="border-t border-stone-100 pt-3 space-y-2">
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Slideshow</div>
            <Toggle
              checked={page.slideshow?.enabled || false}
              onChange={(v) => updateSlideshow({ enabled: v })}
              label="Enable slideshow"
            />
            {page.slideshow?.enabled && (
              <>
                <div>
                  <div className="text-[10px] text-stone-400 mb-1">Layout</div>
                  <select
                    className="w-full border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-stone-500 bg-white"
                    value={page.slideshow?.layout || 'kenburns'}
                    onChange={(e) => updateSlideshow({ layout: e.target.value })}
                  >
                    {SLIDESHOW_LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] text-stone-400 mb-1">Music URL (YouTube)</div>
                  <input
                    type="text"
                    className="w-full border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-stone-500"
                    placeholder="https://youtube.com/…"
                    value={page.slideshow?.musicUrl || ''}
                    onChange={(e) => updateSlideshow({ musicUrl: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          {/* Client features (disabled) */}
          <div className="border-t border-stone-100 pt-3">
            <Toggle checked={false} disabled label="Client features" hint="Coming soon" />
          </div>

          {/* Advanced */}
          <div className="border-t border-stone-100 pt-2">
            <button onClick={() => setAdvancedOpen(v => !v)} className="text-[10px] font-medium text-stone-400 uppercase tracking-wider hover:text-stone-700">
              {advancedOpen ? '▼' : '▶'} Advanced
            </button>
            {advancedOpen && (
              <div className="mt-2">
                <div className="text-[10px] text-stone-400 mb-1">Slug</div>
                <input
                  className="w-full border-b border-stone-200 p-0 pb-1 text-xs font-mono text-stone-500 outline-none focus:border-stone-500 bg-transparent"
                  value={page.slug || ''}
                  onChange={(e) => update({ slug: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {designOpen && (
        <PageDesignPopover
          page={page}
          onUpdate={onChange}
          onClose={() => setDesignOpen(false)}
          anchorEl={brushRef.current}
          onPickCoverImage={onPickCoverImage}
        />
      )}
    </div>
  )
}
