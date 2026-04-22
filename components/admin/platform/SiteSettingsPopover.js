import { useState, useRef } from 'react'
import PopoverShell from './PopoverShell'

function Section({ label, children }) {
  return (
    <div className="px-3 py-3 border-b border-stone-100 last:border-b-0">
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2.5">{label}</div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] text-stone-400 mb-1">{label}</div>
      {children}
    </div>
  )
}

const inputCls = 'w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent'

async function uploadAsset(file) {
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type, folder: 'site-assets' }),
  })
  if (!res.ok) throw new Error('Upload failed')
  const { signedUrl, gcsUrl } = await res.json()
  const form = new FormData()
  Object.entries(signedUrl.fields).forEach(([k, v]) => form.append(k, v))
  form.append('file', file)
  const up = await fetch(signedUrl.url, { method: 'POST', body: form })
  if (!up.ok) throw new Error('GCS upload failed')
  return gcsUrl
}

function AssetRow({ label, value, onChange, fallbackUrl, onPickFromLibrary }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadAsset(file)
      onChange(url)
    } catch {}
    setUploading(false)
    e.target.value = ''
  }

  const displayUrl = value || fallbackUrl || null
  const isDefault = !value && !!fallbackUrl

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded border border-stone-200 overflow-hidden flex items-center justify-center bg-stone-50">
          {displayUrl ? (
            <img src={displayUrl} className={`w-full h-full object-cover ${isDefault ? 'opacity-40' : ''}`} alt="" />
          ) : (
            <svg className="w-3.5 h-3.5 text-stone-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-stone-400 hover:bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center transition-colors leading-none"
          >×</button>
        )}
      </div>

      <div className="text-[10px] text-stone-400 w-9 flex-shrink-0 leading-tight">{label}{isDefault ? <><br/><span className="text-[9px]">(logo)</span></> : ''}</div>

      <input
        className="flex-1 min-w-0 border-b border-stone-200 p-0 pb-0.5 text-xs text-stone-600 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
        placeholder={isDefault ? '(using logo)' : 'https://…'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />

      {onPickFromLibrary && (
        <button type="button" onClick={onPickFromLibrary} title="Choose from library" className="flex-shrink-0 text-stone-300 hover:text-stone-600 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        </button>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Upload image"
        className="flex-shrink-0 text-stone-300 hover:text-stone-600 transition-colors disabled:opacity-40"
      >
        {uploading ? (
          <span className="text-[10px] text-stone-400">…</span>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        )}
      </button>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
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

function ToggleRow({ checked, onToggle, label, actionLabel, onDrillIn, hint, alwaysShowDrill }) {
  return (
    <div className="px-3 py-2.5 flex items-center border-b border-stone-100 last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(!checked)}
        className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-stone-700' : 'bg-stone-300'}`}
      >
        <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
      </button>
      <div className="flex-1 ml-2 min-w-0">
        <div className="text-xs text-stone-700 select-none leading-tight">{label}</div>
        {hint && <div className="text-[10px] text-stone-400 select-none leading-tight mt-0.5">{hint}</div>}
      </div>
      {(checked || alwaysShowDrill) && actionLabel && onDrillIn && (
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

function DrillRow({ label, onDrillIn }) {
  return (
    <div className="px-3 py-2.5 flex items-center border-b border-stone-100 last:border-b-0">
      <span className="flex-1 text-xs text-stone-700 select-none">{label}</span>
      <button
        type="button"
        onClick={onDrillIn}
        className="flex items-center gap-0.5 text-xs text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0"
      >
        <ChevronRight />
      </button>
    </div>
  )
}

export default function SiteSettingsPopover({ siteConfig, anchorEl, onUpdate, onClose, onPickLogo, onPickFavicon }) {
  const config = siteConfig || {}
  const [view, setView] = useState('main') // 'main' | 'domain' | 'analytics' | 'payments'
  const [designOpen, setDesignOpen] = useState(false)
  const brushRef = useRef(null)
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

  const rootDomain =
    (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) || 'localhost:3000'

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
            <select className="w-full text-sm text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
              value={config.clientDefaults?.defaultCurrency || 'USD'}
              onChange={(e) => updateClientDefaults({ defaultCurrency: e.target.value })}>
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

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings">

      {/* Theme row */}
      <div className="px-3 py-2.5 border-b border-stone-100">
        <div className="flex items-center border border-stone-300 rounded-md px-2 py-1.5 gap-1.5 hover:border-stone-400 transition-colors">
          <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider flex-shrink-0">Theme</span>
          <div className="flex-1 relative min-w-0">
            <select
              className="w-full pr-4 text-xs text-stone-700 outline-none bg-transparent border-none appearance-none cursor-pointer"
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
          <button
            ref={brushRef}
            type="button"
            onClick={() => setDesignOpen(v => !v)}
            className="text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
            title="Design options"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
            </svg>
          </button>
        </div>
      </div>

      {/* Identity */}
      <div className="px-3 py-3 space-y-3 border-b border-stone-100">
        <Field label="Site name">
          <input className={inputCls} placeholder="My Portfolio" value={config.siteName || ''} onChange={(e) => update({ siteName: e.target.value })} />
        </Field>
        <AssetRow
          label="Logo"
          value={config.logo || ''}
          onChange={(v) => update({ logo: v })}
          onPickFromLibrary={onPickLogo}
        />
        <AssetRow
          label="Favicon"
          value={config.favicon || ''}
          onChange={(v) => update({ favicon: v })}
          fallbackUrl={config.logo || ''}
          onPickFromLibrary={onPickFavicon}
        />
        <Field label="Footer text">
          <input
            className={inputCls}
            value={footer.customText || `© ${new Date().getFullYear()} ${config.siteName || 'My Portfolio'}`}
            onChange={(e) => updateFooter({ customText: e.target.value })}
          />
        </Field>
      </div>

      {/* Toggle / drill rows */}
      <ToggleRow
        checked={config.customDomain != null}
        onToggle={(v) => {
          if (!v) update({ customDomain: null })
          else update({ customDomain: '' })
        }}
        label="Custom domain"
        actionLabel="Configure"
        onDrillIn={() => setView('domain')}
      />

      <ToggleRow
        checked={!!config.analytics?.enabled}
        onToggle={(v) => updateAnalytics({ enabled: v })}
        label="Analytics"
        actionLabel="Configure"
        onDrillIn={() => setView('analytics')}
      />

      <ToggleRow
        checked={!!config.clientDefaults?.paymentsEnabled}
        onToggle={(v) => updateClientDefaults({ paymentsEnabled: v })}
        label="Payments"
        actionLabel="Configure"
        onDrillIn={() => setView('payments')}
      />

      {designOpen && (
        <PopoverShell anchorEl={brushRef.current} onClose={() => setDesignOpen(false)} width={260} title="Design">
          <Section label="Navigation">
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
          </Section>
          <Section label="Sub-navigation">
            <select className="w-full text-sm text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
              value={config.design?.subNavStyle || 'dropdown'}
              onChange={(e) => update({ design: { ...(config.design || {}), subNavStyle: e.target.value } })}>
              <option value="dropdown">Dropdown</option>
              <option value="inline">Links below page title</option>
            </select>
          </Section>
          <Section label="Footer Layout">
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
          </Section>
        </PopoverShell>
      )}

    </PopoverShell>
  )
}
