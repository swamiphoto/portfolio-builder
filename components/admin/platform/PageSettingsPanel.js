// components/admin/platform/PageSettingsPanel.js
import { useState, useRef } from 'react'
import { generatePageId } from '../../../common/siteConfig'
import PageDesignPopover from './PageDesignPopover'

const DRAG_HANDLE = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
  </svg>
)

export default function PageSettingsPanel({ page, onChange, hasChildPages }) {
  const [expanded, setExpanded] = useState(true)
  const [designOpen, setDesignOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const brushRef = useRef(null)
  const dragIndex = useRef(null)

  function update(patch) {
    onChange({ ...page, ...patch })
  }

  function updateTitle(title) {
    const prevDerived = generatePageId(page.title || '')
    const slug = (page.slug && page.slug !== prevDerived) ? page.slug : generatePageId(title || '')
    update({ title, slug })
  }

  function updateCover(patch) {
    update({
      cover: {
        imageUrl: '',
        height: 'full',
        overlayText: '',
        variant: 'showcase',
        buttonStyle: 'solid',
        buttons: [],
        ...(page.cover || {}),
        ...patch,
      },
    })
  }

  function updateButton(i, patch) {
    const btns = [...(page.cover?.buttons || [])]
    btns[i] = { ...btns[i], ...patch }
    updateCover({ buttons: btns })
  }

  function removeButton(i) {
    const btns = (page.cover?.buttons || []).filter((_, idx) => idx !== i)
    updateCover({ buttons: btns })
  }

  function hasButtonType(type) {
    return (page.cover?.buttons || []).some(b => b.type === type)
  }

  function addButton(type) {
    const defaults = {
      url: { type: 'url', label: '', href: '', id: Date.now() },
      slideshow: { type: 'slideshow', label: 'Start Slideshow', href: '', id: Date.now() },
      'client-login': { type: 'client-login', label: 'Client Login', href: '#client-login', id: Date.now() },
    }
    const btns = [...(page.cover?.buttons || []), defaults[type]]
    updateCover({ buttons: btns })
    setPickerOpen(false)
  }

  function handleDragStart(i) { dragIndex.current = i }
  function handleDragOver(e) { e.preventDefault() }
  function handleDrop(i) {
    const from = dragIndex.current
    if (from === null || from === i) return
    const btns = [...(page.cover?.buttons || [])]
    const [moved] = btns.splice(from, 1)
    btns.splice(i, 0, moved)
    updateCover({ buttons: btns })
    dragIndex.current = null
  }

  const isLink = page.type === 'link'
  const buttons = page.cover?.buttons || []
  const canAddMore = buttons.length < 4

  const inputCls = 'w-full border-b border-stone-200 p-0 pb-0.5 text-xs text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent'

  // ── Link page ──────────────────────────────────────────────────────────────
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

  // ── Page: hero editor ──────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm mb-1.5">
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <span className="text-white text-sm leading-none select-none flex-shrink-0" aria-hidden>⠿</span>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs font-semibold text-stone-600 tracking-wide flex-1 text-left hover:text-stone-900 transition-colors"
        >
          {page.title || 'Page Hero'}
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

          {/* Buttons */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Buttons</div>

            {/* Informational Links row */}
            {hasChildPages && (
              <div className="flex items-center gap-2 py-1.5 border-b border-stone-100">
                <span className="w-3 flex-shrink-0" />
                <span className="flex-1 text-xs text-stone-400 italic">Links (auto)</span>
              </div>
            )}

            {/* Stored buttons */}
            {buttons.map((btn, i) => {
              const isLocked = btn.type === 'client-login' && !!page.clientFeatures?.enabled
              return (
                <div
                  key={btn.id ?? i}
                  draggable={!isLocked}
                  onDragStart={() => !isLocked && handleDragStart(i)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(i)}
                  className="flex items-start gap-2 py-1.5 border-b border-stone-100 last:border-b-0"
                >
                  <div className={`mt-1 flex-shrink-0 text-stone-300 ${isLocked ? 'opacity-0 pointer-events-none' : 'cursor-grab'}`}>
                    {DRAG_HANDLE}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      className={inputCls}
                      placeholder={
                        btn.type === 'slideshow' ? 'Start Slideshow'
                        : btn.type === 'client-login' ? 'Client Login'
                        : 'Button label'
                      }
                      value={btn.label}
                      readOnly={isLocked}
                      onChange={(e) => !isLocked && updateButton(i, { label: e.target.value })}
                    />
                    {btn.type === 'url' && (
                      <input
                        className={inputCls}
                        placeholder="URL or #anchor"
                        value={btn.href}
                        onChange={(e) => updateButton(i, { href: e.target.value })}
                      />
                    )}
                    {btn.type !== 'url' && (
                      <div className="text-[10px] text-stone-400">
                        {btn.type === 'slideshow' ? 'Slideshow link' : 'Client login'}
                      </div>
                    )}
                  </div>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => removeButton(i)}
                      className="mt-0.5 flex-shrink-0 text-stone-300 hover:text-red-400 transition-colors text-base leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}

            {/* Add button + picker */}
            {canAddMore && (
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(v => !v)}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                >
                  + Add button
                </button>
                {pickerOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-stone-200 shadow-sm rounded-md py-1 z-10 min-w-[140px]">
                    <button
                      type="button"
                      onClick={() => addButton('url')}
                      className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                    >
                      Custom URL
                    </button>
                    {page.slideshow?.enabled && !hasButtonType('slideshow') && (
                      <button
                        type="button"
                        onClick={() => addButton('slideshow')}
                        className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                      >
                        Slideshow
                      </button>
                    )}
                    {page.clientFeatures?.enabled && !hasButtonType('client-login') && (
                      <button
                        type="button"
                        onClick={() => addButton('client-login')}
                        className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                      >
                        Client Login
                      </button>
                    )}
                  </div>
                )}
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
        />
      )}
    </div>
  )
}
