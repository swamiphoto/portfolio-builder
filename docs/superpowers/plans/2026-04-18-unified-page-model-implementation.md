# Unified Page Model & Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement V1 of the unified page model — single `Page` type with page-level cover, slideshow, password, hierarchical nav, and reserved client-features/commerce hooks — per `docs/designs/2026-04-18-unified-page-model-spec.md`.

**Architecture:** Additive schema changes on the existing `siteConfig.pages[]` array. Sidebar refactors into two sections (Main Nav / Other Pages) with drag-to-reparent. Page Settings panel replaces "Page Info" and gains a paintbrush popover for cover. Existing slideshow components (`Slideshow.js` with `kenburns`, `film-stack`, `film-single` layouts) are reused; slideshow becomes a per-page setting with a dedicated `/sites/[username]/[slug]/slideshow` route. Public renderer (`pages/sites/[username].js`) is split to support per-page routes, hierarchical nav, cover hero, and password gating.

**Tech Stack:** Next.js (pages router), React, Tailwind CSS, Cloudflare R2 (via existing `gcsClient`), Jest + jsdom for tests, `@hello-pangea/dnd` for sidebar drag.

**Open question resolved:** Spec lists the third slideshow layout as TBD. Existing implementation has three layouts already: `kenburns`, `film-stack`, `film-single`. We use these IDs.

---

## File Structure

**New files:**

- `components/admin/platform/PageSettingsPanel.js` — collapsible Page Settings card; replaces the inline "Page Info" section in `BlockBuilder` for the page editor path.
- `components/admin/platform/PageDesignPopover.js` — paintbrush popover with cover image picker, height toggle, overlay text. Modeled after `components/admin/gallery-builder/DesignPopover.js`.
- `components/admin/platform/SidebarSection.js` — renders a labeled list of pages (Main Nav or Other Pages) with drag/drop and nesting.
- `components/image-displays/page/PageCover.js` — public-site hero component (full / partial viewport, optional overlay text).
- `components/image-displays/page/SiteNav.js` — public-site nav renderer (cover-embedded vs. header-dropdown variants).
- `common/navStyles.js` — pure helper mapping `theme` → `'cover-embedded' | 'header-dropdown'`.
- `common/pagesTree.js` — pure helpers: `buildNavTree(pages)`, `flattenForOtherPages(pages)`, `movePage(pages, pageId, { showInNav, parentId, sortOrder })`.
- `pages/sites/[username]/[slug].js` — per-page public route.
- `pages/sites/[username]/[slug]/slideshow.js` — per-page slideshow route.
- `pages/sites/[username]/index.js` — replaces `pages/sites/[username].js`; renders the home page.
- `__tests__/common/pagesTree.test.js`
- `__tests__/common/navStyles.test.js`
- `__tests__/common/siteConfig.unifiedModel.test.js`
- `__tests__/common/assetRefs.unifiedModel.test.js`

**Modified files:**

- `common/siteConfig.js` — add new fields to default page; expand `normalizePageEntity` (in `assetRefs.js`).
- `common/assetRefs.js` — extend `normalizePageEntity` to normalize `cover.imageUrl`, `thumbnail.useCover`, `slideshow.*`, `password`, `clientFeatures`, and `clientOnly` on blocks.
- `common/adminConfig.js` — extend library asset normalization to reserve `forSale`.
- `components/admin/platform/PageEditorSidebar.js` — render `<PageSettingsPanel>` above `<BlockBuilder>` (or wire the panel inside it).
- `components/admin/platform/PlatformSidebar.js` — restructure into two `<SidebarSection>` blocks; add reparent + cross-section drag.
- `components/admin/gallery-builder/BlockBuilder.js` — accept an optional `pageSettingsSlot` prop; when present, render it instead of the legacy "Gallery/Page Info" inline section.
- `pages/sites/[username].js` — convert to thin redirect / delete after `pages/sites/[username]/index.js` lands.
- `next.config.js` — only if needed for new routes (likely no change).

**Deleted / deprecated:**

- `components/admin/slideshow-builder/SlideshowBuilder.js` and `SlideshowSidebar.js` — kept for now; not removed in V1 (still reachable from `/admin/galleries/...` legacy routes). Out of scope to delete.

---

## Conventions for every task

- **TDD:** every task with logic adds the failing test first, runs it red, implements, runs it green, then commits.
- **Tests live under** `__tests__/` mirroring the source path.
- **Run tests:** `npm test -- --testPathPattern=<filename>` from the repo root.
- **Commit messages:** `feat(unified-pages): <one line>` or `refactor(unified-pages): <…>` or `test(unified-pages): <…>`.
- **Branch:** continue on `swamiphoto/build-roadmap` unless an executor decides otherwise.
- **Never edit `.env.local`.** All R2 access is mocked in tests.
- **Visual checks:** for UI-only tasks, the test step is "open `/admin` in a browser and verify the described interaction." Use `npm run dev` from a separate terminal.

---

## Task 1: Extend the Page schema with new fields and normalization

**Files:**
- Modify: `common/siteConfig.js` (lines 27–46)
- Modify: `common/assetRefs.js` (lines 117–128, `normalizePageEntity`)
- Test: `__tests__/common/siteConfig.unifiedModel.test.js` (new)

- [ ] **Step 1: Write failing tests for the expanded default page**

Create `__tests__/common/siteConfig.unifiedModel.test.js`:

```javascript
jest.mock('../../common/gcsClient', () => ({
  downloadJSON: jest.fn(),
  uploadJSON: jest.fn(),
}))
jest.mock('../../common/gcsUser', () => ({
  getUserSiteConfigPath: jest.fn(userId => `users/${userId}/site-config.json`),
}))

import { createDefaultSiteConfig } from '../../common/siteConfig'

describe('createDefaultSiteConfig — unified page model', () => {
  const home = createDefaultSiteConfig('user-1').pages[0]

  it('home page defaults parentId to null', () => {
    expect(home.parentId).toBeNull()
  })

  it('home page defaults sortOrder to 0', () => {
    expect(home.sortOrder).toBe(0)
  })

  it('home page defaults password to empty string (no password)', () => {
    expect(home.password).toBe('')
  })

  it('home page defaults cover to null', () => {
    expect(home.cover).toBeNull()
  })

  it('home page defaults thumbnail.useCover to true', () => {
    expect(home.thumbnail).toEqual({ imageUrl: '', useCover: true })
  })

  it('home page defaults slideshow disabled', () => {
    expect(home.slideshow).toEqual({
      enabled: false,
      layout: 'kenburns',
      musicUrl: '',
    })
  })

  it('home page reserves clientFeatures with all flags off', () => {
    expect(home.clientFeatures).toEqual({
      enabled: false,
      passwordHash: '',
      watermarkEnabled: false,
      votingEnabled: false,
      downloadEnabled: false,
    })
  })

  it('home page is not in main nav by default (existing behavior preserved)', () => {
    expect(home.showInNav).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test red**

Run: `npm test -- --testPathPattern=siteConfig.unifiedModel`
Expected: FAIL — `parentId`, `sortOrder`, `password`, `cover`, `slideshow`, `clientFeatures` not present; `thumbnail` is `null`, not an object.

- [ ] **Step 3: Update `createDefaultSiteConfig`**

Replace lines 27–46 of `common/siteConfig.js` with:

```javascript
export function createDefaultSiteConfig(userId) {
  return {
    userId,
    siteName: 'My Portfolio',
    slug: '',
    theme: 'minimal-light',
    customDomain: null,
    publishedAt: null,
    pages: [
      defaultPage({ id: 'home', title: 'Home', showInNav: false }),
    ],
  }
}

export function defaultPage(overrides = {}) {
  return {
    id: overrides.id || 'page',
    title: overrides.title || 'New Page',
    description: '',
    slug: overrides.id || 'page',
    parentId: null,
    showInNav: overrides.showInNav ?? true,
    sortOrder: overrides.sortOrder ?? 0,
    password: '',
    cover: null,
    thumbnail: { imageUrl: '', useCover: true },
    thumbnailUrl: '', // legacy mirror; kept for back-compat with normalizers
    slideshow: {
      enabled: false,
      layout: 'kenburns',
      musicUrl: '',
    },
    clientFeatures: {
      enabled: false,
      passwordHash: '',
      watermarkEnabled: false,
      votingEnabled: false,
      downloadEnabled: false,
    },
    blocks: [],
    ...overrides,
  }
}
```

- [ ] **Step 4: Update `normalizePageEntity` to preserve new fields**

In `common/assetRefs.js`, replace `normalizePageEntity` (around lines 117–128) with:

```javascript
export function normalizePageEntity(page) {
  // Back-compat: thumbnail used to be an image ref (or null). Detect and migrate.
  let thumbnail = page.thumbnail
  if (!thumbnail || typeof thumbnail !== 'object' || 'url' in thumbnail) {
    const ref = normalizeImageRef(page.thumbnail || page.thumbnailUrl)
    thumbnail = { imageUrl: ref?.url || '', useCover: !ref }
  } else {
    thumbnail = {
      imageUrl: thumbnail.imageUrl || '',
      useCover: thumbnail.useCover ?? true,
    }
  }

  let cover = page.cover || null
  if (cover) {
    cover = {
      imageUrl: cover.imageUrl || '',
      height: cover.height === 'partial' ? 'partial' : 'full',
      overlayText: cover.overlayText || '',
    }
  }

  return {
    ...page,
    parentId: page.parentId ?? null,
    showInNav: page.showInNav ?? true,
    sortOrder: page.sortOrder ?? 0,
    password: page.password || '',
    cover,
    thumbnail,
    thumbnailUrl: thumbnail.imageUrl, // legacy mirror, derived
    slideshow: {
      enabled: page.slideshow?.enabled ?? false,
      layout: page.slideshow?.layout || 'kenburns',
      musicUrl: page.slideshow?.musicUrl || '',
    },
    clientFeatures: {
      enabled: page.clientFeatures?.enabled ?? false,
      passwordHash: page.clientFeatures?.passwordHash || '',
      watermarkEnabled: page.clientFeatures?.watermarkEnabled ?? false,
      votingEnabled: page.clientFeatures?.votingEnabled ?? false,
      downloadEnabled: page.clientFeatures?.downloadEnabled ?? false,
    },
    blocks: (page.blocks || []).map((block) => normalizeBlockImageFields(block)),
  }
}
```

- [ ] **Step 5: Run the new test green**

Run: `npm test -- --testPathPattern=siteConfig.unifiedModel`
Expected: PASS

- [ ] **Step 6: Run the existing siteConfig + assetRefs tests to confirm nothing broke**

Run: `npm test -- --testPathPattern="siteConfig|assetRefs"`
Expected: All pass. The existing assertion `expect(config.pages[0].thumbnail).toBeNull()` in `__tests__/common/siteConfig.test.js` line 27 will fail under the new shape — update it to `expect(config.pages[0].thumbnail).toEqual({ imageUrl: '', useCover: true })`. Also update line 27's `thumbnailUrl` assertion (still `''`).

- [ ] **Step 7: Commit**

```bash
git add common/siteConfig.js common/assetRefs.js __tests__/common/siteConfig.unifiedModel.test.js __tests__/common/siteConfig.test.js
git commit -m "feat(unified-pages): extend Page schema with cover, slideshow, nav, password, reserved client features"
```

---

## Task 2: Reserve `clientOnly` on blocks and `forSale` on library assets

**Files:**
- Modify: `common/assetRefs.js` (`normalizeBlockImageFields`)
- Modify: `common/adminConfig.js`
- Test: `__tests__/common/assetRefs.unifiedModel.test.js` (new)

- [ ] **Step 1: Write failing tests**

Create `__tests__/common/assetRefs.unifiedModel.test.js`:

```javascript
import { normalizeBlockImageFields } from '../../common/assetRefs'

describe('normalizeBlockImageFields — clientOnly reserved', () => {
  it('defaults clientOnly to false when missing', () => {
    const out = normalizeBlockImageFields({ id: 'b1', type: 'photo', imageUrl: 'x' })
    expect(out.clientOnly).toBe(false)
  })

  it('preserves clientOnly when present', () => {
    const out = normalizeBlockImageFields({ id: 'b1', type: 'photo', imageUrl: 'x', clientOnly: true })
    expect(out.clientOnly).toBe(true)
  })
})
```

- [ ] **Step 2: Run red**

Run: `npm test -- --testPathPattern=assetRefs.unifiedModel`
Expected: FAIL — `clientOnly` undefined.

- [ ] **Step 3: Implement in `common/assetRefs.js`**

Find `normalizeBlockImageFields` and add `clientOnly: block.clientOnly ?? false` to the returned object for every branch (photo, photos/stacked/masonry, text, video, page-gallery). Keep all existing logic intact.

- [ ] **Step 4: Run green**

Run: `npm test -- --testPathPattern=assetRefs.unifiedModel`
Expected: PASS

- [ ] **Step 5: Reserve `forSale` in library asset normalization**

Open `common/adminConfig.js`. Find where library assets are read/written and add a `forSale: asset.forSale ?? false` mirror in the normalization (or in `readLibraryConfig` if normalization happens there). Add a sibling test in `__tests__/common/adminConfig.test.js` that loads a config with no `forSale` and expects `false`. Run: `npm test -- --testPathPattern=adminConfig`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add common/assetRefs.js common/adminConfig.js __tests__/common/assetRefs.unifiedModel.test.js __tests__/common/adminConfig.test.js
git commit -m "feat(unified-pages): reserve clientOnly on blocks and forSale on library assets"
```

---

## Task 3: Build the `pagesTree` helper for nav structure operations

**Files:**
- Create: `common/pagesTree.js`
- Test: `__tests__/common/pagesTree.test.js`

- [ ] **Step 1: Write failing tests**

Create `__tests__/common/pagesTree.test.js`:

```javascript
import { buildNavTree, flattenForOtherPages, movePage } from '../../common/pagesTree'

const pages = [
  { id: 'home',  title: 'Home',    parentId: null, showInNav: true,  sortOrder: 0 },
  { id: 'port',  title: 'Portfolio', parentId: null, showInNav: true, sortOrder: 1 },
  { id: 'land',  title: 'Landscapes', parentId: 'port', showInNav: true, sortOrder: 0 },
  { id: 'port2', title: 'Portraits', parentId: 'port', showInNav: true, sortOrder: 1 },
  { id: 'about', title: 'About',   parentId: null, showInNav: true, sortOrder: 2 },
  { id: 'bts',   title: 'Behind',  parentId: null, showInNav: false, sortOrder: 0 },
]

describe('buildNavTree', () => {
  it('returns roots in sortOrder with nested children', () => {
    const tree = buildNavTree(pages)
    expect(tree.map(n => n.id)).toEqual(['home', 'port', 'about'])
    expect(tree[1].children.map(n => n.id)).toEqual(['land', 'port2'])
  })

  it('skips pages with showInNav=false', () => {
    const tree = buildNavTree(pages)
    expect(tree.find(n => n.id === 'bts')).toBeUndefined()
  })

  it('treats orphans (parentId not in nav) as roots', () => {
    const orphan = [...pages, { id: 'x', title: 'Orphan', parentId: 'missing', showInNav: true, sortOrder: 99 }]
    const tree = buildNavTree(orphan)
    expect(tree.map(n => n.id)).toContain('x')
  })
})

describe('flattenForOtherPages', () => {
  it('returns showInNav=false pages as a flat list', () => {
    const list = flattenForOtherPages(pages)
    expect(list.map(p => p.id)).toEqual(['bts'])
  })
})

describe('movePage', () => {
  it('promotes a page out of nav and clears parentId', () => {
    const result = movePage(pages, 'land', { showInNav: false })
    const land = result.find(p => p.id === 'land')
    expect(land.showInNav).toBe(false)
    expect(land.parentId).toBeNull()
  })

  it('reparents a page within nav', () => {
    const result = movePage(pages, 'port2', { parentId: 'about' })
    expect(result.find(p => p.id === 'port2').parentId).toBe('about')
  })

  it('sets sortOrder when provided', () => {
    const result = movePage(pages, 'about', { sortOrder: 0 })
    expect(result.find(p => p.id === 'about').sortOrder).toBe(0)
  })

  it('does not force children to follow parent out of nav', () => {
    const result = movePage(pages, 'port', { showInNav: false })
    expect(result.find(p => p.id === 'land').showInNav).toBe(true)
    expect(result.find(p => p.id === 'land').parentId).toBeNull() // parent gone from nav, child orphaned
  })
})
```

- [ ] **Step 2: Run red**

Run: `npm test -- --testPathPattern=pagesTree`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `common/pagesTree.js`**

```javascript
// Pure helpers for the unified-page nav structure.
// `pages` is the flat array stored on siteConfig; the tree is derived.

export function buildNavTree(pages) {
  const nav = pages.filter(p => p.showInNav)
  const navIds = new Set(nav.map(p => p.id))
  const byParent = new Map()
  for (const p of nav) {
    const key = p.parentId && navIds.has(p.parentId) ? p.parentId : null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(p)
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }
  function build(parentId) {
    return (byParent.get(parentId) || []).map(p => ({
      ...p,
      children: build(p.id),
    }))
  }
  return build(null)
}

export function flattenForOtherPages(pages) {
  return pages
    .filter(p => !p.showInNav)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export function movePage(pages, pageId, patch) {
  const next = pages.map(p => {
    if (p.id !== pageId) return p
    const merged = { ...p, ...patch }
    if (patch.showInNav === false) merged.parentId = null
    return merged
  })

  // If a parent left the nav, orphan its children's parentId.
  if (patch.showInNav === false) {
    return next.map(p => (p.parentId === pageId ? { ...p, parentId: null } : p))
  }
  return next
}
```

- [ ] **Step 4: Run green**

Run: `npm test -- --testPathPattern=pagesTree`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add common/pagesTree.js __tests__/common/pagesTree.test.js
git commit -m "feat(unified-pages): add pagesTree helpers (buildNavTree, flattenForOtherPages, movePage)"
```

---

## Task 4: Build the `navStyles` helper

**Files:**
- Create: `common/navStyles.js`
- Test: `__tests__/common/navStyles.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
import { resolveNavStyle } from '../../common/navStyles'

describe('resolveNavStyle', () => {
  it('returns cover-embedded for minimal-light', () => {
    expect(resolveNavStyle('minimal-light')).toBe('cover-embedded')
  })
  it('returns cover-embedded for minimal-dark', () => {
    expect(resolveNavStyle('minimal-dark')).toBe('cover-embedded')
  })
  it('returns header-dropdown for editorial', () => {
    expect(resolveNavStyle('editorial')).toBe('header-dropdown')
  })
  it('falls back to cover-embedded for unknown themes', () => {
    expect(resolveNavStyle('made-up')).toBe('cover-embedded')
  })
})
```

- [ ] **Step 2: Run red, then implement**

Create `common/navStyles.js`:

```javascript
const THEME_NAV_STYLES = {
  'minimal-light': 'cover-embedded',
  'minimal-dark': 'cover-embedded',
  'editorial': 'header-dropdown',
}

export function resolveNavStyle(theme) {
  return THEME_NAV_STYLES[theme] || 'cover-embedded'
}
```

- [ ] **Step 3: Run green**

Run: `npm test -- --testPathPattern=navStyles`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add common/navStyles.js __tests__/common/navStyles.test.js
git commit -m "feat(unified-pages): add navStyles helper mapping theme to nav variant"
```

---

## Task 5: Build the `PageDesignPopover` for cover settings

**Files:**
- Create: `components/admin/platform/PageDesignPopover.js`
- Reference: `components/admin/gallery-builder/DesignPopover.js`

- [ ] **Step 1: Write the component**

```javascript
// components/admin/platform/PageDesignPopover.js
import { useRef, useEffect, useState } from 'react'
import { getSizedUrl } from '../../../common/imageUtils'

export default function PageDesignPopover({ page, onUpdate, onClose, anchorEl, onPickCoverImage }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const cover = page.cover || { imageUrl: '', height: 'full', overlayText: '' }

  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const popoverHeight = 320
    const spaceBelow = window.innerHeight - rect.bottom
    if (spaceBelow < popoverHeight) {
      setPos({ left: rect.left, bottom: window.innerHeight - rect.top + 4, top: 'auto' })
    } else {
      setPos({ left: rect.left, top: rect.bottom + 4 })
    }
  }, [anchorEl])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorEl && !anchorEl.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorEl])

  function update(patch) {
    onUpdate({ ...page, cover: { ...cover, ...patch } })
  }

  function clearCover() {
    onUpdate({ ...page, cover: null })
  }

  return (
    <div
      ref={ref}
      className="fixed bg-white border border-stone-200 shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-[9999]"
      style={{ width: 260, ...(pos || {}) }}
    >
      <div className="px-3 pt-2.5 pb-2 border-b border-stone-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-700 tracking-wide">Page Design</span>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-base leading-none">×</button>
      </div>

      <div className="px-3 py-3 space-y-4">
        {/* Cover image */}
        <div>
          <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Cover image</div>
          <div className="flex items-center gap-3">
            <div
              onClick={onPickCoverImage}
              className={`w-16 h-16 overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 cursor-pointer hover:border-stone-400 transition-colors ${cover.imageUrl ? '' : 'bg-stone-50'}`}
            >
              {cover.imageUrl ? (
                <img src={getSizedUrl(cover.imageUrl, 'thumbnail')} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-stone-300">+</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={onPickCoverImage} className="text-xs text-stone-700 hover:text-stone-900 text-left">
                {cover.imageUrl ? 'Change…' : 'Select from library'}
              </button>
              {cover.imageUrl && (
                <button onClick={clearCover} className="text-xs text-stone-400 hover:text-red-600 text-left">Remove cover</button>
              )}
            </div>
          </div>
        </div>

        {/* Height */}
        <div>
          <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Height</div>
          <div className="flex gap-1.5">
            {['full', 'partial'].map(h => (
              <button
                key={h}
                onClick={() => update({ height: h })}
                className={`text-xs px-2.5 py-1 border transition-colors ${
                  cover.height === h ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-400'
                }`}
              >
                {h === 'full' ? 'Full' : 'Partial'}
              </button>
            ))}
          </div>
        </div>

        {/* Overlay text */}
        <div>
          <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Overlay text</div>
          <input
            className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
            placeholder={page.title || 'Use page title'}
            value={cover.overlayText}
            onChange={(e) => update({ overlayText: e.target.value })}
          />
          <div className="text-[10px] text-stone-400 mt-1">Leave blank to use the page title.</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Visual smoke test**

Run `npm run dev` (separate terminal). The popover is not yet wired anywhere — verifying it renders is part of Task 6.

- [ ] **Step 3: Commit**

```bash
git add components/admin/platform/PageDesignPopover.js
git commit -m "feat(unified-pages): add PageDesignPopover for cover settings"
```

---

## Task 6: Build `PageSettingsPanel` and wire it into the page editor

**Files:**
- Create: `components/admin/platform/PageSettingsPanel.js`
- Modify: `components/admin/platform/PageEditorSidebar.js`
- Modify: `components/admin/gallery-builder/BlockBuilder.js` (add `pageSettingsSlot` prop, hide built-in info card when slot is supplied)

- [ ] **Step 1: Add `pageSettingsSlot` prop to `BlockBuilder`**

In `components/admin/gallery-builder/BlockBuilder.js`:

1. Add `pageSettingsSlot` to the destructured props (line 56–80).
2. Where the existing "Info card" is rendered (around lines 200–297), wrap it:

```javascript
{pageSettingsSlot ? pageSettingsSlot : (
  <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden mb-1.5">
    {/* …existing info card unchanged… */}
  </div>
)}
```

This preserves the legacy gallery editor while letting the page editor inject its own settings panel.

- [ ] **Step 2: Create `PageSettingsPanel`**

```javascript
// components/admin/platform/PageSettingsPanel.js
import { useState, useRef } from 'react'
import { getSizedUrl } from '../../../common/imageUtils'
import { generatePageId } from '../../../common/siteConfig'
import PageDesignPopover from './PageDesignPopover'

const SLIDESHOW_LAYOUTS = [
  { value: 'kenburns', label: 'Ken Burns' },
  { value: 'film-stack', label: 'Film Stack' },
  { value: 'film-single', label: 'Film Single' },
]

function Toggle({ checked, onChange, disabled, label, hint }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-start gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 mt-0.5 ${checked ? 'bg-stone-700' : 'bg-stone-300'}`}>
        <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
      </div>
      <div>
        <div className="text-xs text-stone-700 select-none leading-tight">{label}</div>
        {hint && <div className="text-[10px] text-stone-400 select-none leading-tight">{hint}</div>}
      </div>
    </div>
  )
}

export default function PageSettingsPanel({ page, onChange, onPickThumbnail, onPickCoverImage }) {
  const [expanded, setExpanded] = useState(true)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [designOpen, setDesignOpen] = useState(false)
  const brushRef = useRef(null)

  function update(patch) {
    onChange({ ...page, ...patch })
  }

  function updateTitle(title) {
    // Auto-regenerate slug only if user hasn't customized it (slug equals previous derived slug).
    const prevDerived = generatePageId(page.title || '')
    const slug = (page.slug && page.slug !== prevDerived) ? page.slug : generatePageId(title || '')
    update({ title, slug })
  }

  function updateSlideshow(patch) {
    update({ slideshow: { ...(page.slideshow || {}), ...patch } })
  }

  const cover = page.cover || null
  const thumbnail = page.thumbnail || { imageUrl: '', useCover: true }
  const effectiveThumbnailUrl = thumbnail.useCover ? (cover?.imageUrl || '') : (thumbnail.imageUrl || '')

  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden mb-1.5">
      <div className="w-full flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 flex-1 text-left hover:bg-stone-50 -mx-3 -my-2.5 px-3 py-2.5"
        >
          <span className="text-xs font-semibold text-stone-600 flex-1 tracking-wide">Page Settings</span>
          <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform ${expanded ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          ref={brushRef}
          onClick={() => setDesignOpen(v => !v)}
          title="Page design"
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-stone-100 text-stone-500"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
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

          {/* Thumbnail */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Thumbnail</div>
            <div className="flex items-center gap-3 pt-0.5">
              <div
                onClick={() => !thumbnail.useCover && onPickThumbnail()}
                className={`w-12 h-12 overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-200 ${thumbnail.useCover ? 'opacity-60' : 'cursor-pointer hover:border-stone-400'} ${effectiveThumbnailUrl ? '' : 'bg-stone-50'}`}
              >
                {effectiveThumbnailUrl ? (
                  <img src={getSizedUrl(effectiveThumbnailUrl, 'thumbnail')} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-stone-300">—</span>
                )}
              </div>
              <div className="flex-1">
                <Toggle
                  checked={thumbnail.useCover}
                  onChange={(v) => update({ thumbnail: { ...thumbnail, useCover: v, ...(v ? { imageUrl: '' } : {}) } })}
                  label="Use cover image"
                />
                {!thumbnail.useCover && (
                  <button onClick={onPickThumbnail} className="text-xs text-stone-500 hover:text-stone-900 mt-1">Select…</button>
                )}
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Password</div>
            <input
              type="text"
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Optional"
              value={page.password || ''}
              onChange={(e) => update({ password: e.target.value })}
            />
          </div>

          {/* Slideshow */}
          <div className="border-t border-stone-100 pt-3 space-y-2">
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Slideshow</div>
            <Toggle
              checked={page.slideshow?.enabled || false}
              onChange={(v) => updateSlideshow({ enabled: v })}
              label="Enable slideshow"
            />
            {page.slideshow?.enabled && (
              <>
                <div>
                  <div className="text-[10px] text-stone-400 mb-1">Layout</div>
                  <select
                    className="w-full border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-stone-500 bg-white"
                    value={page.slideshow?.layout || 'kenburns'}
                    onChange={(e) => updateSlideshow({ layout: e.target.value })}
                  >
                    {SLIDESHOW_LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] text-stone-400 mb-1">Music URL (YouTube)</div>
                  <input
                    type="text"
                    className="w-full border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-stone-500"
                    placeholder="https://youtube.com/…"
                    value={page.slideshow?.musicUrl || ''}
                    onChange={(e) => updateSlideshow({ musicUrl: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          {/* Client features (disabled) */}
          <div className="border-t border-stone-100 pt-3">
            <Toggle checked={false} disabled label="Client features" hint="Coming soon" />
          </div>

          {/* Advanced */}
          <div className="border-t border-stone-100 pt-2">
            <button onClick={() => setAdvancedOpen(v => !v)} className="text-[10px] font-medium text-stone-400 uppercase tracking-wider hover:text-stone-700">
              {advancedOpen ? '▼' : '▶'} Advanced
            </button>
            {advancedOpen && (
              <div className="mt-2">
                <div className="text-[10px] text-stone-400 mb-1">Slug</div>
                <input
                  className="w-full border-b border-stone-200 p-0 pb-1 text-xs font-mono text-stone-500 outline-none focus:border-stone-500 bg-transparent"
                  value={page.slug || ''}
                  onChange={(e) => update({ slug: e.target.value })}
                />
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
          onPickCoverImage={onPickCoverImage}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire into `PageEditorSidebar`**

Modify `components/admin/platform/PageEditorSidebar.js`:

1. Import `PageSettingsPanel`.
2. Add a state slot: `const [coverPickerOpen, setCoverPickerOpen] = useState(false)`.
3. Update `handlePhotoPickerConfirm` (around line 122) to handle a new sentinel `'cover'`:

```javascript
if (photoPickerBlockIndex === 'cover') {
  onPageChange({
    ...page,
    cover: { ...(page.cover || { height: 'full', overlayText: '' }), imageUrl: refs[0].url || refs[0] },
  })
  setPhotoPickerOpen(false); setPhotoPickerBlockIndex(null); return
}
```

4. Define `handlePickCoverImage = () => { setPhotoPickerBlockIndex('cover'); setPhotoPickerOpen(true); fetchLibrary() }`.
5. Pass `pageSettingsSlot={<PageSettingsPanel page={page} onChange={onPageChange} onPickThumbnail={handlePickThumbnail} onPickCoverImage={handlePickCoverImage} />}` to `<BlockBuilder>`.
6. Remove the now-redundant `infoLabel`, `namePlaceholder` props (BlockBuilder will not render its own info card when `pageSettingsSlot` is set).

- [ ] **Step 4: Manual visual check**

Run `npm run dev`. Open `/admin`, select a page. Verify:
- Header reads "Page Settings"; old "Page Info" gone.
- Paintbrush icon at top right of the panel opens the design popup.
- Cover image picker works; height + overlay text inputs save.
- Slideshow toggle reveals layout dropdown + music URL.
- Client features toggle is visibly disabled with "Coming soon" hint.
- Advanced disclosure reveals slug field.
- Saving works (Save badge in PlatformSidebar shows "Saved").

- [ ] **Step 5: Commit**

```bash
git add components/admin/platform/PageSettingsPanel.js components/admin/platform/PageEditorSidebar.js components/admin/gallery-builder/BlockBuilder.js
git commit -m "feat(unified-pages): add Page Settings panel with paintbrush design popover"
```

---

## Task 7: Restructure the sidebar into Main Nav and Other Pages sections

**Files:**
- Create: `components/admin/platform/SidebarSection.js`
- Modify: `components/admin/platform/PlatformSidebar.js`

- [ ] **Step 1: Create `SidebarSection`**

Renders a labeled list of pages with no drag wiring yet (drag is added in Task 8). Accepts pages, selection, click/menu callbacks; renders nested children recursively (nesting only used for Main Nav).

```javascript
// components/admin/platform/SidebarSection.js
export default function SidebarSection({ label, pages, depth = 0, renderRow }) {
  if (!pages.length && depth === 0) {
    return (
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        {label}
        <div className="text-xs font-normal normal-case text-stone-300 mt-1">Empty</div>
      </div>
    )
  }
  return (
    <div>
      {depth === 0 && (
        <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{label}</div>
      )}
      {pages.map(p => (
        <div key={p.id}>
          <div style={{ paddingLeft: depth * 12 }}>{renderRow(p)}</div>
          {p.children && p.children.length > 0 && (
            <SidebarSection label="" pages={p.children} depth={depth + 1} renderRow={renderRow} />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `PlatformSidebar` to render two sections**

In `components/admin/platform/PlatformSidebar.js`:

1. Import `buildNavTree` and `flattenForOtherPages` from `common/pagesTree`.
2. Replace the page list section (lines 144–226) with:

```javascript
{/* Main Nav */}
<div className="flex-1 overflow-y-auto">
  <SidebarSection
    label="Main Nav"
    pages={buildNavTree(pages)}
    renderRow={renderPageRow}
  />
  <SidebarSection
    label="Other Pages"
    pages={flattenForOtherPages(pages)}
    renderRow={renderPageRow}
  />
  <button
    onClick={handleAddPage}
    className="flex items-center w-full px-3 py-1.5 text-sm text-gray-400 rounded hover:bg-gray-50 mt-1 mx-2"
  >
    <span className="mr-1.5">+</span> Add Page
  </button>
</div>
```

3. Extract the existing per-page row markup (renaming, menu, drop target) into a `function renderPageRow(page) { … }` defined inside the component.

- [ ] **Step 3: Update `handleAddPage` defaults**

New pages should be `showInNav: true, parentId: null, sortOrder: <max+1>`. Already mostly true; ensure `sortOrder` is set:

```javascript
const sortOrder = Math.max(0, ...prev.pages.filter(p => p.showInNav).map(p => p.sortOrder ?? 0)) + 1
const newPage = { id, title, showInNav: true, parentId: null, sortOrder, /* …other defaults… */ }
```

For the new page object, prefer importing and calling `defaultPage({ id, title, sortOrder })` from `common/siteConfig.js` instead of inlining defaults.

- [ ] **Step 4: Visual check**

Run `npm run dev`. Verify two labeled sections render. The home page (default `showInNav: false`) appears in "Other Pages". Add a new page; it appears in "Main Nav".

- [ ] **Step 5: Commit**

```bash
git add components/admin/platform/SidebarSection.js components/admin/platform/PlatformSidebar.js
git commit -m "feat(unified-pages): split admin sidebar into Main Nav and Other Pages sections"
```

---

## Task 8: Implement drag between sections (toggles `showInNav`) and drag-to-reorder

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js`
- Modify: `components/admin/platform/SidebarSection.js`

- [ ] **Step 1: Add @hello-pangea/dnd wrapping**

Wrap each section's render with `<Droppable droppableId="main-nav" type="page">` and `<Droppable droppableId="other-pages" type="page">`. Wrap each row with `<Draggable draggableId={page.id} index={i} type="page">`. The dnd library is already a dependency (used in `BlockBuilder`).

For nested children, use a separate inner `<Droppable droppableId={parent.id} type="page">` so children are reorderable within the parent.

- [ ] **Step 2: Implement `onDragEnd` in `PlatformSidebar`**

```javascript
function handlePageDragEnd(result) {
  if (!result.destination) return
  const { draggableId: pageId, destination } = result
  const dest = destination.droppableId

  let patch
  if (dest === 'other-pages') {
    patch = { showInNav: false, sortOrder: destination.index }
  } else if (dest === 'main-nav') {
    patch = { showInNav: true, parentId: null, sortOrder: destination.index }
  } else {
    // dest is a page id (nesting under that parent)
    patch = { showInNav: true, parentId: dest, sortOrder: destination.index }
  }
  onConfigChange(prev => ({ ...prev, pages: movePage(prev.pages, pageId, patch) }))
}
```

Wrap the two sections in a single `<DragDropContext onDragEnd={handlePageDragEnd}>`.

- [ ] **Step 3: Manual test**

Run `npm run dev`. Verify:
- Drag a Main Nav page into Other Pages → it moves down, `showInNav` flips to false, `parentId` cleared.
- Drag a page from Other Pages into Main Nav → flips `showInNav: true`.
- Drag one Main Nav page onto another → it nests beneath.
- Reorder within a section → `sortOrder` persists across reload.
- Dragging a parent page out of Main Nav leaves children in Main Nav (orphaned, parentId null) — this matches `movePage` semantics from Task 3.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/PlatformSidebar.js components/admin/platform/SidebarSection.js
git commit -m "feat(unified-pages): drag pages between Main Nav, Other Pages, and as nested children"
```

---

## Task 9: Render the cover hero on the public page

**Files:**
- Create: `components/image-displays/page/PageCover.js`
- Modify: `pages/sites/[username].js` (or its replacement, see Task 11)

- [ ] **Step 1: Implement `PageCover`**

```javascript
// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'

export default function PageCover({ cover, title }) {
  if (!cover || !cover.imageUrl) return null
  const heightClass = cover.height === 'partial' ? 'h-[60vh]' : 'h-[100vh]'
  const overlay = cover.overlayText || title || ''
  return (
    <section className={`relative w-full ${heightClass} overflow-hidden`}>
      <img
        src={getSizedUrl(cover.imageUrl, 'large') || cover.imageUrl}
        alt={overlay}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-white text-3xl md:text-5xl font-light tracking-wide drop-shadow-lg text-center px-6">{overlay}</h1>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Render in the public page**

In `pages/sites/[username].js`, add `import PageCover from '../../components/image-displays/page/PageCover'` and render inside `<main>`:

```javascript
<main>
  <PageCover cover={homePage?.cover} title={homePage?.title} />
  {homePage ? <Gallery blocks={resolvedBlocks} pages={siteConfig.pages} /> : (/* empty */)}
</main>
```

- [ ] **Step 3: Manual visual check**

Set a cover on a page in admin, then visit `/sites/<username>` — confirm the cover renders above the blocks at full or partial height; overlay text matches input or falls back to title.

- [ ] **Step 4: Commit**

```bash
git add components/image-displays/page/PageCover.js pages/sites/[username].js
git commit -m "feat(unified-pages): render page cover on public site"
```

---

## Task 10: Wire page-level slideshow to existing Slideshow component

**Files:**
- Create: `pages/sites/[username]/[slug]/slideshow.js`
- Modify: `pages/sites/[username].js` (or its replacement after Task 11) — add "View slideshow" link

- [ ] **Step 1: Create the slideshow route**

```javascript
// pages/sites/[username]/[slug]/slideshow.js
import { lookupUserByUsername } from '../../../../common/userProfile'
import { readSiteConfig } from '../../../../common/siteConfig'
import Slideshow from '../../../../components/image-displays/slideshow/Slideshow'

function collectImages(blocks) {
  const urls = []
  for (const b of blocks || []) {
    if (b.type === 'photo' && b.imageUrl) urls.push(b.imageUrl)
    if ((b.type === 'photos' || b.type === 'stacked' || b.type === 'masonry')) {
      for (const u of (b.imageUrls || [])) urls.push(u)
    }
  }
  return urls
}

export async function getServerSideProps({ params }) {
  const { username, slug } = params
  const lookup = await lookupUserByUsername(username)
  if (!lookup) return { notFound: true }
  const siteConfig = await readSiteConfig(lookup.userId)
  if (!siteConfig) return { notFound: true }
  const page = siteConfig.pages.find(p => p.slug === slug || p.id === slug)
  if (!page || !page.slideshow?.enabled) return { notFound: true }
  return {
    props: {
      page: JSON.parse(JSON.stringify(page)),
      siteName: siteConfig.siteName || username,
    },
  }
}

export default function PageSlideshow({ page, siteName }) {
  const slides = collectImages(page.blocks).map(url => ({ type: 'image', url }))
  if (slides.length === 0) {
    return <div className="flex items-center justify-center h-screen text-stone-400">No images on this page.</div>
  }
  return (
    <Slideshow
      slides={slides}
      layout={page.slideshow?.layout || 'kenburns'}
      title={page.title}
      subtitle={page.description || siteName}
      youtubeUrl={page.slideshow?.musicUrl || ''}
      thumbnailUrl={page.cover?.imageUrl || page.thumbnail?.imageUrl || ''}
      slug={page.slug || page.id}
    />
  )
}
```

- [ ] **Step 2: Add "View slideshow" link on the public page**

In the public page (`pages/sites/[username].js` for now, will be the dynamic `[slug].js` after Task 11), add when `homePage.slideshow?.enabled`:

```jsx
<a href={`/sites/${username}/${homePage.slug || homePage.id}/slideshow`} className="text-sm text-stone-500 hover:text-stone-900 underline">
  View slideshow ↗
</a>
```

Place it near the cover or above the blocks; final placement is a small visual call.

- [ ] **Step 3: Manual test**

Enable slideshow on a page, set music + layout, visit `/sites/<username>/<slug>/slideshow`. Verify the existing Slideshow component renders with the chosen layout. Visit the page itself and click the "View slideshow" affordance.

- [ ] **Step 4: Commit**

```bash
git add pages/sites/ components/admin/platform/PageEditorSidebar.js
git commit -m "feat(unified-pages): page-level slideshow at /:username/:slug/slideshow"
```

---

## Task 11: Per-page public route + nav rendering

**Files:**
- Create: `pages/sites/[username]/index.js` (replaces existing `pages/sites/[username].js`)
- Create: `pages/sites/[username]/[slug].js`
- Create: `components/image-displays/page/SiteNav.js`
- Delete: `pages/sites/[username].js`

- [ ] **Step 1: Build `SiteNav`**

```javascript
// components/image-displays/page/SiteNav.js
import { buildNavTree } from '../../../common/pagesTree'
import { resolveNavStyle } from '../../../common/navStyles'

function NavList({ items, basePath, depth = 0 }) {
  return (
    <ul className={depth === 0 ? 'flex gap-6' : 'pl-4'}>
      {items.map(item => (
        <li key={item.id} className="relative group">
          <a href={`${basePath}/${item.slug || item.id}`} className="text-sm hover:underline">{item.title}</a>
          {item.children?.length > 0 && (
            <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-md p-2 min-w-[160px]">
              <NavList items={item.children} basePath={basePath} depth={depth + 1} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function SiteNav({ siteConfig, username, variant }) {
  const tree = buildNavTree(siteConfig.pages)
  const style = variant || resolveNavStyle(siteConfig.theme)
  const basePath = `/sites/${username}`
  if (style === 'header-dropdown') {
    return (
      <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-900">{siteConfig.siteName || username}</h1>
        <NavList items={tree} basePath={basePath} />
      </header>
    )
  }
  // cover-embedded — caller (PageCover overlay) handles placement; we expose the list as a small flat component too.
  return (
    <nav className="absolute top-6 right-6 text-white">
      <NavList items={tree} basePath={basePath} />
    </nav>
  )
}
```

- [ ] **Step 2: Move existing `[username].js` logic into `[username]/index.js`**

Create `pages/sites/[username]/index.js` with the same `getServerSideProps` as the old `[username].js` but render `<SiteNav />` and select the home page. Use `siteConfig.pages.find(p => p.id === 'home') || siteConfig.pages[0]`.

- [ ] **Step 3: Create `pages/sites/[username]/[slug].js`**

Same pattern: lookup user, read site config, find page by `slug` (fall back to `id`), render `<SiteNav />`, `<PageCover />`, `<Gallery />`. Apply the password gate from Task 12.

- [ ] **Step 4: Delete the old `pages/sites/[username].js`**

```bash
rm pages/sites/[username].js
```

- [ ] **Step 5: Manual test**

- `/sites/<username>` → home page renders with nav.
- `/sites/<username>/<slug>` → that page renders with nav.
- Switch theme to `editorial` in admin → nav becomes a header dropdown.
- Switch back to `minimal-light` → nav floats on cover.

- [ ] **Step 6: Commit**

```bash
git add pages/sites/ components/image-displays/page/SiteNav.js
git commit -m "feat(unified-pages): per-page public routes with theme-driven nav rendering"
```

---

## Task 12: Password gate for protected pages

**Files:**
- Modify: `pages/sites/[username]/[slug].js`
- Modify: `pages/sites/[username]/index.js`
- Create: `components/image-displays/page/PasswordGate.js`

- [ ] **Step 1: Build `PasswordGate`**

```javascript
// components/image-displays/page/PasswordGate.js
import { useState } from 'react'

export default function PasswordGate({ pageTitle, onUnlock }) {
  const [val, setVal] = useState('')
  const [error, setError] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (onUnlock(val)) return
    setError(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <h1 className="text-lg font-semibold text-stone-800">{pageTitle}</h1>
        <p className="text-sm text-stone-500">This page is protected.</p>
        <input
          type="password"
          autoFocus
          value={val}
          onChange={(e) => { setVal(e.target.value); setError(false) }}
          className={`w-full border ${error ? 'border-red-400' : 'border-stone-300'} rounded px-3 py-2 text-sm`}
          placeholder="Password"
        />
        {error && <div className="text-xs text-red-600">Incorrect password.</div>}
        <button type="submit" className="w-full bg-stone-900 text-white text-sm py-2 rounded">Continue</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Wire into the page route**

In `pages/sites/[username]/[slug].js`:

```javascript
import { useState } from 'react'
import PasswordGate from '../../../components/image-displays/page/PasswordGate'

export default function PublicPage({ page, siteConfig, username, assetsByUrl }) {
  const [unlocked, setUnlocked] = useState(!page.password)
  if (!unlocked) {
    return <PasswordGate pageTitle={page.title} onUnlock={(v) => { if (v === page.password) { setUnlocked(true); return true } return false }} />
  }
  // …existing render
}
```

Keep the password comparison client-side for V1 (matches the spec's "optional password" framing — not a security boundary; that's `clientFeatures` later). Document this in a one-line comment.

- [ ] **Step 3: Manual test**

Set a password on a page; visit it; confirm the gate appears, wrong password shows error, right password reveals content. Reload — gate reappears (state is in-memory; that's fine for V1).

- [ ] **Step 4: Commit**

```bash
git add components/image-displays/page/PasswordGate.js pages/sites/
git commit -m "feat(unified-pages): client-side password gate for protected pages"
```

---

## Task 13: Apply `thumbnail.useCover` sync in the page-gallery block thumbnails

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js` (or wherever `page-gallery` block thumbnails resolve)
- Search: `components/image-displays/` for any place that consumes `page.thumbnailUrl`

- [ ] **Step 1: Identify the consumers**

Run: `Grep` for `thumbnailUrl` in `components/`. The `page-gallery` block, `PageCard` previews, and any nav avatars all read this field.

- [ ] **Step 2: Add a derived selector**

In `common/assetRefs.js`, export a helper:

```javascript
export function pageDisplayThumbnail(page) {
  if (page.thumbnail?.useCover) return page.cover?.imageUrl || ''
  return page.thumbnail?.imageUrl || page.thumbnailUrl || ''
}
```

Add a unit test in `__tests__/common/assetRefs.unifiedModel.test.js`:

```javascript
import { pageDisplayThumbnail } from '../../common/assetRefs'

describe('pageDisplayThumbnail', () => {
  it('returns cover url when useCover is true', () => {
    expect(pageDisplayThumbnail({ thumbnail: { useCover: true }, cover: { imageUrl: 'C' } })).toBe('C')
  })
  it('falls back to explicit thumbnail when useCover is false', () => {
    expect(pageDisplayThumbnail({ thumbnail: { useCover: false, imageUrl: 'T' }, cover: { imageUrl: 'C' } })).toBe('T')
  })
  it('returns empty string when nothing is set', () => {
    expect(pageDisplayThumbnail({ thumbnail: { useCover: true }, cover: null })).toBe('')
  })
})
```

- [ ] **Step 3: Use the helper in consumers**

Replace `page.thumbnailUrl` reads in admin and public components with `pageDisplayThumbnail(page)`. Avoid changing the underlying schema field (keep `thumbnailUrl` as a legacy mirror for back-compat).

- [ ] **Step 4: Run tests + visual check**

```bash
npm test -- --testPathPattern=assetRefs
npm run dev
```

Verify a page with cover but no explicit thumbnail shows the cover image as its thumbnail in admin previews and on public `page-gallery` blocks.

- [ ] **Step 5: Commit**

```bash
git add common/assetRefs.js __tests__/common/assetRefs.unifiedModel.test.js components/
git commit -m "feat(unified-pages): apply thumbnail.useCover via pageDisplayThumbnail selector"
```

---

## Task 14: Final QA pass — end-to-end smoke test of V1 scope

**Files:** none (verification only)

- [ ] **Step 1: Spec checklist walk-through**

Open `docs/designs/2026-04-18-unified-page-model-spec.md` § V1 Scope (lines 236–249). For each numbered item, confirm:

1. Unified page model — no residual `gallery|single` branching in pages-side code (search remaining: `Grep` for `type: 'gallery'`, `type: 'single'`).
2. "Page Settings" panel — visible with paintbrush, structure matches spec.
3. Cover field + design popup.
4. `thumbnail.useCover` default on, falls back correctly.
5. Slideshow page-level setting; layout/music/ shareable URL all present.
6. Sidebar Main Nav / Other Pages with drag.
7. `parentId` nesting in Main Nav.
8. Password field on page; gate works.
9. Slug in Advanced; auto-generated from title.
10. `clientFeatures` reserved; toggle disabled "Coming soon".
11. `forSale` reserved on library asset.
12. Theme nav style respected on published nav.

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Visual smoke test**

Run `npm run dev`. Walk through:
- Add a page → appears in Main Nav.
- Drag it to Other Pages.
- Add a child page; nest it.
- Set a cover, password, and slideshow on a page.
- Visit the public site; verify nav, cover, password gate, slideshow link.
- Switch theme to `editorial`; verify header-dropdown nav.

- [ ] **Step 4: Update the spec status to "Implemented"**

In `docs/designs/2026-04-18-unified-page-model-spec.md` line 4, change `**Status:** Draft` to `**Status:** Implemented (V1)`.

- [ ] **Step 5: Final commit**

```bash
git add docs/designs/2026-04-18-unified-page-model-spec.md
git commit -m "docs(unified-pages): mark V1 spec as implemented"
```

---

## Self-review

**Spec coverage:**

| Spec V1 item | Task |
|---|---|
| 1. Unified page model | Tasks 1–2 + Task 14 audit |
| 2. Page Settings panel | Task 6 |
| 3. Cover + design popup | Tasks 5, 6, 9 |
| 4. `thumbnail.useCover` | Tasks 1, 13 |
| 5. Slideshow as page setting | Tasks 6, 10 |
| 6. Main Nav / Other Pages sections | Tasks 7, 8 |
| 7. `parentId` nesting | Tasks 3, 8, 11 |
| 8. Password field | Tasks 1, 12 |
| 9. Slug in Advanced | Task 6 |
| 10. `clientFeatures` reserved | Tasks 1, 6 (disabled toggle), 2 (`clientOnly`) |
| 11. `forSale` reserved | Task 2 |
| 12. Theme nav style | Tasks 4, 11 |

**Out-of-scope deferrals (per spec):** Client-features UI, commerce UI, proofing, purchase packs, library slideshow primitive, auto-curation, "linked from X" badge, custom slideshow ordering. None of these are tasks here.

**Open questions resolved:**
- Third slideshow layout name → `film-single` (existing).
- Cover + no blocks → renders cover full-bleed; below it, the gallery shows nothing (acceptable for V1).
