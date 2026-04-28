import { useState, useRef } from 'react'
import PopoverShell from './PopoverShell'
import { DesignSection, PillToggle as DesignPillToggle, NumberToggle as DesignNumberToggle, DesignSelect } from './designControls'

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

export default function SiteSettingsPopover({ siteConfig, username, anchorEl, onUpdate, onClose, onPickLogo, onPickFavicon, onPickCoverImage, onViewCover, onDisableCover, onPickShareLarge, onPickShareSquare }) {
  const config = siteConfig || {}
  const [view, setView] = useState('main') // 'main' | 'domain' | 'analytics' | 'payments'
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

  function updateClientDefaults(patch) {
    update({ clientDefaults: { ...(config.clientDefaults || {}), ...patch } })
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
            <input
              className={inputCls}
              style={inputStyle}
              placeholder={config.siteName || 'My Portfolio'}
              value={cover.heading || ''}
              onChange={(e) => updateCover({ heading: e.target.value })}
            />
          </Field>
          <Field label="Subheading">
            <input
              className={inputCls}
              style={inputStyle}
              placeholder={config.tagline || 'Short description'}
              value={cover.subheading || ''}
              onChange={(e) => updateCover({ subheading: e.target.value })}
            />
          </Field>
          <Field label="Button text">
            <input
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
        <div style={{ padding: '14px' }} className="space-y-2">
          <input
            autoFocus
            className={inputCls}
            style={inputStyle}
            placeholder="photos.yourname.com"
            value={config.customDomain || ''}
            onChange={(e) => update({ customDomain: e.target.value || null })}
          />
          {config.customDomain && (
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Point a CNAME to <span style={{ fontFamily: MONO, color: 'var(--text-secondary)' }}>{config.userId}.{rootDomain}</span> to activate.
            </p>
          )}
        </div>
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

  // ── Payments drill-in ─────────────────────────────────────────────────────
  if (view === 'payments') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Payments" onBack={() => setView('main')}>
        <div style={{ padding: '14px' }} className="space-y-5">
          <Field label="Default currency">
            <select
              className={inputCls}
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', paddingRight: 16, backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23a8967a' stroke-width='2'><path d='M4 6l4 4 4-4'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 center', backgroundSize: '12px' }}
              value={config.clientDefaults?.defaultCurrency || 'USD'}
              onChange={(e) => updateClientDefaults({ defaultCurrency: e.target.value })}
            >
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Default watermark">
            <input className={inputCls} style={inputStyle} placeholder="https://…" value={config.clientDefaults?.defaultWatermarkUrl || ''} onChange={(e) => updateClientDefaults({ defaultWatermarkUrl: e.target.value })} />
          </Field>
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Connect Stripe to enable purchases across pages.{' '}
            <span style={{ textDecoration: 'underline', cursor: 'pointer', color: 'var(--text-secondary)' }}>Set up Stripe →</span>
          </p>
        </div>
      </PopoverShell>
    )
  }

  // ── Sharing drill-in ──────────────────────────────────────────────────────
  if (view === 'sharing') {
    const share = config.share || {}
    const largeImage = share.largeImage || config.cover?.imageUrl || ''
    const squareImage = share.squareImage || config.cover?.imageUrl || ''
    const previewSubdomain = username || 'yoursite'
    const domain = config.customDomain || `${previewSubdomain}.sepia.photo`
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
            How your site appears when shared online or in search results. Change an image below if you’d like — individual pages can override with their own settings.
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
          <input className={inputCls} style={inputStyle} placeholder="My Portfolio" value={config.siteName || ''} onChange={(e) => update({ siteName: e.target.value })} />
        </Field>
        <Field label="Tagline">
          <input className={inputCls} style={inputStyle} placeholder="Short description shown in search results" value={config.tagline || ''} onChange={(e) => update({ tagline: e.target.value })} />
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
            className="flex-shrink-0 ml-2 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#2c2416'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ChevronRight />
          </button>
        )}
      </div>

      {/* Drill rows */}
      <DrillRow
        label={config.customDomain || 'Setup custom domain'}
        onDrillIn={() => setView('domain')}
      />
      <DrillRow
        label={hasAnalytics ? 'Analytics' : 'Setup analytics'}
        onDrillIn={() => setView('analytics')}
      />
      <DrillRow
        label={config.clientDefaults?.paymentsEnabled ? 'Payments' : 'Setup payments'}
        onDrillIn={() => setView('payments')}
      />
      <DrillRow
        label="Social sharing"
        onDrillIn={() => setView('sharing')}
      />

      {designOpen && (
        <PopoverShell anchorEl={brushRef.current} onClose={() => setDesignOpen(false)} width={280} title="Design">
          <DesignSection label="Theme">
            <DesignSelect
              value={config.design?.theme || 'minimal-light'}
              onChange={(e) => update({ design: { ...(config.design || {}), theme: e.target.value } })}
            >
              <option value="minimal-light">Minimal Light</option>
              <option value="minimal-dark">Minimal Dark</option>
              <option value="editorial">Editorial</option>
            </DesignSelect>
          </DesignSection>

          <DesignSection label="Navigation">
            <DesignNumberToggle
              value={config.design?.navStyle || 'minimal'}
              onChange={(v) => update({ design: { ...(config.design || {}), navStyle: v } })}
              options={[
                { value: 'minimal',  label: '1', title: 'Minimal'  },
                { value: 'centered', label: '2', title: 'Centered' },
                { value: 'fixed',    label: '3', title: 'Fixed'    },
              ]}
            />
          </DesignSection>

          <DesignSection label="Sub-navigation">
            <DesignSelect
              value={config.design?.subNavStyle || 'dropdown'}
              onChange={(e) => update({ design: { ...(config.design || {}), subNavStyle: e.target.value } })}
            >
              <option value="dropdown">Dropdown</option>
              <option value="inline">Links below page title</option>
            </DesignSelect>
          </DesignSection>

          <DesignSection label="Footer Layout">
            <DesignNumberToggle
              value={config.design?.footerLayout || 'standard'}
              onChange={(v) => update({ design: { ...(config.design || {}), footerLayout: v } })}
              options={[
                { value: 'none',     label: '0', title: 'None'     },
                { value: 'compact',  label: '1', title: 'Compact'  },
                { value: 'standard', label: '2', title: 'Standard' },
                { value: 'full',     label: '3', title: 'Full'     },
              ]}
            />
          </DesignSection>
        </PopoverShell>
      )}

    </PopoverShell>
  )
}
