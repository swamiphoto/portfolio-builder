import { useState } from 'react'
import { slugify } from '../../../common/pageUtils'
import { getPagePhotos } from '../../../common/assetRefs'
import { getSizedUrl } from '../../../common/imageUtils'
import { buildPreviewSequence, MUSIC_POOL, musicIdToUrl, musicUrlToId, randomMusicUrl } from '../../../common/slideshowSync'
import { resolveCaption } from '../../../common/captionResolver'
import PopoverShell from './PopoverShell'

function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-start gap-2 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 mt-0.5 ${checked ? 'bg-stone-700' : 'bg-stone-300'}`}>
        <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
      </div>
      <div>
        <div className="text-xs text-stone-700 select-none leading-tight">{label}</div>
        {hint && <div className="text-[10px] text-stone-400 select-none leading-tight mt-0.5">{hint}</div>}
      </div>
    </div>
  )
}

function FeatureBlock({ label, checked, onToggle, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-700">{label}</span>
        <button
          type="button"
          onClick={() => onToggle(!checked)}
          className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-stone-700' : 'bg-stone-300'}`}
        >
          <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
        </button>
      </div>
      {checked && children && (
        <div className="pl-3 space-y-2 border-l border-stone-100">{children}</div>
      )}
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="px-3 py-3 border-b border-stone-100 last:border-b-0">
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2.5">{label}</div>
      {children}
    </div>
  )
}

function ChevronRight() {
  return (
    <svg className="w-3.5 h-3.5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function DrillHeader({ label, onBack }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100">
      <button
        type="button"
        onClick={onBack}
        className="text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-xs font-medium text-stone-700">{label}</span>
    </div>
  )
}

function ToggleRow({ checked, onToggle, label, actionLabel, onDrillIn, disabled, hint }) {
  return (
    <div className="px-3 py-2.5 flex items-center border-b border-stone-100 last:border-b-0">
      <button
        type="button"
        onClick={() => !disabled && onToggle(!checked)}
        className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-stone-700' : 'bg-stone-300'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
      </button>
      <div className="flex-1 ml-2 min-w-0">
        <div className="text-xs text-stone-700 select-none leading-tight">{label}</div>
        {hint && <div className="text-[10px] text-stone-400 select-none leading-tight mt-0.5">{hint}</div>}
      </div>
      {checked && actionLabel && onDrillIn && (
        <button
          type="button"
          onClick={onDrillIn}
          className="flex items-center gap-0.5 text-xs text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0 ml-2"
        >
          {actionLabel}
          <ChevronRight />
        </button>
      )}
    </div>
  )
}

export default function PageSettingsPopover({ page, anchorEl, onUpdate, onClose, username, onPickThumbnail, assetsByUrl, siteConfig }) {
  const pagePhotos = getPagePhotos(page)
  const autoSlug = slugify(page.title || '')
  const displaySlug = page.slug || autoSlug
  const [slugDraft, setSlugDraft] = useState(null)
  const displayValue = slugDraft !== null ? slugDraft : displaySlug
  const [view, setView] = useState('main') // 'main' | 'slideshow' | 'client' | 'password' | 'sharing'

  // Slideshow local state
  const slideshow = page.slideshow || {}
  const [excluded, setExcluded] = useState(slideshow.excluded || [])
  const currentMusicId = musicUrlToId(slideshow.musicUrl || '')
  const isPoolTrack = MUSIC_POOL.some(t => t.id === currentMusicId)
  const [musicMode, setMusicMode] = useState(isPoolTrack || !slideshow.musicUrl ? 'pool' : 'custom')
  const [customMusicUrl, setCustomMusicUrl] = useState(!isPoolTrack ? (slideshow.musicUrl || '') : '')
  const [tooltip, setTooltip] = useState(null)

  function update(patch) {
    onUpdate({ ...page, ...patch })
  }

  function updateCf(key, patch) {
    const cf = page.clientFeatures || {}
    update({ clientFeatures: { ...cf, [key]: { ...(cf[key] || {}), ...patch } } })
  }

  function updateSlideshow(patch) {
    update({ slideshow: { ...slideshow, ...patch } })
  }

  function handleEnableSlideshow(enabled) {
    if (enabled && !slideshow.enabled) {
      const next = { ...slideshow, enabled: true, excluded: slideshow.excluded || [] }
      if (!next.musicUrl) next.musicUrl = randomMusicUrl()
      update({ slideshow: next })
    } else {
      updateSlideshow({ enabled })
    }
  }

  function toggleExcluded(url) {
    const next = excluded.includes(url) ? excluded.filter(u => u !== url) : [...excluded, url]
    setExcluded(next)
    updateSlideshow({ excluded: next })
  }


  const currentThumbUrl = page.thumbnail?.imageUrl || pagePhotos[0] || null
  const cf = page.clientFeatures || {}
  const canSlideshow = pagePhotos.length >= 6

  // Slideshow sequence (used in drill-in view)
  const rawSequence = buildPreviewSequence(page.blocks || [], excluded)
  const sequence = rawSequence.map(item =>
    item.type === 'image'
      ? { ...item, caption: resolveCaption({ url: item.url, caption: item.caption }, assetsByUrl || {}) }
      : item
  )
  const includedCount = sequence.filter(s => s.type === 'image' && !s.excluded).length
  const textCount = sequence.filter(s => s.type === 'text').length

  // ── Sharing drill-in ─────────────────────────────────────────────────────
  if (view === 'sharing') {
    const cardImage = currentThumbUrl || siteConfig?.share?.largeImage || siteConfig?.cover?.imageUrl || ''
    const cardTitle = page.title || siteConfig?.siteName || 'Page title'
    const cardDesc = page.description || siteConfig?.tagline || ''
    const rootDomainRaw = (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) || 'localhost:3000'
    const domain = siteConfig?.customDomain || `${username}.${rootDomainRaw.replace(/:\d+$/, '')}`
    const pageUrl = `${domain}/${page.slug || page.id || ''}`
    const isPassworded = !!page.password

    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`}>
        <DrillHeader label="Sharing" onBack={() => setView('main')} />
        <div className="px-3 py-3 space-y-3">
          <div className="space-y-2">
            <div>
              <div className="text-[10px] text-stone-400 mb-1">Title</div>
              <input
                className="w-full border-b border-stone-200 p-0 pb-1 text-xs text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                placeholder={siteConfig?.siteName || 'Page title'}
                value={page.title || ''}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            <div>
              <div className="text-[10px] text-stone-400 mb-1">Description</div>
              <textarea
                className="w-full border-b border-stone-200 p-0 pb-1 text-xs text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent resize-none"
                placeholder={siteConfig?.tagline || 'Add a description…'}
                rows={2}
                value={page.description || ''}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
          </div>

          {/* Large card */}
          <div>
            <div className="text-[10px] text-stone-400 mb-1.5">Social card</div>
            <div
              className="group relative w-full cursor-pointer overflow-hidden border border-stone-200"
              style={{ paddingBottom: '52.5%' }}
              onClick={onPickThumbnail}
            >
              <div className="absolute inset-0 bg-stone-100">
                {cardImage ? (
                  <img src={getSizedUrl(cardImage, 'thumbnail')} className="w-full h-full object-cover" alt="" onError={(e) => { e.currentTarget.src = cardImage }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-stone-300 text-2xl">+</span>
                  </div>
                )}
                {onPickThumbnail && (
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs">{cardImage ? 'Change image' : 'Add image'}</span>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-2 py-1.5">
                <div className="text-xs font-medium text-stone-800 truncate">{cardTitle}</div>
                {cardDesc && <div className="text-[10px] text-stone-500 truncate mt-0.5">{cardDesc}</div>}
                <div className="text-[10px] text-stone-400 truncate mt-0.5">{pageUrl}</div>
              </div>
            </div>
            {page.thumbnail?.imageUrl && (
              <button type="button" onClick={() => update({ thumbnail: null })} className="text-[10px] text-stone-400 hover:text-red-600 mt-1">Reset to auto</button>
            )}
          </div>

          {/* Compact card */}
          <div>
            <div className="text-[10px] text-stone-400 mb-1.5">Compact card</div>
            <div
              className="group flex border border-stone-200 cursor-pointer overflow-hidden"
              onClick={onPickThumbnail}
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-stone-100 overflow-hidden">
                {cardImage ? (
                  <img src={getSizedUrl(cardImage, 'thumbnail')} className="w-full h-full object-cover" alt="" onError={(e) => { e.currentTarget.src = cardImage }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-stone-300 text-xl">+</span>
                  </div>
                )}
                {onPickThumbnail && (
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[10px]">{cardImage ? '↺' : '+'}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 px-2 py-1.5 flex flex-col justify-center border-l border-stone-200">
                <div className="text-xs font-medium text-stone-800 truncate">{cardTitle}</div>
                {cardDesc && <div className="text-[10px] text-stone-500 truncate mt-0.5">{cardDesc}</div>}
                <div className="text-[10px] text-stone-400 truncate mt-0.5">{pageUrl}</div>
              </div>
            </div>
          </div>

          {/* Search result */}
          <div>
            <div className="text-[10px] text-stone-400 mb-1.5">Search result</div>
            <div className={`border border-stone-200 px-3 py-2.5 space-y-0.5 ${isPassworded ? 'opacity-50' : ''}`}>
              <div className="text-[10px] text-stone-400 truncate">{pageUrl}</div>
              <div className="text-xs text-blue-600 truncate">{cardTitle}</div>
              {cardDesc && <div className="text-[10px] text-stone-500 line-clamp-2">{cardDesc}</div>}
            </div>
            {isPassworded && (
              <div className="text-[10px] text-stone-400 mt-1">Not indexed — page is password protected</div>
            )}
          </div>
        </div>
      </PopoverShell>
    )
  }

  // ── Password drill-in ─────────────────────────────────────────────────────
  if (view === 'password') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`}>
        <DrillHeader label="Password" onBack={() => setView('main')} />
        <div className="px-3 py-3 space-y-2">
          <input
            type="text"
            autoFocus
            className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
            placeholder="Enter password"
            value={(page.password || '').trim()}
            onChange={(e) => update({ password: e.target.value })}
            autoComplete="off"
          />
          <textarea
            className="w-full border-b border-stone-200 p-0 pb-1 text-xs text-stone-600 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent resize-none"
            placeholder="Gate message (optional)"
            rows={2}
            value={page.passwordGateMessage || ''}
            onChange={(e) => update({ passwordGateMessage: e.target.value })}
          />
          <p className="text-[10px] text-stone-400">Not indexed by search engines.</p>
        </div>
      </PopoverShell>
    )
  }

// ── Slideshow drill-in ────────────────────────────────────────────────────
  if (view === 'slideshow') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`}>
        <DrillHeader label="Slideshow" onBack={() => setView('main')} />

        {slideshow.enabled && <>
          <div className="px-3 pt-3 space-y-3">
            <div>
              <div className="text-[10px] text-stone-400 mb-1">Theme</div>
              <select
                className="w-full border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-stone-500 bg-white"
                value={slideshow.layout || 'kenburns'}
                onChange={(e) => updateSlideshow({ layout: e.target.value })}
              >
                <option value="kenburns">Ken Burns</option>
                <option value="film-stack">Film Stack</option>
                <option value="film-single">Film Single</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] text-stone-400 mb-1">Music</div>
              <select
                className="w-full border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-stone-500 bg-white"
                value={musicMode === 'custom' ? '__custom__' : (currentMusicId || '')}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setMusicMode('custom')
                  } else {
                    setMusicMode('pool')
                    updateSlideshow({ musicUrl: musicIdToUrl(e.target.value) })
                  }
                }}
              >
                <option value="" disabled>Select a track…</option>
                {MUSIC_POOL.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                <option value="__custom__">Custom YouTube URL…</option>
              </select>
              {musicMode === 'custom' && (
                <input
                  type="text"
                  autoFocus
                  className="w-full border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-stone-500 mt-1.5"
                  placeholder="https://youtube.com/watch?v=…"
                  value={customMusicUrl}
                  onChange={(e) => { setCustomMusicUrl(e.target.value); updateSlideshow({ musicUrl: e.target.value }) }}
                />
              )}
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className="text-[10px] text-stone-400 mb-2">Sequence · {includedCount} image{includedCount !== 1 ? 's' : ''}{textCount > 0 ? ` · ${textCount} text` : ''}</div>
            {sequence.length === 0 ? (
              <div className="h-12 flex items-center justify-center text-[10px] text-stone-300 border border-dashed border-stone-200 rounded">
                Add blocks to populate the slideshow
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {sequence.map((item, i) => {
                  if (item.type === 'text') {
                    return (
                      <div
                        key={`text-${i}`}
                        onMouseEnter={(e) => { if (item.content) { const r = e.currentTarget.getBoundingClientRect(); setTooltip({ text: item.content, x: r.left + r.width / 2, y: r.top }) } }}
                        onMouseLeave={() => setTooltip(null)}
                        className="w-10 h-10 bg-stone-100 border border-stone-200 rounded flex items-center justify-center cursor-default flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                        </svg>
                      </div>
                    )
                  }
                  return (
                    <button
                      key={`img-${item.url}-${i}`}
                      onClick={() => toggleExcluded(item.url)}
                      onMouseEnter={(e) => { if (item.caption) { const r = e.currentTarget.getBoundingClientRect(); setTooltip({ text: item.caption, x: r.left + r.width / 2, y: r.top }) } }}
                      onMouseLeave={() => setTooltip(null)}
                      className={`relative group w-10 h-10 overflow-hidden rounded border flex-shrink-0 transition-all ${item.excluded ? 'opacity-25 border-stone-100' : 'opacity-100 border-stone-200'}`}
                    >
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity pointer-events-none">
                        {item.excluded ? (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
        </>}

        {tooltip && (
          <div
            className="fixed z-[10000] px-2 py-1 bg-stone-800 text-white text-[10px] rounded pointer-events-none max-w-[200px] leading-snug"
            style={{ left: tooltip.x, top: tooltip.y - 6, transform: 'translate(-50%, -100%)' }}
          >
            {tooltip.text}
          </div>
        )}
      </PopoverShell>
    )
  }

  // ── Client features drill-in ──────────────────────────────────────────────
  if (view === 'client') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`}>
        <DrillHeader label="Client Features" onBack={() => setView('main')} />
        <div className="px-3 py-3 space-y-3">
          <Toggle
            checked={cf.enabled || false}
            onChange={(v) => update({ clientFeatures: { ...cf, enabled: v } })}
            label="Enable client features"
          />
          {cf.enabled && <>
            <div>
              <div className="text-[10px] text-stone-400 mb-1">Client password</div>
              <input
                type="text"
                className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                placeholder="Required to access client content"
                value={cf.password || ''}
                onChange={(e) => update({ clientFeatures: { ...cf, password: e.target.value } })}
                autoComplete="off"
              />
            </div>
            <div className="space-y-3">
              <FeatureBlock
                label="Downloads"
                checked={cf.downloads?.enabled || false}
                onToggle={(v) => updateCf('downloads', { enabled: v })}
              >
                <div className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Quality</div>
                {['web', 'print', 'original'].map((q) => (
                  <label key={q} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(cf.downloads?.quality || ['web']).includes(q)}
                      onChange={(e) => {
                        const cur = cf.downloads?.quality || ['web']
                        const next = e.target.checked ? [...new Set([...cur, q])] : cur.filter(x => x !== q)
                        updateCf('downloads', { quality: next })
                      }}
                      className="rounded border-stone-300 text-stone-700 focus:ring-stone-500"
                    />
                    <span className="text-xs text-stone-600 capitalize">{q}</span>
                  </label>
                ))}
                <Toggle checked={cf.downloads?.requireEmail || false} onChange={(v) => updateCf('downloads', { requireEmail: v })} label="Require email to download" />
                <Toggle checked={cf.downloads?.watermarkEnabled || false} onChange={(v) => updateCf('downloads', { watermarkEnabled: v })} label="Watermark" />
              </FeatureBlock>

              <FeatureBlock
                label="Favorites"
                checked={cf.favorites?.enabled || false}
                onToggle={(v) => updateCf('favorites', { enabled: v })}
              >
                <Toggle checked={cf.favorites?.requireEmail || false} onChange={(v) => updateCf('favorites', { requireEmail: v })} label="Require email" />
                <Toggle checked={cf.favorites?.submitWorkflow || false} onChange={(v) => updateCf('favorites', { submitWorkflow: v })} label="Submit workflow" hint="Client clicks 'Submit selection' when done; you're notified" />
              </FeatureBlock>

              <FeatureBlock
                label="Comments"
                checked={cf.comments?.enabled || false}
                onToggle={(v) => updateCf('comments', { enabled: v })}
              >
                <Toggle checked={cf.comments?.requireEmail || false} onChange={(v) => updateCf('comments', { requireEmail: v })} label="Require email" />
              </FeatureBlock>

              <FeatureBlock
                label="Purchase"
                checked={cf.purchase?.enabled || false}
                onToggle={(v) => updateCf('purchase', { enabled: v })}
              >
                <div>
                  <div className="text-[10px] text-stone-400 mb-1">Default price per photo</div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-stone-400">{cf.purchase?.currency || 'USD'}</span>
                    <input
                      type="number" min="0" step="0.01"
                      className="flex-1 border-b border-stone-200 p-0 pb-1 text-xs text-stone-700 outline-none focus:border-stone-500 bg-transparent"
                      placeholder="0.00"
                      value={cf.purchase?.defaultPrice ?? ''}
                      onChange={(e) => updateCf('purchase', { defaultPrice: e.target.value === '' ? null : parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-400 mb-1">Currency</div>
                  <select
                    className="w-full text-xs text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
                    value={cf.purchase?.currency || 'USD'}
                    onChange={(e) => updateCf('purchase', { currency: e.target.value })}
                  >
                    {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <p className="text-[10px] text-stone-400">Override pricing per photo in the photo block inspector.</p>
              </FeatureBlock>
            </div>
          </>}
        </div>
      </PopoverShell>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`}>

      <Section label="URL">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-stone-400 flex-shrink-0 font-mono">{username}/</span>
          <input
            className="flex-1 border-b border-stone-200 p-0 pb-1 text-xs font-mono text-stone-700 outline-none focus:border-stone-500 bg-transparent min-w-0"
            value={displayValue}
            onChange={(e) => setSlugDraft(e.target.value)}
            onBlur={() => {
              const sanitized = slugify(slugDraft ?? displaySlug)
              setSlugDraft(null)
              update({ slug: sanitized })
            }}
            placeholder={autoSlug || 'page-url'}
            spellCheck={false}
          />
        </div>
      </Section>

      <Section label="Thumbnail">
        <div className="flex items-center gap-3">
          <div
            onClick={onPickThumbnail}
            className={`w-14 h-14 flex-shrink-0 overflow-hidden border border-stone-200 flex items-center justify-center bg-stone-50 ${onPickThumbnail ? 'cursor-pointer hover:border-stone-400 transition-colors' : ''}`}
          >
            {currentThumbUrl ? (
              <img
                src={getSizedUrl(currentThumbUrl, 'thumbnail')}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = currentThumbUrl }}
              />
            ) : (
              <span className="text-stone-300 text-lg">+</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {onPickThumbnail && (
              <button onClick={onPickThumbnail} className="text-xs text-stone-500 hover:text-stone-900 text-left">
                {currentThumbUrl ? 'Change…' : 'Select from library'}
              </button>
            )}
            {page.thumbnail?.imageUrl && (
              <button onClick={() => update({ thumbnail: null })} className="text-[10px] text-stone-400 hover:text-red-600 text-left">
                Reset to auto
              </button>
            )}
          </div>
        </div>
      </Section>

      <ToggleRow
        checked={!!page.password}
        onToggle={(v) => {
          if (!v) update({ password: '', passwordGateMessage: '' })
          else update({ password: ' ' })
        }}
        label="Password protect"
        actionLabel="Configure"
        onDrillIn={() => setView('password')}
      />

      <ToggleRow
        checked={slideshow.enabled || false}
        onToggle={handleEnableSlideshow}
        label="Enable slideshow"
        actionLabel="Customize"
        onDrillIn={() => setView('slideshow')}
        disabled={!canSlideshow && !slideshow.enabled}
        hint={!canSlideshow ? 'Requires 6+ photos' : undefined}
      />

      <ToggleRow
        checked={cf.enabled || false}
        onToggle={(v) => update({ clientFeatures: { ...cf, enabled: v } })}
        label="Enable client features"
        actionLabel="Configure"
        onDrillIn={() => setView('client')}
      />

      <button
        type="button"
        onClick={() => setView('sharing')}
        className="w-full px-3 py-2.5 flex items-center justify-between border-t border-stone-100 text-xs text-stone-700 hover:text-stone-900 transition-colors"
      >
        Sharing
        <ChevronRight />
      </button>

    </PopoverShell>
  )
}
