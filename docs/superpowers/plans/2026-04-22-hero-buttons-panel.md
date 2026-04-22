# Hero Buttons Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move button management from PageSettingsPopover into the hero panel (PageSettingsPanel), with typed buttons (URL / Slideshow / Client Login), drag-to-reorder, and block-level button styling in PageDesignPopover.

**Architecture:** Simplify `cover.buttons` items to `{ type, label, href }` (no per-button style). Add `cover.buttonStyle` as a block-level field. PageSettingsPanel gains a Buttons section below Description with drag handles, a type picker, locked rows, and an informational Links row. PageCover renders buttons directly without auto-injection (except resolving slideshowHref for slideshow-type buttons). PageDesignPopover shows button style options when buttons exist.

**Tech Stack:** React, Tailwind CSS, HTML5 Drag and Drop API

---

## File Structure

**Modified:**
- `common/assetRefs.js` — normalizer: button shape `{type,label,href}`, add `cover.buttonStyle`
- `__tests__/common/normalizePageEntity.test.js` — update tests for new shape + add buttonStyle tests
- `components/image-displays/page/PageCover.js` — remove auto-injection, use `cover.buttonStyle`
- `components/admin/platform/PageEditorSidebar.js` — compute + pass `hasChildPages` to PageSettingsPanel
- `components/admin/platform/PageSettingsPanel.js` — add Buttons section with drag/drop
- `components/admin/platform/PageSettingsPopover.js` — remove Custom Buttons ToggleRow + drill-in
- `components/admin/platform/PageDesignPopover.js` — add buttonStyle picker when buttons present
- `pages/admin/index.js` — remove `clientFeaturesEnabled` prop from PageCover
- `pages/sites/[username]/index.js` — remove `clientFeaturesEnabled` prop from PageCover
- `pages/sites/[username]/[slug].js` — remove `clientFeaturesEnabled` prop from PageCover

---

## Task 1: Update normalizer + tests

**Files:**
- Modify: `common/assetRefs.js`
- Modify: `__tests__/common/normalizePageEntity.test.js`

The cover normalizer is in `common/assetRefs.js`. The relevant section starts around line 168. The current button shape is `{ label, href, style }`. The new shape is `{ type: 'url'|'slideshow'|'client-login', label, href }`. We add `cover.buttonStyle: 'solid'|'outline'|'ghost'` as a block-level field, defaulting to `'solid'`.

- [ ] **Step 1: Update the normalizer**

In `common/assetRefs.js`, find the cover normalization section (search for `normalizeBtn`). Replace it with:

```js
const BUTTON_TYPES = ['url', 'slideshow', 'client-login']
const normalizeBtn = (b) => {
  if (!b?.label) return null
  return {
    type: BUTTON_TYPES.includes(b.type) ? b.type : 'url',
    label: b.label,
    href: b.href || '',
  }
}

let buttons
if (Array.isArray(cover.buttons)) {
  buttons = cover.buttons.map(normalizeBtn).filter(Boolean)
} else if (cover.buttons === undefined && (cover.primaryCta || cover.secondaryCta)) {
  buttons = [
    cover.primaryCta?.label ? { type: 'url', label: cover.primaryCta.label, href: cover.primaryCta.href || '' } : null,
    cover.secondaryCta?.label ? { type: 'url', label: cover.secondaryCta.label, href: cover.secondaryCta.href || '' } : null,
  ].filter(Boolean)
} else {
  buttons = []
}

const BUTTON_STYLES = ['solid', 'outline', 'ghost']
const buttonStyle = BUTTON_STYLES.includes(cover.buttonStyle) ? cover.buttonStyle : 'solid'

cover = {
  imageUrl: cover.imageUrl || '',
  height: cover.height === 'partial' ? 'partial' : 'full',
  overlayText: cover.overlayText || '',
  variant: cover.variant === 'cover' ? 'cover' : 'showcase',
  buttons,
  buttonStyle,
}
```

- [ ] **Step 2: Run existing tests to see what breaks**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest --no-coverage __tests__/common/normalizePageEntity.test.js 2>&1 | tail -30
```

Expected: several failures because tests assert `style` on button items.

- [ ] **Step 3: Rewrite the affected tests**

Replace the full content of `__tests__/common/normalizePageEntity.test.js` with:

```js
import { normalizePageEntity } from '../../common/assetRefs'

describe('normalizePageEntity — back-compat migration', () => {
  it('migrates legacy thumbnail image-ref to { imageUrl, useCover: false }', () => {
    const p = normalizePageEntity({
      thumbnail: { assetId: 'ast_1', url: 'https://x/t.jpg' },
      blocks: [],
    })
    expect(p.thumbnail).toEqual({ imageUrl: 'https://x/t.jpg', useCover: false })
    expect(p.thumbnailUrl).toBe('https://x/t.jpg')
  })

  it('migrates legacy thumbnail=null + thumbnailUrl=string', () => {
    const p = normalizePageEntity({
      thumbnail: null,
      thumbnailUrl: 'https://x/t.jpg',
      blocks: [],
    })
    expect(p.thumbnail).toEqual({ imageUrl: 'https://x/t.jpg', useCover: false })
  })

  it('preserves the new thumbnail shape', () => {
    const p = normalizePageEntity({
      thumbnail: { imageUrl: 'https://x/t.jpg', useCover: false },
      blocks: [],
    })
    expect(p.thumbnail).toEqual({ imageUrl: 'https://x/t.jpg', useCover: false })
  })

  it('defaults useCover=true when nothing is set', () => {
    const p = normalizePageEntity({ blocks: [] })
    expect(p.thumbnail).toEqual({ imageUrl: '', useCover: true })
  })

  it('defaults parentId, showInNav, sortOrder, password on legacy data', () => {
    const p = normalizePageEntity({ id: 'old', title: 'Old', blocks: [] })
    expect(p.parentId).toBeNull()
    expect(p.showInNav).toBe(true)
    expect(p.sortOrder).toBe(0)
    expect(p.password).toBe('')
  })

  it('normalizes cover when present, defaulting height/buttonStyle and buttons to []', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'https://x/c.jpg' }, blocks: [] })
    expect(p.cover).toEqual({
      imageUrl: 'https://x/c.jpg',
      height: 'full',
      overlayText: '',
      variant: 'showcase',
      buttons: [],
      buttonStyle: 'solid',
    })
  })

  it('clamps unknown cover.height values to "full"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', height: 'weird' }, blocks: [] })
    expect(p.cover.height).toBe('full')
  })

  it('preserves cover.height="partial"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', height: 'partial' }, blocks: [] })
    expect(p.cover.height).toBe('partial')
  })

  it('leaves cover null when absent', () => {
    const p = normalizePageEntity({ blocks: [] })
    expect(p.cover).toBeNull()
  })

  it('defaults cover.variant to "showcase" when absent', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x' }, blocks: [] })
    expect(p.cover.variant).toBe('showcase')
  })

  it('preserves cover.variant="cover"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', variant: 'cover' }, blocks: [] })
    expect(p.cover.variant).toBe('cover')
  })

  it('clamps unknown cover.variant to "showcase"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', variant: 'banner' }, blocks: [] })
    expect(p.cover.variant).toBe('showcase')
  })

  it('defaults cover.buttons to [] when absent', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x' }, blocks: [] })
    expect(p.cover.buttons).toEqual([])
  })

  it('defaults cover.buttonStyle to "solid" when absent', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x' }, blocks: [] })
    expect(p.cover.buttonStyle).toBe('solid')
  })

  it('preserves valid cover.buttonStyle', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', buttonStyle: 'outline' }, blocks: [] })
    expect(p.cover.buttonStyle).toBe('outline')
  })

  it('clamps unknown cover.buttonStyle to "solid"', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'x', buttonStyle: 'fancy' }, blocks: [] })
    expect(p.cover.buttonStyle).toBe('solid')
  })

  it('preserves cover.buttons array with typed buttons', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        variant: 'cover',
        buttons: [
          { type: 'url', label: 'View', href: '/portfolio' },
          { type: 'slideshow', label: 'Start Slideshow', href: '' },
          { type: 'client-login', label: 'Client Login', href: '#client-login' },
        ],
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([
      { type: 'url', label: 'View', href: '/portfolio' },
      { type: 'slideshow', label: 'Start Slideshow', href: '' },
      { type: 'client-login', label: 'Client Login', href: '#client-login' },
    ])
  })

  it('defaults unknown button type to "url"', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', buttons: [{ label: 'Click', href: '/x' }] },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ type: 'url', label: 'Click', href: '/x' }])
  })

  it('normalizes button with missing href', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', buttons: [{ type: 'url', label: 'Click' }] },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ type: 'url', label: 'Click', href: '' }])
  })

  it('filters out buttons with no label', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        buttons: [
          { type: 'url', label: '', href: '/x' },
          { type: 'url', label: 'Keep', href: '' },
        ],
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ type: 'url', label: 'Keep', href: '' }])
  })

  it('migrates legacy primaryCta/secondaryCta to url buttons array', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        variant: 'cover',
        primaryCta: { label: 'View', href: '/portfolio' },
        secondaryCta: { label: 'Contact', href: '#contact' },
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([
      { type: 'url', label: 'View', href: '/portfolio' },
      { type: 'url', label: 'Contact', href: '#contact' },
    ])
    expect(p.cover.primaryCta).toBeUndefined()
    expect(p.cover.secondaryCta).toBeUndefined()
  })

  it('migrates legacy primaryCta only (no secondaryCta)', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', primaryCta: { label: 'Click' } },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ type: 'url', label: 'Click', href: '' }])
  })

  it('ignores legacy CTAs when buttons array already present', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        buttons: [{ type: 'url', label: 'New', href: '/new' }],
        primaryCta: { label: 'Old', href: '/old' },
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ type: 'url', label: 'New', href: '/new' }])
  })

  it('treats cover.buttons=null as empty (does not trigger legacy migration)', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', buttons: null, primaryCta: { label: 'Old', href: '/old' } },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([])
  })

  it('passes through an explicitly empty buttons array without triggering migration', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', buttons: [], primaryCta: { label: 'Old', href: '/old' } },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([])
  })
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest --no-coverage __tests__/common/normalizePageEntity.test.js 2>&1 | tail -10
```

Expected: all 24 tests passing.

- [ ] **Step 5: Run all tests to check for regressions**

```bash
npx jest --no-coverage 2>&1 | tail -6
```

Expected: same 4 pre-existing failures, 142+ passing (new tests add to total).

- [ ] **Step 6: Commit**

```bash
git add common/assetRefs.js __tests__/common/normalizePageEntity.test.js
git commit -m "feat: buttons typed {type,label,href} + cover.buttonStyle block-level field"
```

---

## Task 2: Update PageCover

**Files:**
- Modify: `components/image-displays/page/PageCover.js`

Remove auto-injection of slideshow/client-login buttons. Render `cover.buttons` directly, resolving `href` by type. Use `cover.buttonStyle` for all buttons. Remove `clientFeaturesEnabled` prop.

- [ ] **Step 1: Rewrite PageCover**

Replace the full file with:

```jsx
// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'

const BUTTON_STYLE_MAP = {
  solid: 'bg-white text-stone-900 hover:bg-stone-100',
  outline: 'border border-white text-white hover:bg-white/10',
  ghost: 'text-white hover:bg-white/10',
}

function CtaButton({ button, style }) {
  if (!button?.label) return null
  const href = button.href || '#'
  const isExternal = href.startsWith('http')
  return (
    <a
      href={href}
      className={`inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors ${BUTTON_STYLE_MAP[style] || BUTTON_STYLE_MAP.solid}`}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {button.label}
    </a>
  )
}

export default function PageCover({ cover, title, description, slideshowHref }) {
  if (!cover || !cover.imageUrl) return null
  const heightClass = cover.height === 'partial' ? 'h-[60vh]' : 'h-[100vh]'
  const isCover = cover.variant === 'cover'
  const buttonStyle = cover.buttonStyle || 'solid'

  const buttons = (cover.buttons || [])
    .filter(b => b.type !== 'slideshow' || !!slideshowHref)
    .filter(b => !!b.label)
    .map(b => ({
      ...b,
      href: b.type === 'slideshow'
        ? slideshowHref
        : b.type === 'client-login'
          ? '#client-login'
          : b.href,
    }))

  return (
    <section className={`relative w-full ${heightClass} overflow-hidden`}>
      <img
        src={getSizedUrl(cover.imageUrl, 'large') || cover.imageUrl}
        alt={cover.overlayText || title || ''}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {isCover && (
        <div className="absolute inset-0 bg-black/30" />
      )}
      {isCover && (
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
          {title && <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-3">{title}</h2>}
          {description && <p className="text-base md:text-lg text-white/80 max-w-xl mb-8">{description}</p>}
          {buttons.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {buttons.map((btn, i) => <CtaButton key={i} button={btn} style={buttonStyle} />)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Remove clientFeaturesEnabled from callers**

In `pages/admin/index.js`, find the PageCover render call and remove the `clientFeaturesEnabled` prop. Keep `slideshowHref`.

In `pages/sites/[username]/index.js`, do the same.

In `pages/sites/[username]/[slug].js`, do the same.

- [ ] **Step 3: Run tests**

```bash
npx jest --no-coverage 2>&1 | tail -6
```

Expected: same pass/fail as before.

- [ ] **Step 4: Commit**

```bash
git add components/image-displays/page/PageCover.js pages/admin/index.js pages/sites/[username]/index.js "pages/sites/[username]/[slug].js"
git commit -m "feat: PageCover renders typed buttons with block-level buttonStyle, no auto-injection"
```

---

## Task 3: Add Buttons section to PageSettingsPanel

**Files:**
- Modify: `components/admin/platform/PageEditorSidebar.js`
- Modify: `components/admin/platform/PageSettingsPanel.js`

PageSettingsPanel needs a `hasChildPages` boolean prop. PageEditorSidebar computes it from `siteConfig.pages`.

- [ ] **Step 1: Pass hasChildPages from PageEditorSidebar**

In `components/admin/platform/PageEditorSidebar.js`, add this line after `const pages = siteConfig?.pages || []`:

```js
const hasChildPages = pages.some(p => p.parentId === page.id)
```

Then pass it to both PageSettingsPanel usages (link branch and pageSettingsSlot):

```jsx
// link branch (line ~173):
<PageSettingsPanel page={page} onChange={onPageChange} hasChildPages={hasChildPages} />

// pageSettingsSlot:
<PageSettingsPanel
  page={page}
  onChange={onPageChange}
  hasChildPages={hasChildPages}
/>
```

- [ ] **Step 2: Rewrite PageSettingsPanel**

Replace the full file with:

```jsx
// components/admin/platform/PageSettingsPanel.js
import { useState, useRef } from 'react'
import { generatePageId } from '../../../common/siteConfig'
import PageDesignPopover from './PageDesignPopover'

const DRAG_HANDLE = (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
  </svg>
)

export default function PageSettingsPanel({ page, onChange, hasChildPages }) {
  const [expanded, setExpanded] = useState(true)
  const [designOpen, setDesignOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const brushRef = useRef(null)
  const dragIndex = useRef(null)

  function update(patch) {
    onChange({ ...page, ...patch })
  }

  function updateTitle(title) {
    const prevDerived = generatePageId(page.title || '')
    const slug = (page.slug && page.slug !== prevDerived) ? page.slug : generatePageId(title || '')
    update({ title, slug })
  }

  function updateCover(patch) {
    update({
      cover: {
        imageUrl: '',
        height: 'full',
        overlayText: '',
        variant: 'showcase',
        buttonStyle: 'solid',
        buttons: [],
        ...(page.cover || {}),
        ...patch,
      },
    })
  }

  function updateButton(i, patch) {
    const btns = [...(page.cover?.buttons || [])]
    btns[i] = { ...btns[i], ...patch }
    updateCover({ buttons: btns })
  }

  function removeButton(i) {
    const btns = (page.cover?.buttons || []).filter((_, idx) => idx !== i)
    updateCover({ buttons: btns })
  }

  function hasButtonType(type) {
    return (page.cover?.buttons || []).some(b => b.type === type)
  }

  function addButton(type) {
    const defaults = {
      url: { type: 'url', label: '', href: '' },
      slideshow: { type: 'slideshow', label: 'Start Slideshow', href: '' },
      'client-login': { type: 'client-login', label: 'Client Login', href: '#client-login' },
    }
    const btns = [...(page.cover?.buttons || []), defaults[type]]
    updateCover({ buttons: btns })
    setPickerOpen(false)
  }

  function handleDragStart(i) { dragIndex.current = i }
  function handleDragOver(e) { e.preventDefault() }
  function handleDrop(i) {
    const from = dragIndex.current
    if (from === null || from === i) return
    const btns = [...(page.cover?.buttons || [])]
    const [moved] = btns.splice(from, 1)
    btns.splice(i, 0, moved)
    updateCover({ buttons: btns })
    dragIndex.current = null
  }

  const isLink = page.type === 'link'
  const buttons = page.cover?.buttons || []
  const canAddMore = buttons.length < 4

  const inputCls = 'w-full border-b border-stone-200 p-0 pb-0.5 text-xs text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent'

  // ── Link page ──────────────────────────────────────────────────────────────
  if (isLink) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg shadow-sm mb-1.5">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-stone-50"
        >
          <span className="text-xs font-semibold text-stone-600 flex-1 text-left tracking-wide">Link Settings</span>
          <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {expanded && (
          <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-4">
            <div>
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Label</div>
              <input
                className="w-full border-b border-stone-200 p-0 pb-1 text-sm font-medium text-stone-800 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                placeholder="Link label"
                value={page.title || ''}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            <div>
              <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">URL</div>
              <input
                type="url"
                autoFocus={!page.url}
                className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                placeholder="https://…"
                value={page.url || ''}
                onChange={(e) => update({ url: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Page: hero editor ──────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm mb-1.5">
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <span className="text-white text-sm leading-none select-none flex-shrink-0" aria-hidden>⠿</span>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs font-semibold text-stone-600 tracking-wide flex-1 text-left hover:text-stone-900 transition-colors"
        >
          {page.title || 'Page Hero'}
        </button>

        <button
          ref={brushRef}
          onClick={() => setDesignOpen(v => !v)}
          title="Page design"
          className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
        </button>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-stone-300 hover:text-stone-500 transition-colors flex-shrink-0"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-4">
          {/* Title */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Title</div>
            <input
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm font-medium text-stone-800 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Page title"
              value={page.title || ''}
              onChange={(e) => updateTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Description</div>
            <textarea
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-600 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Optional"
              rows={2}
              value={page.description || ''}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>

          {/* Buttons */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Buttons</div>

            {/* Informational Links row */}
            {hasChildPages && (
              <div className="flex items-center gap-2 py-1.5 border-b border-stone-100">
                <span className="w-3 flex-shrink-0" />
                <span className="flex-1 text-xs text-stone-400 italic">Links (auto)</span>
              </div>
            )}

            {/* Stored buttons */}
            {buttons.map((btn, i) => {
              const isLocked = btn.type === 'client-login' && !!page.clientFeatures?.enabled
              return (
                <div
                  key={i}
                  draggable={!isLocked}
                  onDragStart={() => !isLocked && handleDragStart(i)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(i)}
                  className="flex items-start gap-2 py-1.5 border-b border-stone-100 last:border-b-0"
                >
                  <div className={`mt-1 flex-shrink-0 text-stone-300 ${isLocked ? 'opacity-0 pointer-events-none' : 'cursor-grab'}`}>
                    {DRAG_HANDLE}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      className={inputCls}
                      placeholder={
                        btn.type === 'slideshow' ? 'Start Slideshow'
                        : btn.type === 'client-login' ? 'Client Login'
                        : 'Button label'
                      }
                      value={btn.label}
                      readOnly={isLocked}
                      onChange={(e) => !isLocked && updateButton(i, { label: e.target.value })}
                    />
                    {btn.type === 'url' && (
                      <input
                        className={inputCls}
                        placeholder="URL or #anchor"
                        value={btn.href}
                        onChange={(e) => updateButton(i, { href: e.target.value })}
                      />
                    )}
                    {btn.type !== 'url' && (
                      <div className="text-[10px] text-stone-400">
                        {btn.type === 'slideshow' ? 'Slideshow link' : 'Client login'}
                      </div>
                    )}
                  </div>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => removeButton(i)}
                      className="mt-0.5 flex-shrink-0 text-stone-300 hover:text-red-400 transition-colors text-base leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}

            {/* Add button + picker */}
            {canAddMore && (
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(v => !v)}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                >
                  + Add button
                </button>
                {pickerOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-stone-200 shadow-sm rounded-md py-1 z-10 min-w-[140px]">
                    <button
                      type="button"
                      onClick={() => addButton('url')}
                      className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                    >
                      Custom URL
                    </button>
                    {page.slideshow?.enabled && !hasButtonType('slideshow') && (
                      <button
                        type="button"
                        onClick={() => addButton('slideshow')}
                        className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                      >
                        Slideshow
                      </button>
                    )}
                    {page.clientFeatures?.enabled && !hasButtonType('client-login') && (
                      <button
                        type="button"
                        onClick={() => addButton('client-login')}
                        className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                      >
                        Client Login
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {designOpen && (
        <PageDesignPopover
          page={page}
          onUpdate={onChange}
          onClose={() => setDesignOpen(false)}
          anchorEl={brushRef.current}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
npx jest --no-coverage 2>&1 | tail -6
```

Expected: same pass/fail.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/PageSettingsPanel.js components/admin/platform/PageEditorSidebar.js
git commit -m "feat: add Buttons section to PageSettingsPanel with drag handles and type picker"
```

---

## Task 4: Remove Custom Buttons from PageSettingsPopover

**Files:**
- Modify: `components/admin/platform/PageSettingsPopover.js`

Remove the "Custom buttons" `ToggleRow` from the main view, the `view === 'buttons'` drill-in block, and all button helper functions (`addButton`, `removeButton`, `updateButton`, `autoButtonLabels`) that are no longer used. Update the view state comment.

- [ ] **Step 1: Remove the buttons ToggleRow from the main view**

Find and delete this block in the main view return:

```jsx
      <ToggleRow
        checked={(page.cover?.buttons || []).length > 0}
        onToggle={(v) => {
          if (v) addButton()
          else update({ cover: { ...(page.cover || {}), buttons: [] } })
        }}
        label="Custom buttons"
        actionLabel={(page.cover?.buttons || []).some(b => b.label) ? 'Edit' : 'Add'}
        onDrillIn={() => setView('buttons')}
      />
```

- [ ] **Step 2: Remove the `view === 'buttons'` drill-in block**

Find and delete the entire `if (view === 'buttons') { return (...) }` block.

- [ ] **Step 3: Remove unused button helpers**

Find and delete these functions from the component body:
- `function addButton() { ... }`
- `function removeButton(i) { ... }`
- `function updateButton(i, patch) { ... }`
- `const autoButtonLabels = ...`

- [ ] **Step 4: Update the view state comment**

Change:
```js
const [view, setView] = useState('main') // 'main' | 'slideshow' | 'client' | 'password' | 'buttons'
```
to:
```js
const [view, setView] = useState('main') // 'main' | 'slideshow' | 'client' | 'password'
```

- [ ] **Step 5: Run tests**

```bash
npx jest --no-coverage 2>&1 | tail -6
```

Expected: same pass/fail.

- [ ] **Step 6: Commit**

```bash
git add components/admin/platform/PageSettingsPopover.js
git commit -m "feat: remove Custom Buttons from PageSettingsPopover — managed in hero panel now"
```

---

## Task 5: Add button style to PageDesignPopover

**Files:**
- Modify: `components/admin/platform/PageDesignPopover.js`

Add a "Button style" section below "Cover height" that only renders when `page.cover?.buttons?.length > 0`. Options: Solid / Outline / Ghost. Writes to `cover.buttonStyle`.

- [ ] **Step 1: Add the button style section**

In `components/admin/platform/PageDesignPopover.js`, inside the `<div className="px-3 py-3 space-y-4">`, add this block after the existing "Cover height" section:

```jsx
        {/* Button style */}
        {(cover.buttons || []).length > 0 && (
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Button style</div>
            <div className="flex gap-1.5">
              {['solid', 'outline', 'ghost'].map(s => (
                <button
                  key={s}
                  onClick={() => update({ buttonStyle: s })}
                  className={`text-xs px-2.5 py-1 border transition-colors capitalize ${
                    (cover.buttonStyle || 'solid') === s
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
```

- [ ] **Step 2: Run tests**

```bash
npx jest --no-coverage 2>&1 | tail -6
```

Expected: same pass/fail.

- [ ] **Step 3: Commit**

```bash
git add components/admin/platform/PageDesignPopover.js
git commit -m "feat: add button style picker to PageDesignPopover when buttons present"
```

---

## Self-Review

**Spec coverage:**
- ✅ Buttons section in hero panel below description
- ✅ Drag handles for reorder
- ✅ Button types: URL (label + href), Slideshow (label only), Client Login (locked when cf enabled)
- ✅ Links informational row when page has child pages (non-deletable)
- ✅ Max 4 buttons
- ✅ No per-button style — block-level `cover.buttonStyle` in PageDesignPopover
- ✅ Remove Custom Buttons from PageSettingsPopover
- ✅ PageCover simplified (no auto-injection, uses buttonStyle)
- ✅ `clientFeaturesEnabled` prop removed from PageCover callers
- ✅ Normalizer updated + all tests rewritten
- ✅ `hasChildPages` computed in PageEditorSidebar and passed down

**Placeholder scan:** None found.

**Type consistency:**
- `cover.buttons` items: `{ type: 'url'|'slideshow'|'client-login', label, href }` used consistently across normalizer, PageCover, PageSettingsPanel
- `cover.buttonStyle`: `'solid'|'outline'|'ghost'` used consistently in normalizer, PageDesignPopover, PageCover
- `hasChildPages` prop: boolean, passed from PageEditorSidebar → PageSettingsPanel ✅
