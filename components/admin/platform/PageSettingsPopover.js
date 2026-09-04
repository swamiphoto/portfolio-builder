import { useState, useRef, useEffect } from 'react'
import { slugify, effectivePageSlug, uniqueSlug } from '../../../common/pageUtils'
import { getPagePhotos } from '../../../common/assetRefs'
import { getSizedUrl } from '../../../common/imageUtils'
import { buildPreviewSequence, MUSIC_POOL, musicIdToUrl, musicUrlToId, randomMusicUrl } from '../../../common/slideshowSync'
import { resolveCaption } from '../../../common/captionResolver'
import { THEME_LIST } from '../../../common/themes'
import PopoverShell from './PopoverShell'
import ToggleSwitch from '../common/ToggleSwitch'
import { addPackage, updatePackage, removePackage, setFeatured, dollarsToCents, centsToDollars } from './purchasePackages'

const BORDER = 'rgba(160,140,110,0.18)'
const INPUT = 'w-full border-b border-[rgba(160,140,110,0.3)] py-1.5 text-sm text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent leading-snug'

function AutoGrowTextarea({ value, onChange, placeholder, maxLength }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      maxLength={maxLength}
      className="w-full border-b border-[rgba(160,140,110,0.3)] py-1.5 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] transition-colors placeholder:text-[#c4b49a] bg-transparent resize-none overflow-hidden leading-snug"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  )
}

function FeatureBlock({ label, description, checked, onToggle, disabled, children }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{label}</span>
        <ToggleSwitch on={checked} onChange={disabled ? undefined : onToggle} disabled={disabled} ariaLabel={label} />
      </div>
      {/* Description sits tight under the title (like the site's other settings),
          full-width below the toggle row. Controls appear when on. */}
      {description && (
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 3 }}>{description}</div>
      )}
      {checked && children && (
        <div className="space-y-2" style={{ marginTop: 8 }}>{children}</div>
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
      <ToggleSwitch on={checked} onChange={onToggle} disabled={disabled} ariaLabel={label} />
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
  // Theme override is a secondary affordance: the "…" opens a small menu, and only
  // its "Override theme" item reveals the picker.
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)

  const slideshow = page.slideshow || {}
  const [excluded, setExcluded] = useState(slideshow.excluded || [])
  const currentMusicId = musicUrlToId(slideshow.musicUrl || '')
  const isPoolTrack = MUSIC_POOL.some(t => t.id === currentMusicId)
  const [musicMode, setMusicMode] = useState(isPoolTrack || !slideshow.musicUrl ? 'pool' : 'custom')
  const [customMusicUrl, setCustomMusicUrl] = useState(!isPoolTrack ? (slideshow.musicUrl || '') : '')
  const [copied, setCopied] = useState(false)
  const [previewingMusic, setPreviewingMusic] = useState(false)
  // Two-step remove for packages: the trash arms it, then an explicit ✓ / ✕ pair confirms or cancels.
  const [pendingRemove, setPendingRemove] = useState(null)

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
  const paymentsReady = !!(siteConfig?.printStore?.chargesEnabled && siteConfig?.printStore?.stripeConnectAccountId)

  const rawSequence = buildPreviewSequence(page.blocks || [], excluded)
  const sequence = rawSequence.map(item =>
    item.type === 'image'
      ? { ...item, caption: resolveCaption({ url: item.url, caption: item.caption }, assetsByUrl || {}) }
      : item
  )
  const includedCount = sequence.filter(s => s.type === 'image' && !s.excluded).length
  const textCount = sequence.filter(s => s.type === 'text').length

  const selectStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${BORDER}`,
    padding: '0 0 7px',
    fontSize: 12,
    color: 'var(--text-secondary)',
    outline: 'none',
    transition: 'border-color 0.15s',
    appearance: 'none',
    cursor: 'pointer',
    paddingRight: 16,
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23a8967a' stroke-width='2'><path d='M4 6l4 4 4-4'/></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0 center',
    backgroundSize: '12px',
  }

  const rootDomain = (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) || 'localhost:3000'
  const isLocalhost = rootDomain.includes('localhost')
  const protocol = isLocalhost ? 'http' : 'https'
  const slideshowUrl = `${protocol}://${username}.${rootDomain}/${displaySlug}/slideshow`

  // ── Link page: a link is just an external URL — no hero / slideshow / client
  // features. Only its label, the URL, and whether it opens in a new tab. ────────
  if (page.type === 'link') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title="Link">
        <div className="px-3 py-3 space-y-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Label</div>
            <input className={INPUT} placeholder="Link label" value={page.title || ''} onChange={(e) => update({ title: e.target.value })} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1.5" style={{ color: 'var(--text-muted)' }}>URL</div>
            <input className={INPUT} type="url" autoFocus={!page.url} placeholder="https://…" value={page.url || ''} onChange={(e) => update({ url: e.target.value })} />
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Open in new tab</span>
            <ToggleSwitch on={page.linkNewTab !== false} onChange={(v) => update({ linkNewTab: v })} ariaLabel="Open in new tab" />
          </div>
        </div>
      </PopoverShell>
    )
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
          <AutoGrowTextarea
            placeholder="Gate message (optional)"
            maxLength={300}
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
    // Effective track to preview: the selected pool track, or a parseable custom URL.
    const previewMusicId = musicMode === 'custom' ? musicUrlToId(customMusicUrl) : currentMusicId
    // Copy-link affordance lives in the header, next to the close button.
    const copyLinkButton = (
      <button
        onClick={() => { navigator.clipboard.writeText(slideshowUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5 flex-shrink-0"
        style={{ color: copied ? 'var(--sepia-accent)' : 'var(--text-muted)' }}
        aria-label="Copy slideshow link"
        title={copied ? 'Copied!' : 'Copy slideshow link'}
      >
        {copied ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        )}
      </button>
    )
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title="Slideshow" onBack={() => { setPreviewingMusic(false); setView('main') }} headerRight={slideshow.enabled ? copyLinkButton : undefined}>
        {slideshow.enabled && <>
          <div className="px-3 pt-3 space-y-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Style</div>
              <select
                style={selectStyle}
                value={slideshow.layout || 'kenburns'}
                onChange={(e) => updateSlideshow({ layout: e.target.value })}
              >
                <option value="kenburns">Ken Burns</option>
                <option value="film-stack">Shoebox</option>
                <option value="film-single">Print</option>
                <option value="polaroid">Polaroid</option>
              </select>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>Music</div>
                {previewMusicId && (
                  <button
                    type="button"
                    onClick={() => setPreviewingMusic(v => !v)}
                    className="inline-flex items-center gap-1 rounded-full transition-colors"
                    style={{
                      padding: '1.5px 7px 1.5px 5px',
                      border: `1px solid ${previewingMusic ? 'var(--sepia-accent)' : 'rgba(160,140,110,0.35)'}`,
                      background: previewingMusic ? 'rgba(139,111,71,0.10)' : 'transparent',
                      color: previewingMusic ? 'var(--sepia-accent)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!previewingMusic) e.currentTarget.style.color = 'var(--text-secondary)' }}
                    onMouseLeave={e => { if (!previewingMusic) e.currentTarget.style.color = 'var(--text-muted)' }}
                    aria-label={previewingMusic ? 'Stop preview' : 'Preview music'}
                  >
                    {previewingMusic ? (
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                    ) : (
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" /></svg>
                    )}
                    <span className="text-[9px] uppercase tracking-[0.06em] font-mono">{previewingMusic ? 'Stop' : 'Preview'}</span>
                  </button>
                )}
              </div>
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
              {/* Hidden player: mounts only while previewing; remounts (and autoplays)
                  when the selected track changes. Unmounts — and stops — when the
                  drill-in closes or the track becomes unparseable. */}
              {previewingMusic && previewMusicId && (
                <iframe
                  key={previewMusicId}
                  title="Music preview"
                  src={`https://www.youtube.com/embed/${previewMusicId}?autoplay=1`}
                  allow="autoplay"
                  style={{ position: 'absolute', width: 1, height: 1, border: 0, opacity: 0, pointerEvents: 'none' }}
                />
              )}
            </div>
          </div>

          <div className="px-3 py-3">
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
              <div className="space-y-0.5 overflow-y-auto -mr-1 pr-1" style={{ maxHeight: 268 }}>
                {sequence.map((item, i) => {
                  const isText = item.type === 'text'
                  const excluded = item.excluded
                  const excludeTarget = isText ? item.excludeKey : item.url
                  const preview = isText ? (item.content || 'Text slide') : (item.caption || '')
                  return (
                    <div
                      key={isText ? `text-${i}` : `img-${item.url}-${i}`}
                      className="flex items-center gap-2.5 rounded px-1 py-1 transition-opacity"
                      style={{ opacity: excluded ? 0.4 : 1 }}
                    >
                      {/* Thumbnail, or a text-slide tile */}
                      {isText ? (
                        <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--panel)', border: `1px solid ${BORDER}` }}>
                          <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0" style={{ border: `1px solid ${BORDER}` }}>
                          <img src={getSizedUrl(item.url, 'thumbnail')} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Text preview / caption */}
                      <div className="flex-1 min-w-0">
                        {preview ? (
                          <div
                            className="text-[11px] leading-snug"
                            style={{ color: isText ? 'var(--text-secondary)' : 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {preview}
                          </div>
                        ) : (
                          <div className="text-[11px] italic" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>No caption</div>
                        )}
                      </div>

                      {/* Include / exclude toggle */}
                      {excludeTarget && (
                        <button
                          onClick={() => toggleExcluded(excludeTarget)}
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5"
                          style={{ color: excluded ? 'var(--text-muted)' : 'var(--sepia-accent)' }}
                          aria-label={excluded ? 'Include in slideshow' : 'Exclude from slideshow'}
                          title={excluded ? 'Include in slideshow' : 'Exclude from slideshow'}
                        >
                          {excluded ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="px-3 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button
              onClick={() => window.open(slideshowUrl, '_blank')}
              className="w-full flex items-center justify-center gap-2 transition-opacity"
              style={{
                padding: '10px 12px', borderRadius: 6,
                background: 'var(--sepia-accent)', border: 'none',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                color: '#f9f6f1', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Preview slideshow
            </button>
          </div>
        </>}

      </PopoverShell>
    )
  }

  // ── Packages drill-in ─────────────────────────────────────────────────────
  if (view === 'packages') {
    const purchase = cf.purchase || {}
    // Inline dropdown that sits inside the "Sell … for …" sentence: sized to its
    // value, hairline underline, warm caret — reads as an editable word, not a form field.
    const inlineSelectStyle = {
      display: 'inline-block',
      width: 'auto',
      maxWidth: '100%',
      background: 'transparent',
      border: 'none',
      borderBottom: '1px solid rgba(160,140,110,0.3)',
      padding: '0 15px 2px 0',
      fontSize: 13,
      fontWeight: 500,
      color: '#2c2416',
      outline: 'none',
      appearance: 'none',
      cursor: 'pointer',
      transition: 'border-color 0.15s',
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%238b6f47' stroke-width='2'><path d='M4 6l4 4 4-4'/></svg>")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0 center',
      backgroundSize: '11px',
    }
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title="Packages" onBack={() => setView('client')}>
        <div className="px-3 py-3 space-y-4">
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            Create offers your clients can buy. Give them a few photos free, then sell the rest as packages.
          </p>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Free downloads</div>
            <input
              type="number" min="0" step="1"
              className="w-20 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent"
              value={purchase.freeAllowance ?? 0}
              onChange={(e) => updateCf('purchase', { freeAllowance: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            />
          </div>

          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>Packages</div>
            {(purchase.packages || []).map((pkg) => {
              const isAll = pkg.credits === 'all'
              const isPending = pendingRemove === pkg.id
              return (
                <div key={pkg.id} className="rounded-[10px] p-3 pr-8 relative" style={{ border: '1px solid rgba(160,140,110,0.28)', background: 'var(--panel)' }}>
                  <div className="absolute top-2 right-2 flex items-center">
                    {isPending ? (
                      <div className="flex items-center gap-0.5 h-[22px] rounded-[5px] pl-2 pr-0.5" style={{ background: 'rgba(193,74,74,0.10)' }}>
                        <span className="font-mono uppercase tracking-[0.06em] select-none mr-0.5" style={{ fontSize: 9, color: '#c14a4a' }}>Delete?</span>
                        <button
                          type="button" aria-label="Confirm remove package"
                          className="w-[18px] h-[18px] rounded flex items-center justify-center transition-colors"
                          style={{ color: '#c14a4a', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(193,74,74,0.20)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          onClick={() => { updateCf('purchase', { packages: removePackage(purchase.packages, pkg.id) }); setPendingRemove(null) }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button
                          type="button" aria-label="Cancel remove"
                          className="w-[18px] h-[18px] rounded flex items-center justify-center transition-colors"
                          style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.18)'; e.currentTarget.style.color = '#2c2416' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          onClick={() => setPendingRemove(null)}
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button" aria-label="Remove package"
                        className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center transition-colors"
                        style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.14)'; e.currentTarget.style.color = '#2c2416' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        onClick={() => setPendingRemove(pkg.id)}
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" /></svg>
                      </button>
                    )}
                  </div>

                  {/* Name reads as the card's heading — no separate label above it. */}
                  <input
                    type="text" placeholder="Name this package"
                    className="w-full text-[14px] font-medium text-[#2c2416] border-b border-[rgba(160,140,110,0.3)] py-1 outline-none focus:border-[#8b6f47] transition-colors bg-transparent placeholder:text-[#c4b49a] placeholder:font-normal leading-snug"
                    value={pkg.label}
                    onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { label: e.target.value }) })}
                  />

                  {/* The offer reads as a sentence you fill in: "Sell … for …". */}
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-2 text-[13px] mt-3" style={{ color: 'var(--text-muted)' }}>
                    <span>Sell</span>
                    <select
                      style={inlineSelectStyle}
                      value={isAll ? 'all' : 'number'}
                      onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { credits: e.target.value === 'all' ? 'all' : 10 }) })}
                    >
                      <option value="number">a set number of</option>
                      <option value="all">the entire gallery</option>
                    </select>
                    {!isAll && (
                      <>
                        <input
                          type="number" min="1" step="1"
                          className="w-10 text-center text-[13px] font-medium text-[#2c2416] border-b border-[rgba(160,140,110,0.3)] pb-0.5 outline-none focus:border-[#8b6f47] transition-colors bg-transparent"
                          value={pkg.credits}
                          onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { credits: Math.max(1, parseInt(e.target.value, 10) || 1) }) })}
                        />
                        <span>photos</span>
                      </>
                    )}
                    <span>for</span>
                    <span className="inline-flex items-baseline gap-1 border-b border-[rgba(160,140,110,0.3)] pb-0.5 transition-colors focus-within:border-[#8b6f47]">
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{siteConfig?.printStore?.currency || 'USD'}</span>
                      <input
                        type="number" min="0" step="0.01" placeholder="0.00"
                        className="w-16 text-[13px] font-medium text-[#2c2416] outline-none bg-transparent placeholder:text-[#c4b49a] placeholder:font-normal"
                        value={centsToDollars(pkg.price)}
                        onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { price: dollarsToCents(e.target.value) }) })}
                      />
                    </span>
                  </div>

                  {/* Featured marker — shows a "Best value" badge on this package in the
                      client drawer. Single-select: marking one clears the others. */}
                  <button
                    type="button"
                    onClick={() => updateCf('purchase', { packages: setFeatured(purchase.packages, pkg.id) })}
                    className="flex items-center gap-1.5 mt-3 transition-colors"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: pkg.featured ? '#8b6f47' : 'var(--text-muted)' }}
                    onMouseEnter={e => { if (!pkg.featured) e.currentTarget.style.color = 'var(--text-secondary)' }}
                    onMouseLeave={e => { if (!pkg.featured) e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={pkg.featured ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z" />
                    </svg>
                    <span className="text-[11px] font-mono uppercase tracking-[0.06em]">Best value</span>
                  </button>
                </div>
              )
            })}
            {/* Matches the canonical add-affordance (Add Page / Add Block): muted mono caps,
                real plus icon, radius 5, neutral hover — quiet, not accent-loud. */}
            <button
              type="button"
              onClick={() => updateCf('purchase', { packages: addPackage(purchase.packages) })}
              className="w-full flex items-center justify-center gap-2 transition-colors"
              style={{
                padding: '8px 10px', borderRadius: 5,
                background: 'transparent', border: '1px dashed rgba(26,18,10,0.14)',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500,
                color: 'var(--text-muted)', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,18,10,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add a package
            </button>
          </div>
        </div>
      </PopoverShell>
    )
  }

  // ── Client features drill-in ──────────────────────────────────────────────
  if (view === 'client') {
    const pkgs = cf.purchase?.packages || []
    const minCents = pkgs.length ? Math.min(...pkgs.map(p => p.price || 0)) : null
    const packagesSummary = pkgs.length
      ? `${pkgs.length} package${pkgs.length !== 1 ? 's' : ''}${minCents != null ? ` · from ${siteConfig?.printStore?.currency || 'USD'} ${centsToDollars(minCents)}` : ''}`
      : 'No packages yet — add one'
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title="Client Features" onBack={() => setView('main')}>
        <div className="px-3 py-3 space-y-3">
          <FeatureBlock
            label="Downloads"
            description="Enable clients to download your photos. For larger prints, upload a high-res version in the photo viewer."
            checked={cf.downloads?.enabled || false}
            onToggle={(v) => updateCf('downloads', { enabled: v })}
          />

          <FeatureBlock
            label="Favorites"
            description="Let clients mark their favorite photos."
            checked={cf.favorites?.enabled || false}
            onToggle={(v) => updateCf('favorites', { enabled: v })}
          />

          <FeatureBlock
            label="Comments"
            description="Let clients leave comments on photos."
            checked={cf.comments?.enabled || false}
            onToggle={(v) => updateCf('comments', { enabled: v })}
          />

          <FeatureBlock
            label="Watermark"
            description="Overlays your logo on photos."
            checked={cf.watermark?.enabled || false}
            onToggle={(v) => updateCf('watermark', { enabled: v })}
          />

          <FeatureBlock
            label="Packages"
            description="Create offers that upsell more of your photos."
            checked={cf.purchase?.enabled || false}
            onToggle={(v) => {
              // Delivery depends on downloads; enabling Packages enables Downloads too (one atomic write).
              const patch = { clientFeatures: { ...cf, purchase: { ...(cf.purchase || {}), enabled: v } } }
              if (v) patch.clientFeatures.downloads = { ...(cf.downloads || {}), enabled: true }
              update(patch)
            }}
          >
            {/* Drill-in lives in the reveal area (like the other features), so "Configure"
                sits at the row's right edge and never crowds the toggle. */}
            <button
              type="button"
              onClick={() => setView('packages')}
              className="w-full flex items-center gap-2 transition-colors"
              style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <span className="text-xs truncate flex-1 text-left">{packagesSummary}</span>
              <span className="flex items-center gap-0.5 text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                Configure
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </span>
            </button>
            {!paymentsReady && (
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Connect a payout account in Site Settings → Print store to accept payments.</p>
            )}
          </FeatureBlock>
        </div>
      </PopoverShell>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  const siteThemeId = siteConfig?.design?.theme || 'kyoto'
  const siteThemeName = (THEME_LIST.find((t) => t.id === siteThemeId) || {}).name || siteThemeId
  // Active only when the page genuinely differs from the site theme — so if the
  // site later switches to the same theme, the override quietly folds away.
  const overrideActive = !!(page.themeOverride && THEME_LIST.some((t) => t.id === page.themeOverride) && page.themeOverride !== siteThemeId)
  const overrideName = overrideActive ? (THEME_LIST.find((t) => t.id === page.themeOverride) || {}).name : ''

  // A "…" button beside the close opens a small menu; its item reveals the theme
  // picker. The button carries a dot when an override is active.
  const menuItemStyle = { display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '7px 9px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 6, whiteSpace: 'nowrap' }
  // The "…" menu only exists before a page is overridden — it's how the override is
  // turned on. Once overridden, the Theme section shows directly (below), so there's
  // nothing left for the menu to do.
  const themeToggle = overrideActive ? null : (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setThemeMenuOpen((v) => !v)}
        className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/5 flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Page options"
        aria-expanded={themeMenuOpen}
        title="Page options"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="3.5" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.5" cy="8" r="1.3" />
        </svg>
      </button>
      {themeMenuOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 15 }} onClick={() => setThemeMenuOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 5, zIndex: 20, minWidth: 210, background: 'var(--popover)', border: '1px solid rgba(160,140,110,0.22)', borderRadius: 8, boxShadow: 'var(--popover-shadow)', padding: 4 }}>
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
              onClick={() => { setShowThemePicker(true); setThemeMenuOpen(false) }}
            >
              Override theme for this page
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`} headerRight={themeToggle}>

      {/* Shown directly once a page is overridden; otherwise revealed from the "…"
          menu. Reverting to the site theme clears it; other pages are unaffected. */}
      {(overrideActive || showThemePicker) && (
        <Section label={overrideActive ? 'Theme (overridden)' : 'Theme override'}>
          {overrideActive && (
            <p style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--text-muted)', margin: '0 0 7px' }}>
              The site theme is <strong style={{ color: 'var(--text-secondary)' }}>{siteThemeName}</strong>, but this page has been overridden to render in <strong style={{ color: 'var(--text-secondary)' }}>{overrideName}</strong>.
            </p>
          )}
          <select
            style={selectStyle}
            value={overrideActive ? page.themeOverride : ''}
            onChange={(e) => update({ themeOverride: e.target.value || null })}
          >
            <option value="">{siteThemeName} (site theme)</option>
            {THEME_LIST.filter((t) => t.id !== siteThemeId && (!t.hidden || t.id === page.themeOverride)).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Section>
      )}

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
              // Don't let a hand-typed slug collide with another page's — that
              // makes Preview open the wrong page (#102). Suffix it if taken.
              const others = (siteConfig?.pages || []).filter(p => p.id !== page.id)
              const taken = new Set(others.map(effectivePageSlug))
              update({ slug: sanitized ? uniqueSlug(sanitized, taken) : sanitized })
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
