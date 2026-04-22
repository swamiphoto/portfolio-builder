# Site Settings Popover Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tabbed SiteSettingsPopover (Site / Design / Domain / Advanced) with a flat scrollable main view and drill-in sub-views, matching the pattern established in PageSettingsPopover.

**Architecture:** Remove all tabs. Main view shows identity fields (site name, logo, favicon, footer text) inline, then a theme row (select + Customize chevron), then toggle/drill rows for domain, analytics, and payments. Drill-in views: design (nav/footer options), domain, analytics, payments. Contact tab removed (handled by profile). Notification email removed.

**Tech Stack:** React, Tailwind CSS

---

## File Structure

**Modified:**
- `components/admin/platform/SiteSettingsPopover.js` — full rewrite (~320 lines → ~400 lines)

---

## Task 1: Rewrite SiteSettingsPopover

**Files:**
- Modify: `components/admin/platform/SiteSettingsPopover.js`

### New view state

`view`: `'main' | 'design' | 'domain' | 'analytics' | 'payments'`

### New component helpers (add at top of file, before export)

```jsx
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

// Toggle + optional action label + chevron — for domain (has a clear enabled state)
function ToggleRow({ checked, onToggle, label, actionLabel, onDrillIn, hint }) {
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

// Label-only row with always-visible chevron — for analytics and payments (no on/off state)
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
```

### Main view layout

After identity fields and theme row, show:

```
[Custom domain ToggleRow] checked={!!config.customDomain}, actionLabel="Configure", onDrillIn='domain'
[Analytics DrillRow] → 'analytics'
[Payments DrillRow] → 'payments'
```

Theme row (not a ToggleRow — it's a select + chevron):

```jsx
<div className="px-3 py-2.5 flex items-center gap-2 border-b border-stone-100">
  <select
    className="flex-1 text-xs text-stone-700 outline-none bg-transparent border-none appearance-none cursor-pointer"
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
    className="flex items-center gap-0.5 text-xs text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0"
  >
    Customize
    <ChevronRight />
  </button>
</div>
```

### Identity fields (inline, no section header needed — use subtle divider)

```jsx
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
```

### Drill-in: `view === 'design'`

DrillHeader "Design" + back to main. Contains nav style pills, sub-nav select, footer layout pills (same as current Design tab, theme removed since it's now inline).

### Drill-in: `view === 'domain'`

DrillHeader "Custom Domain" + back.

```jsx
<div className="px-3 py-3 space-y-2">
  <input
    className={inputCls}
    placeholder="photos.yourname.com"
    value={config.customDomain || ''}
    onChange={(e) => update({ customDomain: e.target.value || null })}
    autoFocus
  />
  {config.customDomain && (
    <p className="text-[10px] text-stone-400">
      Point a CNAME to <span className="font-mono">{config.userId}.{rootDomain}</span> to activate.
    </p>
  )}
</div>
```

Toggle off (from main view): `update({ customDomain: null })`
Toggle on: `update({ customDomain: '' })` then open drill-in so user types the domain.

### Drill-in: `view === 'analytics'`

DrillHeader "Analytics" + back.

```jsx
<div className="px-3 py-3 space-y-3">
  <Field label="Google Analytics ID">
    <input className={inputCls} placeholder="G-XXXXXXXXXX" value={config.analytics?.googleId || ''} onChange={(e) => updateAnalytics({ googleId: e.target.value })} autoFocus />
  </Field>
  <Field label="Plausible domain">
    <input className={inputCls} placeholder="yourdomain.com" value={config.analytics?.plausibleDomain || ''} onChange={(e) => updateAnalytics({ plausibleDomain: e.target.value })} />
  </Field>
</div>
```

### Drill-in: `view === 'payments'`

DrillHeader "Payments" + back. Contains default currency and watermark URL. Stripe CTA placeholder.

```jsx
<div className="px-3 py-3 space-y-3">
  <Field label="Default currency">
    <select className="w-full text-sm text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent" value={config.clientDefaults?.defaultCurrency || 'USD'} onChange={(e) => updateClientDefaults({ defaultCurrency: e.target.value })}>
      {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  </Field>
  <Field label="Default watermark">
    <input className={inputCls} placeholder="https://…" value={config.clientDefaults?.defaultWatermarkUrl || ''} onChange={(e) => updateClientDefaults({ defaultWatermarkUrl: e.target.value })} />
  </Field>
  <p className="text-[10px] text-stone-400">
    Connect Stripe to enable purchases. <span className="underline cursor-pointer">Set up Stripe →</span>
  </p>
</div>
```

### Removed

- All tab UI (`['site', 'design', 'domain', 'advanced']`)
- `tab` state
- Contact section entirely
- Notification email (`clientDefaults.notificationEmail`)
- `hasAnyClientFeatures` guard (payments always accessible at site level)

- [ ] **Step 1: Read the current file in full**

Read `components/admin/platform/SiteSettingsPopover.js`.

- [ ] **Step 2: Write the full replacement file**

Write the complete new file. Keep `Section`, `Field`, `UploadField`, `uploadAsset`, `inputCls` at the top. Add `ChevronRight`, `DrillHeader`, `ToggleRow`, `DrillRow` after them. Replace `export default` with the new component using `view` state.

The complete new `export default` component:

```js
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

      {/* Theme row */}
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-stone-100">
        <select
          className="flex-1 text-xs text-stone-700 outline-none bg-transparent border-none appearance-none cursor-pointer"
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
          className="flex items-center gap-0.5 text-xs text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0"
        >
          Customize
          <ChevronRight />
        </button>
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
      />

      <DrillRow label="Analytics" onDrillIn={() => setView('analytics')} />

      <DrillRow label="Payments" onDrillIn={() => setView('payments')} />

    </PopoverShell>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest --no-coverage 2>&1 | tail -10
```

Expected: same pass/fail count as before (4 pre-existing failures unchanged).

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/SiteSettingsPopover.js
git commit -m "feat: redesign SiteSettingsPopover — flat layout with theme row and drill-ins for design/domain/analytics/payments"
```
