import { useState, useRef, useEffect } from 'react'
import PopoverShell from './PopoverShell'
import DomainPanel from './DomainPanel'
import { DesignSection, PillToggle as DesignPillToggle, NumberToggle as DesignNumberToggle, DesignSelect } from './designControls'
import { normalizeCustomDomain, subdomainHost } from '../../../common/domainUtils'
import { THEME_LIST } from '../../../common/themes'
import { resolveNavStyle } from '../../../common/navStyles'
import { EditableInput } from './EditableText'

export const themeOptions = () => THEME_LIST.map(t => ({ value: t.id, label: t.name }))

const MONO = '"SF Mono", Menlo, Monaco, Consolas, monospace'

// ── Shared tokens ────────────────────────────────────────────────────────────
const DIVIDER_STRONG = '1px solid rgba(160,140,110,0.20)'
const DIVIDER_SOFT   = '1px solid rgba(160,140,110,0.12)'
const INPUT_BORDER   = 'rgba(160,140,110,0.32)'
const INPUT_FOCUS    = 'rgba(92,79,58,0.65)'

const inputStyle = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${INPUT_BORDER}`,
  padding: '0 0 7px',
  fontSize: 13,
  lineHeight: 1.35,
  color: '#2c2416',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const inputCls = 'site-input'

// Uppercase mono group label (matches the Field label treatment).
const sectionLabel = {
  fontSize: 10,
  color: 'var(--text-muted)',
  fontFamily: MONO,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
}

// Prominent group header — darker + bolder than a field label so the two read
// as distinct levels of hierarchy.
const sectionHeader = {
  fontSize: 10.5,
  fontWeight: 600,
  color: '#8b6f47',
  fontFamily: MONO,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
}

function Field({ label, children }) {
  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: MONO,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            marginBottom: 0,
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  )
}

function AssetField({ label, value, onChange, fallbackUrl, onPickFromLibrary, contain, small }) {
  const displayUrl = value || fallbackUrl || null
  const imgFit = contain ? 'object-contain p-1' : 'object-cover'
  const dim = contain ? { width: 88, height: 44 } : small ? { width: 44, height: 44 } : { width: 60, height: 60 }

  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: MONO,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            marginBottom: 0,
          }}
        >
          {label}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div
          className="flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{
            ...dim,
            background: 'rgba(255,253,248,0.6)',
            border: '1px solid rgba(160,140,110,0.22)',
            borderRadius: 4,
          }}
        >
          {displayUrl ? (
            <img src={displayUrl} className={`w-full h-full ${imgFit}`} alt="" />
          ) : (
            <span style={{ color: 'rgba(168,150,122,0.55)', fontSize: 18, fontWeight: 300 }}>+</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {onPickFromLibrary && (
            <button
              type="button"
              onClick={onPickFromLibrary}
              style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'left', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#2c2416'}
              onMouseLeave={e => e.currentTarget.style.color = '#7a6b55'}
            >
              {value ? 'Change…' : 'Select image'}
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'left', fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#c14a4a'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3L11 8l-5 5" />
    </svg>
  )
}

function DrillRow({ label, hint, onDrillIn }) {
  return (
    <button
      type="button"
      onClick={onDrillIn}
      className="w-full flex items-center text-left transition-colors group"
      style={{
        padding: '11px 14px',
        borderBottom: DIVIDER_SOFT,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,140,110,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 13, color: '#2c2416' }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: MONO, letterSpacing: '0.06em' }}>{hint}</div>}
      </div>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}><ChevronRight /></span>
    </button>
  )
}


function ToggleSwitch({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex-shrink-0 transition-colors"
      style={{
        width: 32,
        height: 18,
        borderRadius: 999,
        background: on ? '#8b6f47' : 'rgba(120,90,60,0.18)',
        boxShadow: 'inset 0 1px 1.5px rgba(60,40,15,0.12)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <span
        className="absolute transition-transform"
        style={{
          top: 2,
          left: 2,
          width: 14,
          height: 14,
          borderRadius: 999,
          background: '#f5ecd6',
          boxShadow: '0 1px 2px rgba(60,40,15,0.22), 0 0 0 0.5px rgba(60,40,15,0.10)',
          transform: on ? 'translateX(14px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}

const BrushIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
  </svg>
)

function HeaderIconButton({ children, onClick, title, innerRef }) {
  return (
    <button
      ref={innerRef}
      type="button"
      onClick={onClick}
      title={title}
      className="w-6 h-6 flex items-center justify-center rounded transition-colors flex-shrink-0"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.12)'; e.currentTarget.style.color = '#2c2416' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      {children}
    </button>
  )
}

function PrintView({ anchorEl, onClose, ps, updatePrintStore, onBack }) {
  const [connectStatus, setConnectStatus] = useState(null) // null = loading, true = connected, false = not connected
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetch('/api/admin/print/connect/status')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => setConnectStatus(!!data.chargesEnabled))
      .catch(() => setConnectStatus(false))
  }, [])

  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/admin/print/connect', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location = data.url
        return
      }
      setConnecting(false)
    } catch (_) {
      setConnecting(false)
    }
  }

  const enabled = !!ps.enabled
  const markup = ps.markup ?? 3
  const feePct = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PCT || 0)
  const exampleCost = 20
  const exampleRetail = Math.round(exampleCost * markup)
  const exampleCommission = Math.round(exampleRetail * feePct / 100)
  const exampleProfit = exampleRetail - exampleCost - exampleCommission

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Print store" onBack={onBack}>
      <div style={{ padding: '14px 14px 16px' }} className="space-y-5">
        {/* Intro */}
        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          Sell prints of your photos. We print and ship worldwide. You set the markup and keep the difference.
        </p>

        {/* Enable */}
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 13, color: '#2c2416' }}>Enable print store</span>
          <ToggleSwitch on={enabled} onClick={() => updatePrintStore({ enabled: !enabled })} />
        </div>

        {enabled && (
          <>
            {/* Pricing */}
            <div style={{ borderTop: DIVIDER_SOFT, paddingTop: 16 }}>
              <div style={sectionHeader}>Pricing</div>
              <div className="space-y-4" style={{ marginTop: 13 }}>
                <Field label="Your markup (× lab cost)">
                  <input
                    className={inputCls}
                    style={inputStyle}
                    type="number"
                    min="1"
                    step="0.1"
                    placeholder="3"
                    value={markup}
                    onChange={(e) => { const n = parseFloat(e.target.value); if (!Number.isNaN(n) && n > 0) updatePrintStore({ markup: n }) }}
                  />
                  <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.55, marginTop: 8, marginBottom: 0 }}>
                    You charge {markup}× our lab cost. A print that costs $20 to make sells for{' '}
                    <strong style={{ color: 'var(--text-secondary)' }}>${exampleRetail}</strong>, you keep{' '}
                    <strong style={{ color: 'var(--text-secondary)' }}>${exampleProfit}</strong>
                    {feePct > 0 ? ` after Sepia’s ${feePct}% commission` : ''}.
                  </p>
                </Field>

                <div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 13, color: '#2c2416' }}>Show starting price on photos</span>
                    <ToggleSwitch on={!!ps.showPriceOnImage} onClick={() => updatePrintStore({ showPriceOnImage: !ps.showPriceOnImage })} />
                  </div>
                  <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 5, marginBottom: 0 }}>
                    Displays “From $X” on photos that are for sale.
                  </p>
                </div>
              </div>
            </div>

            {/* Payouts */}
            <div style={{ borderTop: DIVIDER_SOFT, paddingTop: 16 }}>
              <div style={sectionHeader}>Payouts</div>
              <div style={{ marginTop: 12 }}>
                {connectStatus === true ? (
                  <>
                    <p style={{ fontSize: 13, color: '#2e7d32', margin: 0 }}>Connected ✓</p>
                    <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>
                      Earnings go to your Stripe account.
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={connecting}
                      onClick={handleConnect}
                      style={{
                        fontSize: 12,
                        color: connecting ? 'var(--text-muted)' : 'var(--text-secondary)',
                        border: '1px solid rgba(160,140,110,0.32)',
                        borderRadius: 4,
                        padding: '5px 12px',
                        background: 'transparent',
                        cursor: connecting ? 'default' : 'pointer',
                        transition: 'color 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => { if (!connecting) { e.currentTarget.style.color = '#2c2416'; e.currentTarget.style.borderColor = 'rgba(160,140,110,0.55)' } }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'rgba(160,140,110,0.32)' }}
                    >
                      {connecting ? 'Redirecting…' : 'Connect payouts'}
                    </button>
                    <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
                      Get paid through Stripe. Required before you can sell.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Orders */}
            <div style={{ borderTop: DIVIDER_SOFT, paddingTop: 14 }}>
              <a href="/admin/orders" style={{ fontSize: 12.5, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                View orders →
              </a>
            </div>
          </>
        )}
      </div>
    </PopoverShell>
  )
}

export default function SiteSettingsPopover({ siteConfig, username, anchorEl, onUpdate, onClose, onPickLogo, onPickFavicon, onPickCoverImage, onViewCover, onDisableCover, onPickShareLarge, onPickShareSquare }) {
  const config = siteConfig || {}
  const [view, setView] = useState('main') // 'main' | 'cover' | 'domain' | 'analytics' | 'print' | 'sharing'
  const [designOpen, setDesignOpen] = useState(false)
  const brushRef = useRef(null)
  const [coverDesignOpen, setCoverDesignOpen] = useState(false)
  const coverBrushRef = useRef(null)
  const footer = config.footer || {}

  function update(patch) {
    onUpdate({ ...config, ...patch })
  }

  function updateAnalytics(patch) {
    update({ analytics: { ...(config.analytics || {}), ...patch } })
  }

  function updateFooter(patch) {
    update({ footer: { ...(config.footer || {}), ...patch } })
  }

  function updateCover(patch) {
    update({ cover: { ...(config.cover || {}), ...patch } })
  }

  function updateShare(patch) {
    update({ share: { ...(config.share || {}), ...patch } })
  }

  function updatePrintStore(patch) {
    update({ printStore: { ...(config.printStore || {}), ...patch } })
  }

  const rootDomain = (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) || 'localhost:3000'
  const hasAnalytics = !!(config.analytics?.googleId || config.analytics?.plausibleDomain)
  const logoType = config.logoType || 'sitename'

  const brushButton = (
    <HeaderIconButton innerRef={brushRef} onClick={() => setDesignOpen(v => !v)} title="Design options">
      <BrushIcon />
    </HeaderIconButton>
  )

  // ── Cover page drill-in ───────────────────────────────────────────────────
  if (view === 'cover') {
    const cover = config.cover || {}

    const coverBrushButton = (
      <HeaderIconButton innerRef={coverBrushRef} onClick={() => setCoverDesignOpen(v => !v)} title="Cover design">
        <BrushIcon />
      </HeaderIconButton>
    )

    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Cover page" onBack={() => setView('main')} headerRight={coverBrushButton}>
        <div style={{ padding: '14px 14px 16px' }} className="space-y-5">
          <AssetField
            label="Background image"
            value={cover.imageUrl || ''}
            onChange={(v) => updateCover({ imageUrl: v })}
            onPickFromLibrary={onPickCoverImage}
          />
          <Field label="Heading">
            <EditableInput
              className={inputCls}
              style={inputStyle}
              placeholder={config.siteName || 'My Portfolio'}
              value={cover.heading || ''}
              onChange={(e) => updateCover({ heading: e.target.value })}
            />
          </Field>
          <Field label="Subheading">
            <EditableInput
              className={inputCls}
              style={inputStyle}
              placeholder={config.tagline || 'Short description'}
              value={cover.subheading || ''}
              onChange={(e) => updateCover({ subheading: e.target.value })}
            />
          </Field>
          <Field label="Button text">
            <EditableInput
              className={inputCls}
              style={inputStyle}
              placeholder="View my portfolio"
              value={cover.buttonText || ''}
              onChange={(e) => updateCover({ buttonText: e.target.value })}
            />
          </Field>
        </div>
        {coverDesignOpen && (
          <PopoverShell anchorEl={coverBrushRef.current} onClose={() => setCoverDesignOpen(false)} width={240} title="Cover Design">
            <DesignSection label="Button Style">
              <DesignPillToggle
                value={cover.buttonStyle || 'solid'}
                onChange={(v) => updateCover({ buttonStyle: v })}
                options={[
                  { value: 'solid',   label: 'Solid'   },
                  { value: 'outline', label: 'Outline' },
                  { value: 'ghost',   label: 'Ghost'   },
                ]}
              />
            </DesignSection>
          </PopoverShell>
        )}
      </PopoverShell>
    )
  }

  // ── Domain drill-in ───────────────────────────────────────────────────────
  if (view === 'domain') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Custom Domain" onBack={() => setView('main')}>
        <DomainPanel siteConfig={config} username={username} onUpdate={onUpdate} />
      </PopoverShell>
    )
  }

  // ── Analytics drill-in ────────────────────────────────────────────────────
  if (view === 'analytics') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Analytics" onBack={() => setView('main')}>
        <div style={{ padding: '14px' }} className="space-y-5">
          <Field label="Google Analytics ID">
            <input autoFocus className={inputCls} style={inputStyle} placeholder="G-XXXXXXXXXX" value={config.analytics?.googleId || ''} onChange={(e) => updateAnalytics({ googleId: e.target.value })} />
          </Field>
          <Field label="Plausible domain">
            <input className={inputCls} style={inputStyle} placeholder="yourdomain.com" value={config.analytics?.plausibleDomain || ''} onChange={(e) => updateAnalytics({ plausibleDomain: e.target.value })} />
          </Field>
        </div>
      </PopoverShell>
    )
  }

  // ── Print store drill-in ──────────────────────────────────────────────────
  if (view === 'print') {
    const ps = config.printStore || {}
    return <PrintView anchorEl={anchorEl} onClose={onClose} ps={ps} updatePrintStore={updatePrintStore} onBack={() => setView('main')} />
  }

  // ── Sharing drill-in ──────────────────────────────────────────────────────
  if (view === 'sharing') {
    const share = config.share || {}
    const largeImage = share.largeImage || config.cover?.imageUrl || ''
    const squareImage = share.squareImage || config.cover?.imageUrl || ''
    const previewSubdomain = username || 'yoursite'
    const domain = normalizeCustomDomain(config.customDomain)?.name || subdomainHost(previewSubdomain, process.env.NEXT_PUBLIC_ROOT_DOMAIN)
    const siteName = config.siteName || 'My Portfolio'
    const tagline = config.tagline || ''
    const cardBorder = '1px solid rgba(160,140,110,0.22)'

    const ChangeBadge = ({ size = 30 }) => (
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: size, height: size,
          background: 'rgba(20,12,4,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
        }}
      >
        <svg width={size === 30 ? 14 : 12} height={size === 30 ? 14 : 12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </div>
    )

    const EmptyBadge = () => (
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: 36, height: 36,
          background: 'rgba(160,140,110,0.20)',
          border: '1px solid rgba(160,140,110,0.32)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(120,90,60,0.80)" strokeWidth="1.6" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
      </div>
    )

    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Social Sharing" onBack={() => setView('main')}>
        <div style={{ padding: '14px' }} className="space-y-4">

          {/* Intro */}
          <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            How your site appears when shared online or in search results. Change an image below if you’d like. Individual pages can override with their own settings.
          </p>

          {/* Large card */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 7 }}>Social card</div>
            <div
              className="group relative w-full cursor-pointer overflow-hidden"
              style={{ paddingBottom: '52.5%', border: cardBorder, borderRadius: 4 }}
              onClick={onPickShareLarge}
            >
              <div className="absolute inset-0" style={{ background: 'rgba(160,140,110,0.10)' }}>
                {largeImage && <img src={largeImage} className="w-full h-full object-cover" alt="" />}
              </div>
              {/* Centered change-image affordance — subtle by default, prominent on hover */}
              <div
                className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${largeImage ? 'opacity-65 group-hover:opacity-100' : 'opacity-100'}`}
                style={{ paddingBottom: 60 }}
              >
                {largeImage ? <ChangeBadge /> : <EmptyBadge />}
              </div>
              <div className="absolute bottom-0 left-0 right-0" style={{ background: 'rgba(255,253,248,0.96)', borderTop: cardBorder, padding: '6px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#2c2416' }} className="truncate">{siteName}</div>
                {tagline && <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 1 }} className="truncate">{tagline}</div>}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 1 }} className="truncate">{domain}</div>
              </div>
            </div>
            {share.largeImage && (
              <button type="button" onClick={() => updateShare({ largeImage: '' })} style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }} onMouseEnter={e => e.currentTarget.style.color = '#c14a4a'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>Remove override</button>
            )}
          </div>

          {/* Compact card — square 72×72 thumb */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 7 }}>Compact card</div>
            <div
              className="group flex cursor-pointer overflow-hidden"
              style={{ border: cardBorder, borderRadius: 4, height: 72 }}
              onClick={onPickShareSquare}
            >
              <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 72, height: 72, background: 'rgba(160,140,110,0.10)' }}>
                {squareImage && <img src={squareImage} className="w-full h-full object-cover" alt="" />}
                <div
                  className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${squareImage ? 'opacity-65 group-hover:opacity-100' : 'opacity-100'}`}
                >
                  {squareImage ? <ChangeBadge size={26} /> : <EmptyBadge />}
                </div>
              </div>
              <div className="flex-1 min-w-0 px-3 flex flex-col justify-center" style={{ borderLeft: cardBorder }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#2c2416' }} className="truncate">{siteName}</div>
                {tagline && <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 1 }} className="truncate">{tagline}</div>}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 1 }} className="truncate">{domain}</div>
              </div>
            </div>
            {share.squareImage && (
              <button type="button" onClick={() => updateShare({ squareImage: '' })} style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }} onMouseEnter={e => e.currentTarget.style.color = '#c14a4a'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>Remove override</button>
            )}
          </div>

          {/* Google search result */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 7 }}>Search result</div>
            <div style={{ border: cardBorder, borderRadius: 4, padding: '10px 12px' }} className="space-y-0.5">
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO }} className="truncate">{domain}</div>
              <div style={{ fontSize: 12, color: '#1d4fb1' }} className="truncate">{siteName}</div>
              {tagline && <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }} className="line-clamp-2">{tagline}</div>}
            </div>
          </div>
        </div>
      </PopoverShell>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings" headerRight={brushButton}>

      {/* Identity */}
      <div style={{ padding: '14px 14px 16px', borderBottom: DIVIDER_STRONG }} className="space-y-5">
        <Field label="Site name">
          <EditableInput className={inputCls} style={inputStyle} placeholder="My Portfolio" value={config.siteName || ''} onChange={(e) => update({ siteName: e.target.value })} />
        </Field>
        <Field label="Tagline">
          <EditableInput className={inputCls} style={inputStyle} placeholder="Short description shown in search results" value={config.tagline || ''} onChange={(e) => update({ tagline: e.target.value })} />
        </Field>

        <Field label="Footer text">
          <input
            className={inputCls}
            style={inputStyle}
            value={footer.customText || `© ${new Date().getFullYear()} ${config.siteName || 'My Portfolio'}`}
            onChange={(e) => updateFooter({ customText: e.target.value })}
          />
        </Field>

        {/* Logo */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              fontFamily: MONO,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              marginBottom: 7,
            }}
          >
            Logo
          </div>
          <div className="mb-2.5">
            <DesignPillToggle
              value={logoType}
              onChange={(v) => update({ logoType: v })}
              options={[
                { value: 'sitename', label: 'Site name' },
                { value: 'image',    label: 'Image'     },
              ]}
            />
          </div>
          {logoType === 'sitename' && (
            <div className="mt-2.5">
              <DesignPillToggle
                value={config.logoFont || 'theme'}
                onChange={(v) => update({ logoFont: v })}
                options={[
                  { value: 'theme',     label: 'Default'   },
                  { value: 'modern',    label: 'Modern'    },
                  { value: 'editorial', label: 'Editorial' },
                ]}
              />
            </div>
          )}
          {logoType === 'image' && (
            <AssetField
              value={config.logo || ''}
              onChange={(v) => update({ logo: v })}
              onPickFromLibrary={onPickLogo}
              contain
            />
          )}
        </div>

        <AssetField
          label="Favicon"
          value={config.favicon || ''}
          onChange={(v) => update({ favicon: v })}
          fallbackUrl={logoType === 'image' ? (config.logo || '') : ''}
          onPickFromLibrary={onPickFavicon}
          small
        />
      </div>

      {/* Cover page toggle */}
      <div className="flex items-center" style={{ padding: '11px 14px', borderBottom: DIVIDER_SOFT }}>
        <ToggleSwitch
          on={config.hasCoverPage !== false}
          onClick={() => {
            const enabling = config.hasCoverPage === false
            update({ hasCoverPage: enabling })
            if (!enabling) onDisableCover?.()
          }}
        />
        <span style={{ marginLeft: 10, fontSize: 13, color: '#2c2416', flex: 1 }} className="select-none">Include a cover page</span>
        {config.hasCoverPage !== false && (
          <button
            type="button"
            onClick={() => {
              const patch = {}
              if (!config.cover?.heading) patch.heading = config.siteName || ''
              if (!config.cover?.subheading) patch.subheading = config.tagline || ''
              if (!config.cover?.buttonText) patch.buttonText = 'View my portfolio'
              if (Object.keys(patch).length) update({ cover: { ...(config.cover || {}), ...patch } })
              setView('cover')
              onViewCover?.()
            }}
            className="flex items-center gap-1 flex-shrink-0 ml-2 transition-colors"
            style={{ color: 'var(--text-muted)', fontSize: 11 }}
            onMouseEnter={e => e.currentTarget.style.color = '#2c2416'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            Configure <ChevronRight />
          </button>
        )}
      </div>

      {/* Print store toggle */}
      <div className="flex items-center" style={{ padding: '11px 14px', borderBottom: DIVIDER_SOFT }}>
        <ToggleSwitch
          on={!!config.printStore?.enabled}
          onClick={() => update({ printStore: { ...(config.printStore || {}), enabled: !config.printStore?.enabled } })}
        />
        <span style={{ marginLeft: 10, fontSize: 13, color: '#2c2416', flex: 1 }} className="select-none">Enable print store</span>
        {config.printStore?.enabled && (
          <button
            type="button"
            onClick={() => setView('print')}
            className="flex items-center gap-1 flex-shrink-0 ml-2 transition-colors"
            style={{ color: 'var(--text-muted)', fontSize: 11 }}
            onMouseEnter={e => e.currentTarget.style.color = '#2c2416'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            Configure <ChevronRight />
          </button>
        )}
      </div>

      {/* Drill rows */}
      {(() => {
        const cd = normalizeCustomDomain(config.customDomain)
        const rowProps = !cd
          ? { label: 'Set up custom domain' }
          : { label: 'Custom domain' }
        return <DrillRow {...rowProps} onDrillIn={() => setView('domain')} />
      })()}
      <DrillRow
        label={hasAnalytics ? 'Analytics' : 'Setup analytics'}
        onDrillIn={() => setView('analytics')}
      />
      <DrillRow
        label="Social sharing"
        onDrillIn={() => setView('sharing')}
      />

      {designOpen && (
        <PopoverShell anchorEl={brushRef.current} onClose={() => setDesignOpen(false)} width={280} title="Design">
          <DesignSection label="Theme">
            <DesignSelect
              value={config.design?.theme || 'kyoto'}
              onChange={(e) => update({ design: { ...(config.design || {}), theme: e.target.value } })}
            >
              {themeOptions().map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </DesignSelect>
          </DesignSection>

          {resolveNavStyle(config.design?.theme || 'kyoto') !== 'left-rail' && (
            <DesignSection label="Navigation">
              <DesignNumberToggle
                value={config.design?.navStyle === 'menu' ? 'menu' : 'links'}
                onChange={(v) => update({ design: { ...(config.design || {}), navStyle: v } })}
                options={[
                  { value: 'links', label: '1', title: 'Links' },
                  { value: 'menu',  label: '2', title: 'Menu'  },
                ]}
              />
            </DesignSection>
          )}

          <DesignSection label="Sub-navigation" description="How pages nested under another page appear in that page's menu.">
            <DesignSelect
              value={config.design?.subNavStyle || 'dropdown'}
              onChange={(e) => update({ design: { ...(config.design || {}), subNavStyle: e.target.value } })}
            >
              <option value="dropdown">Dropdown</option>
              <option value="inline">Links below page title</option>
            </DesignSelect>
          </DesignSection>

          <DesignSection label="Footer">
            <div className="flex items-center justify-between gap-3">
              <ToggleSwitch
                on={config.footer?.hidden !== true}
                onClick={() => updateFooter({ hidden: !(config.footer?.hidden === true) })}
              />
              <DesignNumberToggle
                value={config.design?.footerLayout === 'expanded' ? 'expanded' : 'simple'}
                onChange={(v) => update({ design: { ...(config.design || {}), footerLayout: v } })}
                options={[
                  { value: 'simple',   label: '1', title: 'Simple'   },
                  { value: 'expanded', label: '2', title: 'Expanded' },
                ]}
              />
            </div>
          </DesignSection>
        </PopoverShell>
      )}

    </PopoverShell>
  )
}
