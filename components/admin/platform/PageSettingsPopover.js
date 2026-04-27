import { useState } from 'react'
import { slugify } from '../../../common/pageUtils'
import { getPagePhotos } from '../../../common/assetRefs'
import { getSizedUrl } from '../../../common/imageUtils'
import { buildPreviewSequence, MUSIC_POOL, musicIdToUrl, musicUrlToId, randomMusicUrl } from '../../../common/slideshowSync'
import { resolveCaption } from '../../../common/captionResolver'
import PopoverShell from './PopoverShell'

const BORDER = 'rgba(160,140,110,0.18)'
const INPUT = 'w-full border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug'

function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-start gap-2 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div
        className="w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 mt-0.5"
        style={{ background: checked ? 'var(--sepia-accent)' : 'var(--border)' }}
      >
        <div
          className={`absolute top-[2px] w-[10px] h-[10px] rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`}
          style={{ background: 'var(--card)' }}
        />
      </div>
      <div>
        <div className="text-xs select-none leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        {hint && <div className="text-[10px] select-none leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</div>}
      </div>
    </div>
  )
}

function FeatureBlock({ label, checked, onToggle, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <button
          type="button"
          onClick={() => onToggle(!checked)}
          className="w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0"
          style={{ background: checked ? 'var(--sepia-accent)' : 'var(--border)' }}
        >
          <div
            className={`absolute top-[2px] w-[10px] h-[10px] rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`}
            style={{ background: 'var(--card)' }}
          />
        </button>
      </div>
      {checked && children && (
        <div className="pl-3 space-y-2" style={{ borderLeft: `1px solid ${BORDER}` }}>{children}</div>
      )}
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="px-3 py-3 last:border-b-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
      {children}
    </div>
  )
}

function ToggleRow({ checked, onToggle, label, actionLabel, onDrillIn, disabled, hint }) {
  return (
    <div className="px-3 py-2.5 flex items-center" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button
        type="button"
        onClick={() => !disabled && onToggle(!checked)}
        className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        style={{ background: checked ? 'var(--sepia-accent)' : 'var(--border)' }}
      >
        <div
          className={`absolute top-[2px] w-[10px] h-[10px] rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`}
          style={{ background: 'var(--card)' }}
        />
      </button>
      <div className="flex-1 ml-2 min-w-0">
        <div className="text-xs select-none leading-tight" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        {hint && <div className="text-[10px] select-none leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</div>}
      </div>
      {checked && actionLabel && onDrillIn && (
        <button
          type="button"
          onClick={onDrillIn}
          className="flex items-center gap-0.5 text-xs transition-colors flex-shrink-0 ml-2"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          {actionLabel}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
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
  const [view, setView] = useState('main')

  const slideshow = page.slideshow || {}
  const [excluded, setExcluded] = useState(slideshow.excluded || [])
  const currentMusicId = musicUrlToId(slideshow.musicUrl || '')
  const isPoolTrack = MUSIC_POOL.some(t => t.id === currentMusicId)
  const [musicMode, setMusicMode] = useState(isPoolTrack || !slideshow.musicUrl ? 'pool' : 'custom')
  const [customMusicUrl, setCustomMusicUrl] = useState(!isPoolTrack ? (slideshow.musicUrl || '') : '')
  const [tooltip, setTooltip] = useState(null)

  function update(patch) { onUpdate({ ...page, ...patch }) }
  function updateCf(key, patch) {
    const cf = page.clientFeatures || {}
    update({ clientFeatures: { ...cf, [key]: { ...(cf[key] || {}), ...patch } } })
  }
  function updateSlideshow(patch) { update({ slideshow: { ...slideshow, ...patch } }) }
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

  const rawSequence = buildPreviewSequence(page.blocks || [], excluded)
  const sequence = rawSequence.map(item =>
    item.type === 'image'
      ? { ...item, caption: resolveCaption({ url: item.url, caption: item.caption }, assetsByUrl || {}) }
      : item
  )
  const includedCount = sequence.filter(s => s.type === 'image' && !s.excluded).length
  const textCount = sequence.filter(s => s.type === 'text').length

  const selectStyle = {
    border: `1px solid ${BORDER}`,
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 12,
    color: 'var(--text-secondary)',
    background: 'var(--card)',
    outline: 'none',
    width: '100%',
  }

  // ── Password drill-in ─────────────────────────────────────────────────────
  if (view === 'password') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title="Password" onBack={() => setView('main')}>
        <div className="px-3 py-3 space-y-3">
          <input
            type="text"
            autoFocus
            className={INPUT}
            placeholder="Enter password"
            value={(page.password || '').trim()}
            onChange={(e) => update({ password: e.target.value })}
            autoComplete="off"
          />
          <textarea
            className="w-full border-b border-[rgba(160,140,110,0.3)] py-1.5 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent resize-none leading-snug"
            placeholder="Gate message (optional)"
            rows={2}
            value={page.passwordGateMessage || ''}
            onChange={(e) => update({ passwordGateMessage: e.target.value })}
          />
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Not indexed by search engines.</p>
        </div>
      </PopoverShell>
    )
  }

  // ── Slideshow drill-in ────────────────────────────────────────────────────
  if (view === 'slideshow') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title="Slideshow" onBack={() => setView('main')}>
        {slideshow.enabled && <>
          <div className="px-3 pt-3 space-y-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Theme</div>
              <select
                style={selectStyle}
                value={slideshow.layout || 'kenburns'}
                onChange={(e) => updateSlideshow({ layout: e.target.value })}
              >
                <option value="kenburns">Ken Burns</option>
                <option value="film-stack">Film Stack</option>
                <option value="film-single">Film Single</option>
              </select>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Music</div>
              <select
                style={selectStyle}
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
                  className={INPUT + ' mt-1.5'}
                  placeholder="https://youtube.com/watch?v=…"
                  value={customMusicUrl}
                  onChange={(e) => { setCustomMusicUrl(e.target.value); updateSlideshow({ musicUrl: e.target.value }) }}
                />
              )}
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-2" style={{ color: 'var(--text-muted)' }}>
              Sequence · {includedCount} image{includedCount !== 1 ? 's' : ''}{textCount > 0 ? ` · ${textCount} text` : ''}
            </div>
            {sequence.length === 0 ? (
              <div
                className="h-12 flex items-center justify-center text-[10px] border border-dashed rounded"
                style={{ color: 'var(--text-muted)', borderColor: BORDER }}
              >
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
                        className="w-10 h-10 rounded flex items-center justify-center cursor-default flex-shrink-0"
                        style={{ background: 'var(--panel)', border: `1px solid ${BORDER}` }}
                      >
                        <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
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
                      className={`relative group w-10 h-10 overflow-hidden rounded flex-shrink-0 transition-all`}
                      style={{ opacity: item.excluded ? 0.25 : 1, border: `1px solid ${BORDER}` }}
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
            className="fixed z-[10000] px-2 py-1 text-white text-[10px] rounded pointer-events-none max-w-[200px] leading-snug"
            style={{ left: tooltip.x, top: tooltip.y - 6, transform: 'translate(-50%, -100%)', background: 'rgba(26,18,10,0.88)' }}
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
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title="Client Features" onBack={() => setView('main')}>
        <div className="px-3 py-3 space-y-3">
          <Toggle
            checked={cf.enabled || false}
            onChange={(v) => update({ clientFeatures: { ...cf, enabled: v } })}
            label="Enable client features"
          />
          {cf.enabled && <>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Client password</div>
              <input
                type="text"
                className={INPUT}
                placeholder="Required to access client content"
                value={cf.password || ''}
                onChange={(e) => update({ clientFeatures: { ...cf, password: e.target.value } })}
                autoComplete="off"
              />
            </div>
            <div className="space-y-3">
              <FeatureBlock label="Downloads" checked={cf.downloads?.enabled || false} onToggle={(v) => updateCf('downloads', { enabled: v })}>
                <div className="font-mono text-[10px] uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>Quality</div>
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
                      className="w-3 h-3"
                    />
                    <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{q}</span>
                  </label>
                ))}
                <Toggle checked={cf.downloads?.requireEmail || false} onChange={(v) => updateCf('downloads', { requireEmail: v })} label="Require email to download" />
                <Toggle checked={cf.downloads?.watermarkEnabled || false} onChange={(v) => updateCf('downloads', { watermarkEnabled: v })} label="Watermark" />
              </FeatureBlock>

              <FeatureBlock label="Favorites" checked={cf.favorites?.enabled || false} onToggle={(v) => updateCf('favorites', { enabled: v })}>
                <Toggle checked={cf.favorites?.requireEmail || false} onChange={(v) => updateCf('favorites', { requireEmail: v })} label="Require email" />
                <Toggle checked={cf.favorites?.submitWorkflow || false} onChange={(v) => updateCf('favorites', { submitWorkflow: v })} label="Submit workflow" hint="Client clicks 'Submit selection' when done; you're notified" />
              </FeatureBlock>

              <FeatureBlock label="Comments" checked={cf.comments?.enabled || false} onToggle={(v) => updateCf('comments', { enabled: v })}>
                <Toggle checked={cf.comments?.requireEmail || false} onChange={(v) => updateCf('comments', { requireEmail: v })} label="Require email" />
              </FeatureBlock>

              <FeatureBlock label="Purchase" checked={cf.purchase?.enabled || false} onToggle={(v) => updateCf('purchase', { enabled: v })}>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Default price per photo</div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cf.purchase?.currency || 'USD'}</span>
                    <input
                      type="number" min="0" step="0.01"
                      className="flex-1 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent"
                      placeholder="0.00"
                      value={cf.purchase?.defaultPrice ?? ''}
                      onChange={(e) => updateCf('purchase', { defaultPrice: e.target.value === '' ? null : parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Currency</div>
                  <select
                    style={{ ...selectStyle, width: 'auto' }}
                    value={cf.purchase?.currency || 'USD'}
                    onChange={(e) => updateCf('purchase', { currency: e.target.value })}
                  >
                    {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Override pricing per photo in the photo block inspector.</p>
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
          <span className="text-[10px] flex-shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>{username}/</span>
          <input
            className="flex-1 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs font-mono text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent min-w-0 transition-colors"
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
            className={`w-14 h-14 flex-shrink-0 overflow-hidden flex items-center justify-center ${onPickThumbnail ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
            style={{ border: `1px solid rgba(160,140,110,0.22)`, background: 'rgba(255,253,248,0.6)', borderRadius: 4 }}
          >
            {currentThumbUrl ? (
              <img
                src={getSizedUrl(currentThumbUrl, 'thumbnail')}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = currentThumbUrl }}
              />
            ) : (
              <span style={{ color: 'rgba(168,150,122,0.55)', fontSize: 20, fontWeight: 300, lineHeight: 1 }}>+</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {onPickThumbnail && (
              <button
                onClick={onPickThumbnail}
                className="text-xs text-left transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {currentThumbUrl ? 'Change…' : 'Select from library'}
              </button>
            )}
            {page.thumbnail?.imageUrl && (
              <button
                onClick={() => update({ thumbnail: null })}
                className="text-[10px] text-left transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#c14a4a' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
              >
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

    </PopoverShell>
  )
}
