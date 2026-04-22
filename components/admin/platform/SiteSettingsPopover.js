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

export default function SiteSettingsPopover({ siteConfig, anchorEl, onUpdate, onClose }) {
  const config = siteConfig || {}
  const [tab, setTab] = useState('site')
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

  const hasAnyClientFeatures = (config.pages || []).some(p => p.clientFeatures?.enabled)

  const rootDomain =
    (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) || 'localhost:3000'

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings">

      {/* ── Tabs ── */}
      <div className="flex border-b border-stone-100 px-1">
        {['site', 'domain', 'advanced'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2.5 py-2 text-xs capitalize transition-colors ${
              tab === t
                ? 'text-stone-800 border-b-2 border-stone-800 -mb-px'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Site tab ── */}
      {tab === 'site' && <>
        <Section label="Identity">
          <div className="space-y-3">
            <Field label="Site name">
              <input
                className={inputCls}
                placeholder="My Portfolio"
                value={config.siteName || ''}
                onChange={(e) => update({ siteName: e.target.value })}
              />
            </Field>
            <UploadField
              label="Logo"
              placeholder="https://…"
              value={config.logo || ''}
              onChange={(v) => update({ logo: v })}
            />
            <UploadField
              label="Favicon"
              placeholder="https://… (defaults to logo)"
              value={config.favicon || ''}
              onChange={(v) => update({ favicon: v })}
            />
            <Field label="Footer text">
              <input
                className={inputCls}
                placeholder={`© ${new Date().getFullYear()} ${config.siteName || 'Your Name'}`}
                value={footer.customText || ''}
                onChange={(e) => updateFooter({ customText: e.target.value })}
              />
            </Field>
          </div>
        </Section>
      </>}

      {/* ── Domain tab ── */}
      {tab === 'domain' && <>
        <Section label="Custom Domain">
          <Field label="Domain">
            <input
              className={inputCls}
              placeholder="photos.yourname.com"
              value={config.customDomain || ''}
              onChange={(e) => update({ customDomain: e.target.value || null })}
            />
          </Field>
          {config.customDomain && (
            <p className="text-[10px] text-stone-400 mt-2">
              Point a CNAME record to <span className="font-mono">{config.userId}.{rootDomain}</span> to activate your custom domain.
            </p>
          )}
        </Section>
      </>}

      {/* ── Advanced tab ── */}
      {tab === 'advanced' && <>
        <Section label="Analytics">
          <div className="space-y-3">
            <Field label="Google Analytics ID">
              <input
                className={inputCls}
                placeholder="G-XXXXXXXXXX"
                value={config.analytics?.googleId || ''}
                onChange={(e) => updateAnalytics({ googleId: e.target.value })}
              />
            </Field>
            <Field label="Plausible domain">
              <input
                className={inputCls}
                placeholder="yourdomain.com"
                value={config.analytics?.plausibleDomain || ''}
                onChange={(e) => updateAnalytics({ plausibleDomain: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        {hasAnyClientFeatures && (
          <Section label="Client Defaults">
            <div className="space-y-3">
              <Field label="Notification email">
                <input
                  className={inputCls}
                  placeholder="Where alerts are sent"
                  value={config.clientDefaults?.notificationEmail || ''}
                  onChange={(e) => updateClientDefaults({ notificationEmail: e.target.value })}
                />
              </Field>
              <Field label="Default currency">
                <select
                  className="w-full text-sm text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
                  value={config.clientDefaults?.defaultCurrency || 'USD'}
                  onChange={(e) => updateClientDefaults({ defaultCurrency: e.target.value })}
                >
                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Default watermark URL">
                <input
                  className={inputCls}
                  placeholder="https://…"
                  value={config.clientDefaults?.defaultWatermarkUrl || ''}
                  onChange={(e) => updateClientDefaults({ defaultWatermarkUrl: e.target.value })}
                />
              </Field>
              <p className="text-[10px] text-stone-400">
                Connect Stripe to enable purchases.{' '}
                <span className="underline cursor-pointer">Set up Stripe →</span>
              </p>
            </div>
          </Section>
        )}
      </>}

    </PopoverShell>
  )
}
