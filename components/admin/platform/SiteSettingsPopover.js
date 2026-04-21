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
const smallInputCls = 'w-full border-b border-stone-200 p-0 pb-1 text-xs text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent'

export default function SiteSettingsPopover({ siteConfig, anchorEl, onUpdate, onClose }) {
  const config = siteConfig || {}

  function update(patch) {
    onUpdate({ ...config, ...patch })
  }

  function updateContact(patch) {
    update({ contact: { ...(config.contact || {}), ...patch } })
  }

  function updateAnalytics(patch) {
    update({ analytics: { ...(config.analytics || {}), ...patch } })
  }

  function updateClientDefaults(patch) {
    update({ clientDefaults: { ...(config.clientDefaults || {}), ...patch } })
  }

  const hasAnyClientFeatures = (config.pages || []).some(
    (p) => p.clientFeatures?.enabled
  )

  const rootDomain =
    (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) || 'localhost:3000'
  const protocol =
    rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'
  const siteUrl = config.customDomain
    ? `${protocol}://${config.customDomain}`
    : `${protocol}://${config.userId}.${rootDomain}`

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Site Settings">

      {/* ── Identity ── */}
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
          <Field label="Tagline">
            <input
              className={inputCls}
              placeholder="Optional"
              value={config.tagline || ''}
              onChange={(e) => update({ tagline: e.target.value })}
            />
          </Field>
          <Field label="Logo URL">
            <input
              className={inputCls}
              placeholder="https://…"
              value={config.logo || ''}
              onChange={(e) => update({ logo: e.target.value })}
            />
          </Field>
          <Field label="Favicon URL">
            <input
              className={inputCls}
              placeholder="https://… (defaults to logo)"
              value={config.favicon || ''}
              onChange={(e) => update({ favicon: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      {/* ── Domain ── */}
      <Section label="Domain">
        <Field label="Your site">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500 font-mono truncate flex-1">{siteUrl}</span>
            <button
              onClick={() => navigator.clipboard.writeText(siteUrl)}
              className="text-[10px] text-stone-400 hover:text-stone-700 flex-shrink-0"
            >
              Copy
            </button>
          </div>
        </Field>
        <div className="mt-2">
          <Field label="Custom domain (optional)">
            <input
              className={inputCls}
              placeholder="photos.yourname.com"
              value={config.customDomain || ''}
              onChange={(e) => update({ customDomain: e.target.value || null })}
            />
          </Field>
        </div>
      </Section>

      {/* ── Contact ── */}
      <Section label="Contact">
        <div className="space-y-2">
          {[
            { key: 'email', label: 'Email', placeholder: 'hello@example.com' },
            { key: 'instagram', label: 'Instagram', placeholder: '@handle' },
            { key: 'facebook', label: 'Facebook', placeholder: 'Page name or URL' },
            { key: 'twitter', label: 'X / Twitter', placeholder: '@handle' },
            { key: 'tiktok', label: 'TikTok', placeholder: '@handle' },
            { key: 'youtube', label: 'YouTube', placeholder: 'Channel URL' },
            { key: 'website', label: 'Website', placeholder: 'https://…' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-stone-400 w-16 flex-shrink-0">{label}</span>
              <input
                className={smallInputCls}
                placeholder={placeholder}
                value={config.contact?.[key] || ''}
                onChange={(e) => updateContact({ [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Theme ── */}
      <Section label="Theme">
        <select
          className="w-full text-sm text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
          value={config.theme || 'minimal-light'}
          onChange={(e) => update({ theme: e.target.value })}
        >
          <option value="minimal-light">Minimal Light</option>
          <option value="minimal-dark">Minimal Dark</option>
          <option value="editorial">Editorial</option>
        </select>
      </Section>

      {/* ── Analytics ── */}
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

      {/* ── Client defaults (only when any page uses client features) ── */}
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
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Default watermark URL">
              <input
                className={inputCls}
                placeholder="https://… (used when page watermark is on)"
                value={config.clientDefaults?.defaultWatermarkUrl || ''}
                onChange={(e) => updateClientDefaults({ defaultWatermarkUrl: e.target.value })}
              />
            </Field>
            <p className="text-[10px] text-stone-400 mt-1">
              Connect Stripe to enable purchases.{' '}
              <span className="underline cursor-pointer">Set up Stripe →</span>
            </p>
          </div>
        </Section>
      )}

      {/* ── Footer ── */}
      <div className="px-3 py-2.5 flex justify-end">
        <button
          onClick={onClose}
          className="text-xs px-3 py-1 bg-stone-900 text-white hover:bg-stone-700 transition-colors"
        >
          Done
        </button>
      </div>

    </PopoverShell>
  )
}
