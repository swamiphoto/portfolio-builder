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

function UploadField({ label, value, placeholder, onChange }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadAsset(file)
      onChange(url)
    } catch (e) {}
    setUploading(false)
    e.target.value = ''
  }

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          className={inputCls}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-[10px] text-stone-400 hover:text-stone-700 flex-shrink-0 disabled:opacity-40"
        >
          {uploading ? '…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </Field>
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

export default function SiteSettingsPopover({ siteConfig, anchorEl, onUpdate, onClose }) {
  const config = siteConfig || {}
  const [view, setView] = useState('main') // 'main' | 'design' | 'domain' | 'analytics' | 'payments'
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

  // ── Design drill-in ───────────────────────────────────────────────────────
  if (view === 'design') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings">
        <DrillHeader label="Design" onBack={() => setView('main')} />
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
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-stone-100">
        <span className="text-xs text-stone-500 flex-shrink-0">Theme</span>
        <div className="flex-1 flex items-center border border-stone-300 rounded-md px-2 py-1 gap-1.5 min-w-0 hover:border-stone-400 transition-colors">
          <select
            className="flex-1 text-xs text-stone-700 outline-none bg-transparent border-none appearance-none cursor-pointer min-w-0"
            value={config.design?.theme || 'minimal-light'}
            onChange={(e) => update({ design: { ...(config.design || {}), theme: e.target.value } })}
          >
            <option value="minimal-light">Minimal Light</option>
            <option value="minimal-dark">Minimal Dark</option>
            <option value="editorial">Editorial</option>
          </select>
          <button
            type="button"
            onClick={() => setView('design')}
            className="text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
            title="Design options"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
              <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
              <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <svg className="w-3 h-3 text-stone-400 flex-shrink-0 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Identity */}
      <div className="px-3 py-3 space-y-3 border-b border-stone-100">
        <Field label="Site name">
          <input className={inputCls} placeholder="My Portfolio" value={config.siteName || ''} onChange={(e) => update({ siteName: e.target.value })} />
        </Field>
        <UploadField label="Logo" placeholder="https://…" value={config.logo || ''} onChange={(v) => update({ logo: v })} />
        <UploadField label="Favicon" placeholder="https://… (defaults to logo)" value={config.favicon || ''} onChange={(v) => update({ favicon: v })} />
        <Field label="Footer text">
          <input className={inputCls} placeholder={`© ${new Date().getFullYear()} ${config.siteName || 'Your Name'}`} value={footer.customText || ''} onChange={(e) => updateFooter({ customText: e.target.value })} />
        </Field>
      </div>

      {/* Toggle / drill rows */}
      <ToggleRow
        checked={!!config.customDomain}
        onToggle={(v) => {
          if (!v) update({ customDomain: null })
          else { update({ customDomain: '' }); setView('domain') }
        }}
        label="Custom domain"
        actionLabel="Configure"
        onDrillIn={() => setView('domain')}
        alwaysShowDrill
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

    </PopoverShell>
  )
}
