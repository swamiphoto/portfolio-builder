// components/admin/platform/PageSettingsPanel.js
import { useState, useRef } from 'react'
import { getSizedUrl } from '../../../common/imageUtils'
import { generatePageId } from '../../../common/siteConfig'
import { randomMusicUrl } from '../../../common/slideshowSync'
import PageDesignPopover from './PageDesignPopover'
import SlideshowConfigPopover from './SlideshowConfigPopover'

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

export default function PageSettingsPanel({ page, onChange, onPickThumbnail, onPickCoverImage, username, assetsByUrl, settingsGearRef, onSettingsOpen }) {
  const [expanded, setExpanded] = useState(true)
  const [designOpen, setDesignOpen] = useState(false)
  const [slideshowConfigOpen, setSlideshowConfigOpen] = useState(false)
  const brushRef = useRef(null)
  const slideshowGearRef = useRef(null)

  function update(patch) {
    onChange({ ...page, ...patch })
  }

  function updateTitle(title) {
    const prevDerived = generatePageId(page.title || '')
    const slug = (page.slug && page.slug !== prevDerived) ? page.slug : generatePageId(title || '')
    update({ title, slug })
  }

  function updateSlideshow(patch) {
    update({ slideshow: { ...(page.slideshow || {}), ...patch } })
  }

  function handleEnableSlideshow(enabled) {
    if (enabled && !page.slideshow?.enabled) {
      const slideshow = { ...(page.slideshow || {}), enabled: true, excluded: page.slideshow?.excluded || [] }
      if (!slideshow.musicUrl) slideshow.musicUrl = randomMusicUrl()
      update({ slideshow })
    } else {
      updateSlideshow({ enabled })
    }
  }

  const isLink = page.type === 'link'
  const coverImageUrl = page.cover?.imageUrl || ''

  // ── Link page: minimal editor ──────────────────────────────────────────────
  if (isLink) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg shadow-sm mb-1.5">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-stone-50"
        >
          <span className="text-xs font-semibold text-stone-600 flex-1 text-left tracking-wide">Link Settings</span>
          <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {expanded && (
          <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-4">
            <div>
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Label</div>
              <input
                className="w-full border-b border-stone-200 p-0 pb-1 text-sm font-medium text-stone-800 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                placeholder="Link label"
                value={page.title || ''}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            <div>
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">URL</div>
              <input
                type="url"
                autoFocus={!page.url}
                className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                placeholder="https://…"
                value={page.url || ''}
                onChange={(e) => update({ url: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Page: full editor ──────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm mb-1.5">
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        {/* Invisible ⠿ placeholder to match BlockCard title alignment */}
        <span className="text-white text-sm leading-none select-none flex-shrink-0" aria-hidden>⠿</span>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs font-semibold text-stone-600 tracking-wide flex-1 text-left hover:text-stone-900 transition-colors"
        >
          {page.title || 'Page Settings'}
        </button>

        <button
          ref={brushRef}
          onClick={() => setDesignOpen(v => !v)}
          title="Page design"
          className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        </button>

        <button
          ref={settingsGearRef}
          onClick={onSettingsOpen}
          title="Page settings"
          className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-stone-300 hover:text-stone-500 transition-colors flex-shrink-0"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
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

          {/* Image */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Image</div>
            <div className="flex items-center gap-3 pt-1">
              <div
                onClick={onPickCoverImage}
                className={`w-12 h-12 overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 cursor-pointer hover:border-stone-400 transition-colors ${coverImageUrl ? '' : 'bg-stone-50'}`}
              >
                {coverImageUrl ? (
                  <img src={getSizedUrl(coverImageUrl, 'thumbnail')} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-stone-300">+</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={onPickCoverImage} className="text-xs text-stone-500 hover:text-stone-900 text-left">
                  {coverImageUrl ? 'Change…' : 'Select from library'}
                </button>
                {coverImageUrl && (
                  <button
                    onClick={() => update({ cover: null })}
                    className="text-xs text-stone-400 hover:text-red-600 text-left"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Slideshow */}
          <div className="border-t border-stone-100 pt-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Toggle
                  checked={page.slideshow?.enabled || false}
                  onChange={handleEnableSlideshow}
                  label="Enable slideshow"
                />
              </div>
              {page.slideshow?.enabled && (
                <button
                  ref={slideshowGearRef}
                  onClick={() => setSlideshowConfigOpen(true)}
                  title="Configure slideshow"
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {designOpen && (
        <PageDesignPopover
          page={page}
          onUpdate={onChange}
          onClose={() => setDesignOpen(false)}
          anchorEl={brushRef.current}
        />
      )}

      {slideshowConfigOpen && (
        <SlideshowConfigPopover
          page={page}
          anchorEl={slideshowGearRef.current}
          assetsByUrl={assetsByUrl}
          onSlideshowChange={(slideshow) => update({ slideshow })}
          onClose={() => setSlideshowConfigOpen(false)}
        />
      )}

    </div>
  )
}
