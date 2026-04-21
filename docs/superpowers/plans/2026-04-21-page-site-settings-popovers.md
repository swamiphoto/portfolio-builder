# Page & Site Settings Popovers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scattered page-settings controls in the sidebar with two focused anchor-popovers — one per page (slug, thumbnail, password, client features) and one for the site (identity, domain, contact, theme, analytics, client defaults) — while keeping the sidebar purely for content editing (title, description, cover, slideshow, blocks).

**Architecture:** Follow the existing PageDesignPopover pattern exactly: `anchorEl` ref from parent → positioned `fixed` div → click-outside handler. Extract a shared `PopoverShell` component so both popovers share positioning/close logic. Popovers write directly to `page` / `siteConfig` via existing `onPageChange` / `onConfigChange` callbacks with the 1.5 s autosave unchanged.

**Tech Stack:** React (Next.js pages router), Tailwind CSS, existing GCS/R2 save layer, `common/siteConfig.js` schema, `common/assetRefs.js` normalizers.

---

## File Map

| Status | File | Responsibility |
|--------|------|----------------|
| **Create** | `common/pageUtils.js` | Client-safe `slugify` utility (extracted from siteConfig.js) |
| **Create** | `components/admin/platform/PopoverShell.js` | Shared anchor-popover wrapper: positioning, click-outside, sticky header |
| **Create** | `components/admin/platform/PageSettingsPopover.js` | Page settings popover: URL, thumbnail, password, client features |
| **Create** | `components/admin/platform/SiteSettingsPopover.js` | Site settings popover: identity, domain, contact, theme, analytics, client defaults |
| **Modify** | `common/pageUtils.js` | (new — also used by siteConfig.js) |
| **Modify** | `common/siteConfig.js` | Use `slugify` from pageUtils; extend `defaultPage.clientFeatures`; extend `createDefaultSiteConfig` |
| **Modify** | `common/assetRefs.js` | Add `getPagePhotos(page)`; update `pageDisplayThumbnail` to fall back to first page photo; update `normalizePageEntity` for new `clientFeatures` shape |
| **Modify** | `components/admin/platform/PageSettingsPanel.js` | Remove Advanced section (slug + client features stub); add gear icon button + ref |
| **Modify** | `components/admin/platform/PageEditorSidebar.js` | Add settings gear state + ref; render `PageSettingsPopover`; pass gear trigger to `PageSettingsPanel` |
| **Modify** | `components/admin/platform/PlatformSidebar.js` | Add site settings gear icon + ref; render `SiteSettingsPopover` |

---

## Task 1: Extract `slugify` to `common/pageUtils.js`

**Files:**
- Create: `common/pageUtils.js`
- Modify: `common/siteConfig.js` (import from pageUtils, remove inline impl)

### Why a separate file
`common/siteConfig.js` starts with `// Server-side only` and imports `gcsClient` (R2 SDK). Client components cannot safely import from it even though `generatePageId` is pure JS. Extracting to `pageUtils.js` makes the function safely importable everywhere.

- [ ] **Create `common/pageUtils.js`**

```javascript
export function slugify(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
```

- [ ] **Update `common/siteConfig.js`** — replace the `generatePageId` function body with a re-export from pageUtils:

```javascript
import { slugify } from './pageUtils'
// ...keep everything else...

export function generatePageId(title, suffix = '') {
  return slugify(title) + suffix
}
```

*(Leave the `generatePageId` export in place — it's used by `PageSettingsPanel.js` and elsewhere. The body now delegates to `slugify`.)*

- [ ] **Verify** — run `node -e "const {slugify} = require('./common/pageUtils'); console.log(slugify('My New Gallery!'))"` from the workspace root. Expected output: `my-new-gallery`

- [ ] **Commit**
```bash
git add common/pageUtils.js common/siteConfig.js
git commit -m "refactor: extract slugify to common/pageUtils (client-safe)"
```

---

## Task 2: Extend schemas in `common/siteConfig.js` and `common/assetRefs.js`

**Files:**
- Modify: `common/siteConfig.js`
- Modify: `common/assetRefs.js`

### `defaultPage` — richer `clientFeatures`

Replace the flat `clientFeatures` object in `defaultPage` with nested sub-feature objects:

- [ ] **Update `defaultPage` in `common/siteConfig.js`** — change `clientFeatures` from:
```javascript
clientFeatures: {
  enabled: false,
  passwordHash: '',
  watermarkEnabled: false,
  votingEnabled: false,
  downloadEnabled: false,
},
```
to:
```javascript
clientFeatures: {
  enabled: false,
  downloads: { enabled: false, quality: ['web'], requireEmail: false, watermarkEnabled: false },
  favorites: { enabled: false, requireEmail: false, submitWorkflow: false },
  comments: { enabled: false, requireEmail: false },
  purchase: { enabled: false, defaultPrice: null, currency: 'USD', tiers: { web: null, print: null, original: null } },
},
passwordGateMessage: '',
```

- [ ] **Extend `createDefaultSiteConfig`** — add new site-level fields:
```javascript
export function createDefaultSiteConfig(userId) {
  return {
    userId,
    siteName: 'My Portfolio',
    tagline: '',
    slug: '',
    theme: 'minimal-light',
    customDomain: null,
    publishedAt: null,
    logo: '',
    favicon: '',
    contact: {
      email: '',
      instagram: '',
      facebook: '',
      twitter: '',
      tiktok: '',
      youtube: '',
      website: '',
    },
    analytics: {
      googleId: '',
      plausibleDomain: '',
    },
    clientDefaults: {
      notificationEmail: '',
      defaultCurrency: 'USD',
      defaultWatermarkUrl: '',
    },
    pages: [
      defaultPage({ id: 'home', title: 'Home', showInNav: false }),
    ],
  }
}
```

- [ ] **Update `normalizePageEntity` in `common/assetRefs.js`** — replace the flat clientFeatures normalization block (lines 168–174) with:

```javascript
const cf = page.clientFeatures || {}
const clientFeatures = {
  enabled: cf.enabled ?? false,
  downloads: {
    enabled: cf.downloads?.enabled ?? cf.downloadEnabled ?? false,
    quality: cf.downloads?.quality ?? ['web'],
    requireEmail: cf.downloads?.requireEmail ?? false,
    watermarkEnabled: cf.downloads?.watermarkEnabled ?? cf.watermarkEnabled ?? false,
  },
  favorites: {
    enabled: cf.favorites?.enabled ?? cf.votingEnabled ?? false,
    requireEmail: cf.favorites?.requireEmail ?? false,
    submitWorkflow: cf.favorites?.submitWorkflow ?? false,
  },
  comments: {
    enabled: cf.comments?.enabled ?? false,
    requireEmail: cf.comments?.requireEmail ?? false,
  },
  purchase: {
    enabled: cf.purchase?.enabled ?? false,
    defaultPrice: cf.purchase?.defaultPrice ?? null,
    currency: cf.purchase?.currency ?? 'USD',
    tiers: cf.purchase?.tiers ?? { web: null, print: null, original: null },
  },
}
```

Also add `passwordGateMessage` to the return spread:
```javascript
return {
  ...page,
  // ...existing fields...
  password: page.password || '',
  passwordGateMessage: page.passwordGateMessage || '',
  // ...rest...
  clientFeatures,
  // ...
}
```

- [ ] **Commit**
```bash
git add common/siteConfig.js common/assetRefs.js
git commit -m "feat(schema): extend page clientFeatures and site config with new fields"
```

---

## Task 3: Add `getPagePhotos` utility + update `pageDisplayThumbnail`

**Files:**
- Modify: `common/assetRefs.js`

- [ ] **Add `getPagePhotos` after `pageDisplayThumbnail` in `common/assetRefs.js`**

```javascript
export function getPagePhotos(page) {
  const urls = []
  for (const block of page.blocks || []) {
    if (block.type === 'photo' && block.imageUrl) {
      urls.push(block.imageUrl)
    } else if (block.images?.length) {
      for (const img of block.images) {
        const url = img?.url || img?.imageUrl || (typeof img === 'string' ? img : null)
        if (url) urls.push(url)
      }
    } else if (block.imageUrls?.length) {
      for (const url of block.imageUrls) {
        if (url) urls.push(url)
      }
    }
  }
  return [...new Set(urls)]
}
```

- [ ] **Update `pageDisplayThumbnail`** to fall back to first page photo:

```javascript
export function pageDisplayThumbnail(page) {
  const explicit = page.thumbnail?.imageUrl
  if (explicit && !page.thumbnail?.useCover) return explicit
  const coverImg = page.cover?.imageUrl
  if (coverImg) return coverImg
  if (explicit) return explicit
  if (page.thumbnailUrl) return page.thumbnailUrl
  return getPagePhotos(page)[0] || ''
}
```

*(Note: `getPagePhotos` must be defined before `pageDisplayThumbnail` in the file, or move the call after. Ensure ordering is correct.)*

- [ ] **Commit**
```bash
git add common/assetRefs.js
git commit -m "feat(assets): add getPagePhotos utility; fall back to first page photo in pageDisplayThumbnail"
```

---

## Task 4: Create `PopoverShell` component

**Files:**
- Create: `components/admin/platform/PopoverShell.js`

- [ ] **Create the file**

```javascript
import { useRef, useEffect, useState } from 'react'

export default function PopoverShell({ anchorEl, onClose, width = 320, title, children }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const top = Math.max(8, rect.bottom + 4)
    const maxHeight = window.innerHeight - top - 8
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    setPos({ left, top, maxHeight })
  }, [anchorEl, width])

  useEffect(() => {
    function handler(e) {
      if (
        ref.current && !ref.current.contains(e.target) &&
        anchorEl && !anchorEl.contains(e.target)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorEl])

  return (
    <div
      ref={ref}
      className="fixed bg-white border border-stone-200 shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-[9999] overflow-auto"
      style={{
        width,
        maxHeight: pos?.maxHeight ?? '80vh',
        left: pos?.left,
        top: pos?.top,
        visibility: pos ? undefined : 'hidden',
      }}
    >
      <div className="px-3 pt-2.5 pb-2 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <span className="text-xs font-semibold text-stone-700 tracking-wide">{title}</span>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-base leading-none ml-2">×</button>
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Commit**
```bash
git add components/admin/platform/PopoverShell.js
git commit -m "feat: add PopoverShell shared anchor-popover wrapper"
```

---

## Task 5: Create `PageSettingsPopover` — URL + Thumbnail + Password sections

**Files:**
- Create: `components/admin/platform/PageSettingsPopover.js`

This task builds the first three sections. Client features (Task 6) will be added next.

- [ ] **Create the file**

```javascript
import { useRef } from 'react'
import { slugify } from '../../../common/pageUtils'
import { getPagePhotos } from '../../../common/assetRefs'
import { getSizedUrl } from '../../../common/imageUtils'
import PopoverShell from './PopoverShell'

function Section({ label, children }) {
  return (
    <div className="px-3 py-3 border-b border-stone-100 last:border-b-0">
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2.5">{label}</div>
      {children}
    </div>
  )
}

export default function PageSettingsPopover({ page, anchorEl, onUpdate, onClose, username }) {
  const pagePhotos = getPagePhotos(page)
  const autoSlug = slugify(page.title || '')
  const displaySlug = page.slug || autoSlug

  function update(patch) {
    onUpdate({ ...page, ...patch })
  }

  const rootDomain = (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) || 'localhost:3000'
  const protocol = rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'
  const publicUrl = `${protocol}://${username}.${rootDomain}/${displaySlug}`

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title="Page Settings">

      {/* ── URL ── */}
      <Section label="URL">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-stone-400 flex-shrink-0 font-mono">{username}/</span>
          <input
            className="flex-1 border-b border-stone-200 p-0 pb-1 text-xs font-mono text-stone-700 outline-none focus:border-stone-500 bg-transparent min-w-0"
            value={displaySlug}
            onChange={(e) => update({ slug: e.target.value })}
            placeholder={autoSlug || 'page-url'}
            spellCheck={false}
          />
        </div>
      </Section>

      {/* ── Thumbnail ── */}
      <Section label="Thumbnail">
        {pagePhotos.length > 0 ? (
          <div>
            <div className="grid grid-cols-4 gap-1">
              {pagePhotos.slice(0, 8).map((url) => {
                const isSelected = !page.thumbnail?.useCover && page.thumbnail?.imageUrl === url
                return (
                  <button
                    key={url}
                    onClick={() => update({ thumbnail: { imageUrl: url, useCover: false } })}
                    className={`aspect-square overflow-hidden border-2 transition-colors ${
                      isSelected
                        ? 'border-stone-900'
                        : 'border-transparent hover:border-stone-300'
                    }`}
                    title="Set as thumbnail"
                  >
                    <img
                      src={getSizedUrl(url, 'thumbnail')}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                )
              })}
            </div>
            {page.thumbnail?.imageUrl && !page.thumbnail?.useCover && (
              <button
                onClick={() => update({ thumbnail: { imageUrl: '', useCover: true } })}
                className="text-[10px] text-stone-400 hover:text-stone-700 mt-1.5"
              >
                Reset to first photo
              </button>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-stone-400">
            Add photos to this page to set a thumbnail.
          </p>
        )}
      </Section>

      {/* ── Password ── */}
      <Section label="Password">
        <input
          type="text"
          className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
          placeholder="Leave blank for public access"
          value={page.password || ''}
          onChange={(e) => update({ password: e.target.value })}
          autoComplete="off"
        />
        {page.password && (
          <>
            <textarea
              className="w-full mt-2 border-b border-stone-200 p-0 pb-1 text-xs text-stone-600 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent resize-none"
              placeholder="Gate message (optional)"
              rows={2}
              value={page.passwordGateMessage || ''}
              onChange={(e) => update({ passwordGateMessage: e.target.value })}
            />
            <p className="text-[10px] text-stone-400 mt-1.5">
              Password-protected pages are not indexed by search engines.
            </p>
          </>
        )}
      </Section>

      {/* ── Footer ── */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <button
          onClick={() => navigator.clipboard.writeText(publicUrl)}
          className="text-[10px] text-stone-400 hover:text-stone-700 transition-colors"
        >
          Copy link
        </button>
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
```

- [ ] **Commit**
```bash
git add components/admin/platform/PageSettingsPopover.js
git commit -m "feat: add PageSettingsPopover — URL, thumbnail, password sections"
```

---

## Task 6: Add Client Features section to `PageSettingsPopover`

**Files:**
- Modify: `components/admin/platform/PageSettingsPopover.js`

- [ ] **Add helper components at the top of the file** (before the `Section` function):

```javascript
function Toggle({ checked, onChange, label, hint }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-start gap-2 cursor-pointer"
    >
      <div
        className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 mt-0.5 ${
          checked ? 'bg-stone-700' : 'bg-stone-300'
        }`}
      >
        <div
          className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${
            checked ? 'translate-x-[14px]' : 'translate-x-[2px]'
          }`}
        />
      </div>
      <div>
        <div className="text-xs text-stone-700 select-none leading-tight">{label}</div>
        {hint && <div className="text-[10px] text-stone-400 select-none leading-tight mt-0.5">{hint}</div>}
      </div>
    </div>
  )
}

function FeatureBlock({ label, checked, onToggle, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-700">{label}</span>
        <button
          onClick={() => onToggle(!checked)}
          className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${
            checked ? 'bg-stone-700' : 'bg-stone-300'
          }`}
        >
          <div
            className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${
              checked ? 'translate-x-[14px]' : 'translate-x-[2px]'
            }`}
          />
        </button>
      </div>
      {checked && children && (
        <div className="pl-3 space-y-2 border-l border-stone-100">
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Add `updateCf` helper inside `PageSettingsPopover`** (after the `update` function):

```javascript
function updateCf(key, patch) {
  const cf = page.clientFeatures || {}
  update({
    clientFeatures: {
      ...cf,
      [key]: { ...(cf[key] || {}), ...patch },
    },
  })
}
```

- [ ] **Add Client Features section** between the Password section and the footer:

```javascript
{/* ── Client Features ── */}
<Section label="Client Features">
  {(() => {
    const cf = page.clientFeatures || {}
    return (
      <>
        <Toggle
          checked={cf.enabled || false}
          onChange={(v) => update({ clientFeatures: { ...cf, enabled: v } })}
          label="Enable client features"
        />

        {cf.enabled && (
          <div className="mt-3 pt-3 border-t border-stone-100 space-y-3">

            <FeatureBlock
              label="Downloads"
              checked={cf.downloads?.enabled || false}
              onToggle={(v) => updateCf('downloads', { enabled: v })}
            >
              <div className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Quality</div>
              {['web', 'print', 'original'].map((q) => (
                <label key={q} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(cf.downloads?.quality || ['web']).includes(q)}
                    onChange={(e) => {
                      const cur = cf.downloads?.quality || ['web']
                      const next = e.target.checked
                        ? [...new Set([...cur, q])]
                        : cur.filter((x) => x !== q)
                      updateCf('downloads', { quality: next })
                    }}
                    className="rounded border-stone-300 text-stone-700 focus:ring-stone-500"
                  />
                  <span className="text-xs text-stone-600 capitalize">{q}</span>
                </label>
              ))}
              <Toggle
                checked={cf.downloads?.requireEmail || false}
                onChange={(v) => updateCf('downloads', { requireEmail: v })}
                label="Require email to download"
              />
              <Toggle
                checked={cf.downloads?.watermarkEnabled || false}
                onChange={(v) => updateCf('downloads', { watermarkEnabled: v })}
                label="Watermark"
              />
            </FeatureBlock>

            <FeatureBlock
              label="Favorites"
              checked={cf.favorites?.enabled || false}
              onToggle={(v) => updateCf('favorites', { enabled: v })}
            >
              <Toggle
                checked={cf.favorites?.requireEmail || false}
                onChange={(v) => updateCf('favorites', { requireEmail: v })}
                label="Require email"
              />
              <Toggle
                checked={cf.favorites?.submitWorkflow || false}
                onChange={(v) => updateCf('favorites', { submitWorkflow: v })}
                label="Submit workflow"
                hint="Client clicks 'Submit selection' when done; you're notified"
              />
            </FeatureBlock>

            <FeatureBlock
              label="Comments"
              checked={cf.comments?.enabled || false}
              onToggle={(v) => updateCf('comments', { enabled: v })}
            >
              <Toggle
                checked={cf.comments?.requireEmail || false}
                onChange={(v) => updateCf('comments', { requireEmail: v })}
                label="Require email"
              />
            </FeatureBlock>

            <FeatureBlock
              label="Purchase"
              checked={cf.purchase?.enabled || false}
              onToggle={(v) => updateCf('purchase', { enabled: v })}
            >
              <div>
                <div className="text-[10px] text-stone-400 mb-1">Default price per photo</div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-stone-400">{cf.purchase?.currency || 'USD'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="flex-1 border-b border-stone-200 p-0 pb-1 text-xs text-stone-700 outline-none focus:border-stone-500 bg-transparent"
                    placeholder="0.00"
                    value={cf.purchase?.defaultPrice ?? ''}
                    onChange={(e) =>
                      updateCf('purchase', {
                        defaultPrice: e.target.value === '' ? null : parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-stone-400 mb-1">Currency</div>
                <select
                  className="w-full text-xs text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent"
                  value={cf.purchase?.currency || 'USD'}
                  onChange={(e) => updateCf('purchase', { currency: e.target.value })}
                >
                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-stone-400">
                Override pricing per photo in the photo block inspector.
              </p>
            </FeatureBlock>

          </div>
        )}
      </>
    )
  })()}
</Section>
```

- [ ] **Commit**
```bash
git add components/admin/platform/PageSettingsPopover.js
git commit -m "feat: add client features section to PageSettingsPopover"
```

---

## Task 7: Clean up `PageSettingsPanel` — remove Advanced section, add settings gear

The sidebar panel keeps: Title, Description, Cover image, Slideshow toggle. Removes: Advanced section (slug + client features stub). Adds: gear icon to trigger the new popover.

**Files:**
- Modify: `components/admin/platform/PageSettingsPanel.js`

- [ ] **Remove the entire Advanced section** — delete lines 94–100 (the `border-t` div containing the Advanced button and its expanded content). The result: after the slideshow block, the panel closes its `expanded` content block.

The panel's `expanded` content area should end after the slideshow section:
```javascript
          {/* Slideshow */}
          <div className="border-t border-stone-100 pt-3">
            {/* ... slideshow toggle + gear ... */}
          </div>

        </div>  {/* end of expanded content */}
      )}
```

*(Delete the `{/* Advanced */}` block and everything inside it.)*

- [ ] **Add a settings gear icon button** to the panel header row alongside the brush icon. The header row (inside the `!isLink` branch) currently has: drag handle placeholder, title button, brush button, chevron button. Add a gear button between brush and chevron:

```javascript
        <button
          ref={settingsGearRef}
          onClick={onSettingsOpen}
          title="Page settings"
          className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
```

- [ ] **Add `settingsGearRef` and `onSettingsOpen` to the component props + internal refs:**

At the top of the component function, destructure two new props:
```javascript
export default function PageSettingsPanel({ page, onChange, onPickThumbnail, onPickCoverImage, username, assetsByUrl, settingsGearRef, onSettingsOpen }) {
```

*(The parent — `PageEditorSidebar` — will pass these in.)*

- [ ] **Commit**
```bash
git add components/admin/platform/PageSettingsPanel.js
git commit -m "feat(sidebar): remove Advanced section; add settings gear to PageSettingsPanel"
```

---

## Task 8: Wire `PageSettingsPopover` into `PageEditorSidebar`

**Files:**
- Modify: `components/admin/platform/PageEditorSidebar.js`

- [ ] **Add imports** at the top:
```javascript
import { useRef, useState } from 'react'   // useRef + useState already imported; just verify
import PageSettingsPopover from './PageSettingsPopover'
```

*(Check existing imports — `useState` is already imported. `useRef` is not yet imported in this file; add it.)*

- [ ] **Add state and ref** after the existing state declarations:
```javascript
const [settingsOpen, setSettingsOpen] = useState(false)
const settingsGearRef = useRef(null)
```

- [ ] **Pass gear ref and open handler to `PageSettingsPanel`** — in the `pageSettingsSlot` prop inside `BlockBuilder`:

```javascript
pageSettingsSlot={
  <PageSettingsPanel
    page={page}
    onChange={onPageChange}
    onPickThumbnail={handlePickThumbnail}
    onPickCoverImage={handlePickCoverImage}
    username={username}
    assetsByUrl={assetsByUrl}
    settingsGearRef={settingsGearRef}
    onSettingsOpen={() => setSettingsOpen(v => !v)}
  />
}
```

Also update the link-page branch (the early return for `page.type === 'link'`) to pass the same props:
```javascript
<PageSettingsPanel
  page={page}
  onChange={onPageChange}
  onPickThumbnail={null}
  onPickCoverImage={null}
  username={username}
  assetsByUrl={assetsByUrl}
  settingsGearRef={settingsGearRef}
  onSettingsOpen={() => setSettingsOpen(v => !v)}
/>
```

- [ ] **Render `PageSettingsPopover`** just before the closing `</>` of the main return (alongside `PhotoPickerModal`):

```javascript
{settingsOpen && (
  <PageSettingsPopover
    page={page}
    anchorEl={settingsGearRef.current}
    onUpdate={onPageChange}
    onClose={() => setSettingsOpen(false)}
    username={username}
  />
)}
```

- [ ] **Verify** — open the admin, select a page, click the gear icon in the Page Settings card. The popover should appear anchored below the gear, with URL/Thumbnail/Password/Client Features sections.

- [ ] **Commit**
```bash
git add components/admin/platform/PageEditorSidebar.js
git commit -m "feat: wire PageSettingsPopover into PageEditorSidebar"
```

---

## Task 9: Create `SiteSettingsPopover`

**Files:**
- Create: `components/admin/platform/SiteSettingsPopover.js`

- [ ] **Create the file**

```javascript
import { useState } from 'react'
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
        <div className="space-y-2">
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

      {/* ── Client defaults (shown when any page uses client features) ── */}
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
```

- [ ] **Commit**
```bash
git add components/admin/platform/SiteSettingsPopover.js
git commit -m "feat: add SiteSettingsPopover — identity, domain, contact, theme, analytics, client defaults"
```

---

## Task 10: Wire `SiteSettingsPopover` into `PlatformSidebar`

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js`

- [ ] **Add imports** at the top:
```javascript
import { useRef } from 'react'   // already imported — verify
import SiteSettingsPopover from './SiteSettingsPopover'
```

- [ ] **Add state and ref** after the existing state declarations (around line 26):
```javascript
const [siteSettingsOpen, setSiteSettingsOpen] = useState(false)
const siteSettingsGearRef = useRef(null)
```

- [ ] **Add gear icon to the sidebar header**. The current header renders (around lines 327–349): site name button, save badge, site menu (sign-out only). Add the gear icon button alongside the site name area:

```javascript
<button
  ref={siteSettingsGearRef}
  onClick={() => setSiteSettingsOpen(v => !v)}
  title="Site settings"
  className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
>
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
</button>
```

Place it immediately before the site menu button (the `⋯` or similar button that opens the sign-out menu) in the header row.

- [ ] **Render `SiteSettingsPopover`** at the bottom of the component return, before the final closing tag:

```javascript
{siteSettingsOpen && (
  <SiteSettingsPopover
    siteConfig={siteConfig}
    anchorEl={siteSettingsGearRef.current}
    onUpdate={onConfigChange}
    onClose={() => setSiteSettingsOpen(false)}
  />
)}
```

- [ ] **Also move the theme selector** out of the inline sidebar (lines ~351–363) since it now lives in SiteSettingsPopover. Remove the theme `<select>` from the sidebar body to avoid having two places to change theme.

  Find the theme selector section in PlatformSidebar and delete it. Verify the theme `<select>` only exists in SiteSettingsPopover now.

- [ ] **Verify** — open the admin, click the gear icon in the sidebar header. The site settings popover should appear with all sections. Changing site name triggers the 1.5 s autosave. Opening an existing site should show its current name/theme.

- [ ] **Commit**
```bash
git add components/admin/platform/PlatformSidebar.js
git commit -m "feat: wire SiteSettingsPopover into PlatformSidebar; remove inline theme selector"
```

---

## Task 11: Fix empty slugs + preserve slug auto-update

**Files:**
- Modify: `common/assetRefs.js` (normalizePageEntity)

When `page.slug` is empty, it should fall back to the auto-generated slug from the title. This fixes existing pages that were saved with empty slugs without requiring any user action.

- [ ] **Update `normalizePageEntity` in `common/assetRefs.js`** — after the `cover` normalization block, add slug normalization:

```javascript
import { slugify } from './pageUtils'

// ...inside normalizePageEntity, after the cover block:

const slug = page.slug || slugify(page.title || page.id || '')
```

Then in the return object, replace `...page` spread for slug with the computed value:

```javascript
return {
  ...page,
  type: page.type === 'link' ? 'link' : 'page',
  slug,                          // <-- use computed slug
  url: page.url || '',
  // ...rest of fields
}
```

*(Note: `siteConfig.js` imports `normalizePageEntity` from `assetRefs.js`, and `assetRefs.js` would now import `slugify` from `pageUtils.js`. Verify there's no circular dependency: `pageUtils.js` has no imports, so the chain is clean.)*

- [ ] **Verify** — in browser console on a page with an empty slug, check that opening the PageSettingsPopover shows a generated slug. The autosave should write the generated slug back to GCS on next save.

- [ ] **Commit**
```bash
git add common/assetRefs.js
git commit -m "fix: auto-generate slug from title in normalizePageEntity when slug is empty"
```

---

## Self-Review Checklist

- [x] **PageSettingsPopover** — URL, thumbnail (from page photos, auto/custom), password + gate message + noindex note, client features (master toggle → downloads/favorites/comments/purchase sub-blocks)
- [x] **SiteSettingsPopover** — identity (name, tagline, logo, favicon), domain (read-only current + custom), contact (7 social/contact fields), theme dropdown, analytics (GA + Plausible), client defaults (visible only when any page uses client features)
- [x] **Sidebar cleanup** — Advanced section removed, gear icon added to PageSettingsPanel header
- [x] **PopoverShell** — shared positioning/click-outside logic, no duplication
- [x] **Schema** — `defaultPage.clientFeatures` nested; site config extended; `normalizePageEntity` handles back-compat migration from flat clientFeatures
- [x] **Empty slugs** — fixed via normalizePageEntity fallback
- [x] **Thumbnail** — `getPagePhotos` + `pageDisplayThumbnail` fallback chain
- [x] **slugify** — extracted to `common/pageUtils.js`, client-safe
- [x] **Theme selector** — removed from PlatformSidebar inline, consolidated into SiteSettingsPopover
- [x] **No new server-side APIs needed** — all changes are admin-client UI writing to existing page/siteConfig save endpoints
