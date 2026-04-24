import { useState, useRef } from 'react'
import PopoverShell from './PopoverShell'

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] text-stone-400 mb-1">{label}</div>
      {children}
    </div>
  )
}

const inputCls = 'w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent'


function AssetField({ label, value, onChange, fallbackUrl, onPickFromLibrary, contain, small }) {
  const displayUrl = value || fallbackUrl || null
  const imgFit = contain ? 'object-contain p-1' : 'object-cover'
  const boxCls = contain ? 'w-20 h-10' : small ? 'w-10 h-10' : 'w-14 h-14'

  return (
    <div>
      {label && <div className="text-[10px] text-stone-400 mb-1">{label}</div>}
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 overflow-hidden border border-stone-200 flex items-center justify-center bg-stone-50 ${boxCls}`}>
          {displayUrl ? (
            <img src={displayUrl} className={`w-full h-full ${imgFit}`} alt="" />
          ) : (
            <span className="text-stone-300 text-lg">+</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {onPickFromLibrary && (
            <button type="button" onClick={onPickFromLibrary} className="text-xs text-stone-500 hover:text-stone-900 text-left">
              {value ? 'Change…' : 'Select image'}
            </button>
          )}
          {value && (
            <button type="button" onClick={() => onChange('')} className="text-[10px] text-stone-400 hover:text-red-600 text-left">
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
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function DrillHeader({ label, onBack }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100">
      <button type="button" onClick={onBack} className="text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-xs font-medium text-stone-700">{label}</span>
    </div>
  )
}

function DrillRow({ label, hint, onDrillIn }) {
  return (
    <button
      type="button"
      onClick={onDrillIn}
      className="w-full px-3 py-2.5 flex items-center border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs text-stone-700">{label}</div>
        {hint && <div className="text-[10px] text-stone-400 mt-0.5">{hint}</div>}
      </div>
      <span className="text-stone-400 flex-shrink-0 ml-2"><ChevronRight /></span>
    </button>
  )
}

const BrushIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
  </svg>
)

export default function SiteSettingsPopover({ siteConfig, anchorEl, onUpdate, onClose, onPickLogo, onPickFavicon, onPickCoverImage, onViewCover, onDisableCover, onPickShareLarge, onPickShareSquare }) {
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
    <button
      ref={brushRef}
      type="button"
      onClick={() => setDesignOpen(v => !v)}
      className="text-stone-400 hover:text-stone-700 transition-colors"
      title="Design options"
    >
      <BrushIcon />
    </button>
  )

  // ── Cover page drill-in ───────────────────────────────────────────────────
  if (view === 'cover') {
    const cover = config.cover || {}

    const coverBrushButton = (
      <button
        ref={coverBrushRef}
        type="button"
        onClick={() => setCoverDesignOpen(v => !v)}
        className="text-stone-400 hover:text-stone-700 transition-colors"
        title="Cover design"
      >
        <BrushIcon />
      </button>
    )

    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings" headerRight={coverBrushButton}>
        <DrillHeader label="Cover page" onBack={() => setView('main')} />
        <div className="px-3 py-3 space-y-3">
          <AssetField
            label="Background image"
            value={cover.imageUrl || ''}
            onChange={(v) => updateCover({ imageUrl: v })}
            onPickFromLibrary={onPickCoverImage}
          />
          <Field label="Heading">
            <input
              className={inputCls}
              placeholder={config.siteName || 'My Portfolio'}
              value={cover.heading || ''}
              onChange={(e) => updateCover({ heading: e.target.value })}
            />
          </Field>
          <Field label="Subheading">
            <input
              className={inputCls}
              placeholder={config.tagline || 'Short description'}
              value={cover.subheading || ''}
              onChange={(e) => updateCover({ subheading: e.target.value })}
            />
          </Field>
          <Field label="Button text">
            <input
              className={inputCls}
              placeholder="View my portfolio"
              value={cover.buttonText || ''}
              onChange={(e) => updateCover({ buttonText: e.target.value })}
            />
          </Field>
        </div>
        {coverDesignOpen && (
          <PopoverShell anchorEl={coverBrushRef.current} onClose={() => setCoverDesignOpen(false)} width={220} title="Cover Design">
            <div className="px-3 py-3">
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2.5">Button Style</div>
              <div className="flex items-center gap-1.5">
                {[
                  { value: 'solid',   label: 'Solid'   },
                  { value: 'outline', label: 'Outline' },
                  { value: 'ghost',   label: 'Ghost'   },
                ].map(({ value, label }) => {
                  const active = (cover.buttonStyle || 'solid') === value
                  return (
                    <button key={value} type="button"
                      onClick={() => updateCover({ buttonStyle: value })}
                      className={`px-2.5 py-0.5 text-xs border transition-colors ${active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-500 hover:border-stone-400'}`}>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </PopoverShell>
        )}
      </PopoverShell>
    )
  }

  // ── Domain drill-in ───────────────────────────────────────────────────────
  if (view === 'domain') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings">
        <DrillHeader label="Custom Domain" onBack={() => setView('main')} />
        <div className="px-3 py-3 space-y-2">
          <input
            autoFocus
            className={inputCls}
            placeholder="photos.yourname.com"
            value={config.customDomain || ''}
            onChange={(e) => update({ customDomain: e.target.value || null })}
          />
          {config.customDomain && (
            <p className="text-[10px] text-stone-400">
              Point a CNAME to <span className="font-mono">{config.userId}.{rootDomain}</span> to activate.
            </p>
          )}
        </div>
      </PopoverShell>
    )
  }

  // ── Analytics drill-in ────────────────────────────────────────────────────
  if (view === 'analytics') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings">
        <DrillHeader label="Analytics" onBack={() => setView('main')} />
        <div className="px-3 py-3 space-y-3">
          <Field label="Google Analytics ID">
            <input autoFocus className={inputCls} placeholder="G-XXXXXXXXXX" value={config.analytics?.googleId || ''} onChange={(e) => updateAnalytics({ googleId: e.target.value })} />
          </Field>
          <Field label="Plausible domain">
            <input className={inputCls} placeholder="yourdomain.com" value={config.analytics?.plausibleDomain || ''} onChange={(e) => updateAnalytics({ plausibleDomain: e.target.value })} />
          </Field>
        </div>
      </PopoverShell>
    )
  }

  // ── Payments drill-in ─────────────────────────────────────────────────────
  if (view === 'payments') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings">
        <DrillHeader label="Payments" onBack={() => setView('main')} />
        <div className="px-3 py-3 space-y-3">
          <Field label="Default currency">
            <select
              className="w-full text-sm text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
              value={config.clientDefaults?.defaultCurrency || 'USD'}
              onChange={(e) => updateClientDefaults({ defaultCurrency: e.target.value })}
            >
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Default watermark">
            <input className={inputCls} placeholder="https://…" value={config.clientDefaults?.defaultWatermarkUrl || ''} onChange={(e) => updateClientDefaults({ defaultWatermarkUrl: e.target.value })} />
          </Field>
          <p className="text-[10px] text-stone-400">
            Connect Stripe to enable purchases across pages.{' '}
            <span className="underline cursor-pointer">Set up Stripe →</span>
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
    const domain = config.customDomain || `${config.userId || 'yoursite'}.${rootDomain.replace(/:\d+$/, '')}`
    const siteName = config.siteName || 'My Portfolio'
    const tagline = config.tagline || ''

    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings">
        <DrillHeader label="Sharing" onBack={() => setView('main')} />
        <div className="px-3 py-3 space-y-3">

          {/* Large card */}
          <div>
            <div className="text-[10px] text-stone-400 mb-1.5">Social card</div>
            <div
              className="group relative w-full cursor-pointer overflow-hidden border border-stone-200"
              style={{ paddingBottom: '52.5%' }}
              onClick={onPickShareLarge}
            >
              <div className="absolute inset-0 bg-stone-100">
                {largeImage ? (
                  <img src={largeImage} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-stone-300 text-2xl">+</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs">{largeImage ? 'Change image' : 'Add image'}</span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-2 py-1.5">
                <div className="text-xs font-medium text-stone-800 truncate">{siteName}</div>
                {tagline && <div className="text-[10px] text-stone-500 truncate mt-0.5">{tagline}</div>}
                <div className="text-[10px] text-stone-400 truncate mt-0.5">{domain}</div>
              </div>
            </div>
            {share.largeImage && (
              <button type="button" onClick={() => updateShare({ largeImage: '' })} className="text-[10px] text-stone-400 hover:text-red-600 mt-1">Remove override</button>
            )}
          </div>

          {/* Square card */}
          <div>
            <div className="text-[10px] text-stone-400 mb-1.5">Compact card</div>
            <div
              className="group flex gap-0 border border-stone-200 cursor-pointer overflow-hidden"
              onClick={onPickShareSquare}
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-stone-100 overflow-hidden">
                {squareImage ? (
                  <img src={squareImage} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-stone-300 text-xl">+</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-[10px]">{squareImage ? '↺' : '+'}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 px-2 py-1.5 flex flex-col justify-center border-l border-stone-200">
                <div className="text-xs font-medium text-stone-800 truncate">{siteName}</div>
                {tagline && <div className="text-[10px] text-stone-500 truncate mt-0.5">{tagline}</div>}
                <div className="text-[10px] text-stone-400 truncate mt-0.5">{domain}</div>
              </div>
            </div>
            {share.squareImage && (
              <button type="button" onClick={() => updateShare({ squareImage: '' })} className="text-[10px] text-stone-400 hover:text-red-600 mt-1">Remove override</button>
            )}
          </div>

          {/* Google search result */}
          <div>
            <div className="text-[10px] text-stone-400 mb-1.5">Search result</div>
            <div className="border border-stone-200 px-3 py-2.5 space-y-0.5">
              <div className="text-[10px] text-stone-400 truncate">{domain}</div>
              <div className="text-xs text-blue-600 truncate">{siteName}</div>
              {tagline && <div className="text-[10px] text-stone-500 line-clamp-2">{tagline}</div>}
            </div>
          </div>

          <div className="space-y-1.5 text-[10px] text-stone-400 border-t border-stone-100 pt-3">
            <div><span className="text-stone-500">{siteName || 'Site name'}{siteName ? ' — Page Title' : ''}</span> · Title defaults to site name; each page can set its own</div>
            <div><span className="text-stone-500">{tagline || 'Site description'}</span> · Description defaults to tagline; can be overridden per page</div>
            <div>Image defaults to cover · can be overridden by thumbnail set in page settings</div>
          </div>
        </div>
      </PopoverShell>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings" headerRight={brushButton}>

      {/* Theme — compact row */}
      <div className="px-3 py-2 border-b border-stone-100 flex items-center gap-2">
        <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider flex-shrink-0">Theme</span>
        <div className="relative min-w-0">
          <select
            className="text-xs text-stone-700 outline-none bg-transparent border-none appearance-none cursor-pointer pr-4"
            value={config.design?.theme || 'minimal-light'}
            onChange={(e) => update({ design: { ...(config.design || {}), theme: e.target.value } })}
          >
            <option value="minimal-light">Minimal Light</option>
            <option value="minimal-dark">Minimal Dark</option>
            <option value="editorial">Editorial</option>
          </select>
          <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Identity */}
      <div className="px-3 py-3 space-y-3 border-b border-stone-100">
        <Field label="Site name">
          <input className={inputCls} placeholder="My Portfolio" value={config.siteName || ''} onChange={(e) => update({ siteName: e.target.value })} />
        </Field>
        <Field label="Tagline">
          <input className={inputCls} placeholder="Short description shown in search results" value={config.tagline || ''} onChange={(e) => update({ tagline: e.target.value })} />
        </Field>

        <Field label="Footer text">
          <input
            className={inputCls}
            value={footer.customText || `© ${new Date().getFullYear()} ${config.siteName || 'My Portfolio'}`}
            onChange={(e) => updateFooter({ customText: e.target.value })}
          />
        </Field>

        {/* Logo */}
        <div>
          <div className="text-[10px] text-stone-400 mb-1.5">Logo</div>
          <div className="flex gap-1.5 mb-2">
            {[['sitename', 'Site name'], ['image', 'Image']].map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => update({ logoType: val })}
                className={`text-xs px-2.5 py-0.5 border transition-colors ${
                  logoType === val
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 text-stone-500 hover:border-stone-400'
                }`}
              >
                {lbl}
              </button>
            ))}
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

      {/* Cover page toggle + inline chevron */}
      <div className="flex items-center px-3 py-2.5 border-b border-stone-100">
        <button
          type="button"
          onClick={() => {
              const enabling = config.hasCoverPage === false
              update({ hasCoverPage: enabling })
              if (!enabling) onDisableCover?.()
            }}
          className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${config.hasCoverPage !== false ? 'bg-stone-700' : 'bg-stone-300'}`}
        >
          <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${config.hasCoverPage !== false ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
        </button>
        <span className="ml-2 text-xs text-stone-700 flex-1 select-none">Include a cover page</span>
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
            className="text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0 ml-2"
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
        label="Sharing"
        onDrillIn={() => setView('sharing')}
      />

      {designOpen && (
        <PopoverShell anchorEl={brushRef.current} onClose={() => setDesignOpen(false)} width={260} title="Design">
          <div className="px-3 py-3 border-b border-stone-100 last:border-b-0">
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2.5">Navigation</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { value: 'minimal',  label: '1', title: 'Minimal'  },
                { value: 'centered', label: '2', title: 'Centered' },
                { value: 'fixed',    label: '3', title: 'Fixed'    },
              ].map(({ value, label, title }) => {
                const active = (config.design?.navStyle || 'minimal') === value
                return (
                  <button key={value} type="button" onClick={() => update({ design: { ...(config.design || {}), navStyle: value } })} title={title}
                    className={`min-w-[28px] px-2 py-0.5 text-xs rounded-full border transition-colors ${active ? 'bg-stone-800 border-stone-800 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-500 hover:text-stone-700'}`}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="px-3 py-3 border-b border-stone-100 last:border-b-0">
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2.5">Sub-navigation</div>
            <select
              className="w-full text-sm text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
              value={config.design?.subNavStyle || 'dropdown'}
              onChange={(e) => update({ design: { ...(config.design || {}), subNavStyle: e.target.value } })}
            >
              <option value="dropdown">Dropdown</option>
              <option value="inline">Links below page title</option>
            </select>
          </div>
          <div className="px-3 py-3 border-b border-stone-100 last:border-b-0">
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2.5">Footer Layout</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { value: 'none',     label: '0', title: 'None'     },
                { value: 'compact',  label: '1', title: 'Compact'  },
                { value: 'standard', label: '2', title: 'Standard' },
                { value: 'full',     label: '3', title: 'Full'     },
              ].map(({ value, label, title }) => {
                const active = (config.design?.footerLayout || 'standard') === value
                return (
                  <button key={value} type="button" onClick={() => update({ design: { ...(config.design || {}), footerLayout: value } })} title={title}
                    className={`min-w-[28px] px-2 py-0.5 text-xs rounded-full border transition-colors ${active ? 'bg-stone-800 border-stone-800 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-500 hover:text-stone-700'}`}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </PopoverShell>
      )}

    </PopoverShell>
  )
}
