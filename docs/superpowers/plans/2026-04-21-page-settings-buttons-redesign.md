# Page Settings Buttons Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tabbed PageSettingsPopover with a flat scroll panel using inline toggles and drill-in sub-views, migrate CTA buttons from the hero editor into settings as a `cover.buttons` array, and add auto-injected slideshow/client buttons in PageCover.

**Architecture:** The `cover.buttons` array (each item: `{label, href, style: 'solid'|'outline'}`) replaces the `primaryCta`/`secondaryCta` fields. PageCover auto-injects slideshow and client login buttons at render time based on props — not stored in data. PageSettingsPopover uses a `view` state (`'main' | 'slideshow' | 'client'`) to drive drill-in sub-views within the same PopoverShell.

**Tech Stack:** React, Next.js (pages router), Tailwind CSS, Jest

---

## File Structure

**Modified:**
- `common/assetRefs.js` — normalizer: migrate primaryCta/secondaryCta → buttons array (lines 168-180)
- `__tests__/common/normalizePageEntity.test.js` — update tests for new cover shape
- `components/admin/platform/PageSettingsPanel.js` — remove Primary/Secondary CTA fields (lines 157-195); keep title, description, variant toggle
- `components/admin/platform/PageSettingsPopover.js` — major restructure: flat panel + Privacy toggle + Slideshow/Client drill-ins + Buttons section
- `components/image-displays/page/PageCover.js` — render buttons array + auto-inject slideshow/client buttons; update `CtaButton`
- `pages/admin/index.js:309` — add `slideshowHref` and `clientFeaturesEnabled` props to PageCover
- `pages/sites/[username]/index.js:71` — same
- `pages/sites/[username]/[slug].js:74` — same

---

## Task 1: Migrate cover.buttons data model (normalizer + tests)

**Files:**
- Modify: `common/assetRefs.js` (lines 168-180)
- Modify: `__tests__/common/normalizePageEntity.test.js`

This task replaces `cover.primaryCta` / `cover.secondaryCta` with `cover.buttons` in the whitelist normalizer, and migrates old data on read. No UI changes yet.

- [ ] **Step 1: Read the current normalizer section**

Open `common/assetRefs.js` lines 168-180. The existing cover block uses `primaryCta`/`secondaryCta`. You'll replace it entirely.

- [ ] **Step 2: Write failing tests first**

In `__tests__/common/normalizePageEntity.test.js`, replace the entire file content with:

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

  it('normalizes cover when present, defaulting height to "full" and buttons to []', () => {
    const p = normalizePageEntity({ cover: { imageUrl: 'https://x/c.jpg' }, blocks: [] })
    expect(p.cover).toEqual({ imageUrl: 'https://x/c.jpg', height: 'full', overlayText: '', variant: 'showcase', buttons: [] })
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

  it('preserves cover.buttons array', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        variant: 'cover',
        buttons: [
          { label: 'View', href: '/portfolio', style: 'solid' },
          { label: 'Contact', href: '#contact', style: 'outline' },
        ],
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([
      { label: 'View', href: '/portfolio', style: 'solid' },
      { label: 'Contact', href: '#contact', style: 'outline' },
    ])
  })

  it('normalizes button with missing href and defaults style to "outline"', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        buttons: [{ label: 'Click' }],
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ label: 'Click', href: '', style: 'outline' }])
  })

  it('filters out buttons with no label', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        buttons: [{ label: '', href: '/x', style: 'solid' }, { label: 'Keep', href: '', style: 'solid' }],
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ label: 'Keep', href: '', style: 'solid' }])
  })

  it('migrates legacy primaryCta/secondaryCta to buttons array', () => {
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
      { label: 'View', href: '/portfolio', style: 'solid' },
      { label: 'Contact', href: '#contact', style: 'outline' },
    ])
    expect(p.cover.primaryCta).toBeUndefined()
    expect(p.cover.secondaryCta).toBeUndefined()
  })

  it('migrates legacy primaryCta only (no secondaryCta)', () => {
    const p = normalizePageEntity({
      cover: { imageUrl: 'x', primaryCta: { label: 'Click' } },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ label: 'Click', href: '', style: 'solid' }])
  })

  it('ignores legacy CTAs when buttons array already present', () => {
    const p = normalizePageEntity({
      cover: {
        imageUrl: 'x',
        buttons: [{ label: 'New', href: '/new', style: 'solid' }],
        primaryCta: { label: 'Old', href: '/old' },
      },
      blocks: [],
    })
    expect(p.cover.buttons).toEqual([{ label: 'New', href: '/new', style: 'solid' }])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/common/normalizePageEntity.test.js --no-coverage 2>&1 | tail -20
```

Expected: Several tests fail because the normalizer still uses `primaryCta`/`secondaryCta`.

- [ ] **Step 4: Update the normalizer in assetRefs.js**

In `common/assetRefs.js`, replace lines 168-180 (the `let cover = ...` block) with:

```js
  let cover = page.cover || null;
  if (cover) {
    const normalizeBtn = (b) =>
      b && b.label ? { label: b.label, href: b.href || '', style: b.style === 'solid' ? 'solid' : 'outline' } : null

    let buttons
    if (Array.isArray(cover.buttons)) {
      buttons = cover.buttons.map(normalizeBtn).filter(Boolean)
    } else {
      // Migrate legacy primaryCta/secondaryCta
      const legacy = [
        cover.primaryCta?.label ? { label: cover.primaryCta.label, href: cover.primaryCta.href || '', style: 'solid' } : null,
        cover.secondaryCta?.label ? { label: cover.secondaryCta.label, href: cover.secondaryCta.href || '', style: 'outline' } : null,
      ].filter(Boolean)
      buttons = legacy
    }

    cover = {
      imageUrl: cover.imageUrl || '',
      height: cover.height === 'partial' ? 'partial' : 'full',
      overlayText: cover.overlayText || '',
      variant: cover.variant === 'cover' ? 'cover' : 'showcase',
      buttons,
    };
  }
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest __tests__/common/normalizePageEntity.test.js --no-coverage 2>&1 | tail -10
```

Expected: All tests pass (green).

- [ ] **Step 6: Commit**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
git add common/assetRefs.js __tests__/common/normalizePageEntity.test.js
git commit -m "refactor: migrate cover.primaryCta/secondaryCta to cover.buttons array"
```

---

## Task 2: Remove CTA fields from PageSettingsPanel

**Files:**
- Modify: `components/admin/platform/PageSettingsPanel.js`

The `variant === 'cover'` conditional block containing Primary/Secondary CTA inputs (current lines 157-195) gets removed. The variant toggle (Showcase/Cover segmented control) stays — it still controls hero style. Buttons are now configured in settings.

- [ ] **Step 1: Open the file and identify the block to remove**

Read `components/admin/platform/PageSettingsPanel.js`. The block to delete is:

```js
{variant === 'cover' && (
  <>
    <div>
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">Primary button</div>
      <div className="space-y-1.5">
        <input ... value={page.cover?.primaryCta?.label || ''} ... />
        <input ... value={page.cover?.primaryCta?.href || ''} ... />
      </div>
    </div>

    <div>
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">Secondary button</div>
      <div className="space-y-1.5">
        <input ... value={page.cover?.secondaryCta?.label || ''} ... />
        <input ... value={page.cover?.secondaryCta?.href || ''} ... />
      </div>
    </div>
  </>
)}
```

Also remove the now-unused helpers `updateCover` and `updateCta` (currently defined just after `updateTitle`), since the CTA inputs that called them are gone. The `variant` constant stays (used by the segmented control).

- [ ] **Step 2: Edit the file**

The resulting expanded page section should look exactly like this (replacing the entire block from the `{expanded && (` div down to its closing tag):

```jsx
      {expanded && (
        <div className="px-3 pb-3 border-t border-stone-100 pt-3 space-y-4">
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Title</div>
            <input
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm font-medium text-stone-800 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Page title"
              value={page.title || ''}
              onChange={(e) => updateTitle(e.target.value)}
            />
          </div>
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

          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5">Style</div>
            <div className="inline-flex rounded-md border border-stone-200 overflow-hidden text-xs">
              {[
                { value: 'showcase', label: 'Showcase' },
                { value: 'cover',    label: 'Cover'    },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ cover: { ...(page.cover || {}), variant: value } })}
                  className={`px-3 py-1 transition-colors ${
                    variant === value
                      ? 'bg-stone-800 text-white'
                      : 'bg-white text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mt-1">
              {variant === 'cover'
                ? 'Full-viewport landing with call-to-action buttons.'
                : 'Image with title and gallery links below.'}
            </p>
          </div>
        </div>
      )}
```

Note: The `update({ cover: { ...(page.cover || {}), variant: value } })` inline is the replacement for `updateCover({ variant: value })` since we're removing `updateCover`. Also remove the `updateCover` and `updateCta` function definitions and the `const variant = ...` line — instead put `const variant = page.cover?.variant || 'showcase'` right before the return statement (it's still needed).

The full file after the edit (reference for the implementer — write this exactly):

```js
// components/admin/platform/PageSettingsPanel.js
import { useState, useRef } from 'react'
import { generatePageId } from '../../../common/siteConfig'
import PageDesignPopover from './PageDesignPopover'

export default function PageSettingsPanel({ page, onChange }) {
  const [expanded, setExpanded] = useState(true)
  const [designOpen, setDesignOpen] = useState(false)
  const brushRef = useRef(null)

  function update(patch) {
    onChange({ ...page, ...patch })
  }

  function updateTitle(title) {
    const prevDerived = generatePageId(page.title || '')
    const slug = (page.slug && page.slug !== prevDerived) ? page.slug : generatePageId(title || '')
    update({ title, slug })
  }

  const variant = page.cover?.variant || 'showcase'

  const isLink = page.type === 'link'

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
          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Title</div>
            <input
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm font-medium text-stone-800 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Page title"
              value={page.title || ''}
              onChange={(e) => updateTitle(e.target.value)}
            />
          </div>
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

          <div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5">Style</div>
            <div className="inline-flex rounded-md border border-stone-200 overflow-hidden text-xs">
              {[
                { value: 'showcase', label: 'Showcase' },
                { value: 'cover',    label: 'Cover'    },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ cover: { ...(page.cover || {}), variant: value } })}
                  className={`px-3 py-1 transition-colors ${
                    variant === value
                      ? 'bg-stone-800 text-white'
                      : 'bg-white text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mt-1">
              {variant === 'cover'
                ? 'Full-viewport landing with call-to-action buttons.'
                : 'Image with title and gallery links below.'}
            </p>
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

- [ ] **Step 3: Verify no test regressions**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest --no-coverage 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/PageSettingsPanel.js
git commit -m "refactor: remove CTA fields from hero panel (buttons moved to page settings)"
```

---

## Task 3: Restructure PageSettingsPopover (flat panel + drill-ins + Buttons section)

**Files:**
- Modify: `components/admin/platform/PageSettingsPopover.js`

This is the largest task. The tabbed layout (`BASE_TABS`, `tab` state) is replaced with a flat scrollable panel. Privacy becomes a toggle. Slideshow and Client Features get row entries with a right-chevron drill-in. A new Buttons section manages `cover.buttons`.

The `view` state (`'main' | 'slideshow' | 'client'`) drives which content is shown inside the same `PopoverShell`.

- [ ] **Step 1: Write the full replacement file**

Replace `components/admin/platform/PageSettingsPopover.js` entirely with:

```js
import { useState } from 'react'
import { slugify } from '../../../common/pageUtils'
import { getPagePhotos } from '../../../common/assetRefs'
import { getSizedUrl } from '../../../common/imageUtils'
import { buildPreviewSequence, MUSIC_POOL, musicIdToUrl, musicUrlToId, randomMusicUrl } from '../../../common/slideshowSync'
import { resolveCaption } from '../../../common/captionResolver'
import PopoverShell from './PopoverShell'

function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-start gap-2 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 mt-0.5 ${checked ? 'bg-stone-700' : 'bg-stone-300'}`}>
        <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
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
          type="button"
          onClick={() => onToggle(!checked)}
          className={`w-7 h-[14px] rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-stone-700' : 'bg-stone-300'}`}
        >
          <div className={`absolute top-[2px] w-[10px] h-[10px] bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
        </button>
      </div>
      {checked && children && (
        <div className="pl-3 space-y-2 border-l border-stone-100">{children}</div>
      )}
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="px-3 py-3 border-b border-stone-100 last:border-b-0">
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2.5">{label}</div>
      {children}
    </div>
  )
}

function ChevronRight() {
  return (
    <svg className="w-3.5 h-3.5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function DrillHeader({ label, onBack }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100">
      <button
        type="button"
        onClick={onBack}
        className="text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-xs font-medium text-stone-700">{label}</span>
    </div>
  )
}

export default function PageSettingsPopover({ page, anchorEl, onUpdate, onClose, username, onPickThumbnail, assetsByUrl }) {
  const pagePhotos = getPagePhotos(page)
  const autoSlug = slugify(page.title || '')
  const displaySlug = page.slug || autoSlug
  const [slugDraft, setSlugDraft] = useState(null)
  const displayValue = slugDraft !== null ? slugDraft : displaySlug
  const [view, setView] = useState('main') // 'main' | 'slideshow' | 'client'

  // Slideshow local state
  const slideshow = page.slideshow || {}
  const [excluded, setExcluded] = useState(slideshow.excluded || [])
  const currentMusicId = musicUrlToId(slideshow.musicUrl || '')
  const isPoolTrack = MUSIC_POOL.some(t => t.id === currentMusicId)
  const [musicMode, setMusicMode] = useState(isPoolTrack || !slideshow.musicUrl ? 'pool' : 'custom')
  const [customMusicUrl, setCustomMusicUrl] = useState(!isPoolTrack ? (slideshow.musicUrl || '') : '')
  const [tooltip, setTooltip] = useState(null)

  function update(patch) {
    onUpdate({ ...page, ...patch })
  }

  function updateCf(key, patch) {
    const cf = page.clientFeatures || {}
    update({ clientFeatures: { ...cf, [key]: { ...(cf[key] || {}), ...patch } } })
  }

  function updateSlideshow(patch) {
    update({ slideshow: { ...slideshow, ...patch } })
  }

  function handleEnableSlideshow(enabled) {
    if (enabled && !slideshow.enabled) {
      const next = { ...slideshow, enabled: true, excluded: slideshow.excluded || [] }
      if (!next.musicUrl) next.musicUrl = randomMusicUrl()
      update({ slideshow: next })
    } else {
      updateSlideshow({ enabled })
    }
  }

  function toggleExcluded(url) {
    const next = excluded.includes(url) ? excluded.filter(u => u !== url) : [...excluded, url]
    setExcluded(next)
    updateSlideshow({ excluded: next })
  }

  function updateButton(index, patch) {
    const buttons = [...(page.cover?.buttons || [])]
    buttons[index] = { ...buttons[index], ...patch }
    update({ cover: { ...(page.cover || {}), buttons } })
  }

  function removeButton(index) {
    const buttons = (page.cover?.buttons || []).filter((_, i) => i !== index)
    update({ cover: { ...(page.cover || {}), buttons } })
  }

  function addButton() {
    const buttons = [...(page.cover?.buttons || []), { label: '', href: '', style: 'solid' }]
    update({ cover: { ...(page.cover || {}), buttons } })
  }

  const currentThumbUrl = page.thumbnail?.imageUrl || pagePhotos[0] || null
  const cf = page.clientFeatures || {}
  const canSlideshow = pagePhotos.length >= 6

  // Slideshow sequence (used in drill-in view)
  const rawSequence = buildPreviewSequence(page.blocks || [], excluded)
  const sequence = rawSequence.map(item =>
    item.type === 'image'
      ? { ...item, caption: resolveCaption({ url: item.url, caption: item.caption }, assetsByUrl || {}) }
      : item
  )
  const includedCount = sequence.filter(s => s.type === 'image' && !s.excluded).length
  const textCount = sequence.filter(s => s.type === 'text').length

  const autoButtonLabels = [
    slideshow.enabled && 'Start Slideshow',
    cf.enabled && 'Client Login',
  ].filter(Boolean)

  // ── Slideshow drill-in ────────────────────────────────────────────────────
  if (view === 'slideshow') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`}>
        <DrillHeader label="Slideshow" onBack={() => setView('main')} />

        <div className="px-3 py-3 border-b border-stone-100">
          <Toggle checked={slideshow.enabled || false} onChange={handleEnableSlideshow} label="Enable slideshow" disabled={!canSlideshow} hint={!canSlideshow ? 'Requires 6+ photos' : undefined} />
        </div>

        {slideshow.enabled && <>
          <div className="px-3 pt-3 space-y-3">
            <div>
              <div className="text-[10px] text-stone-400 mb-1">Theme</div>
              <select
                className="w-full border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-stone-500 bg-white"
                value={slideshow.layout || 'kenburns'}
                onChange={(e) => updateSlideshow({ layout: e.target.value })}
              >
                <option value="kenburns">Ken Burns</option>
                <option value="film-stack">Film Stack</option>
                <option value="film-single">Film Single</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] text-stone-400 mb-1">Music</div>
              <select
                className="w-full border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-stone-500 bg-white"
                value={musicMode === 'custom' ? '__custom__' : (currentMusicId || '')}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setMusicMode('custom')
                  } else {
                    setMusicMode('pool')
                    updateSlideshow({ musicUrl: musicIdToUrl(e.target.value) })
                  }
                }}
              >
                <option value="" disabled>Select a track…</option>
                {MUSIC_POOL.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                <option value="__custom__">Custom YouTube URL…</option>
              </select>
              {musicMode === 'custom' && (
                <input
                  type="text"
                  autoFocus
                  className="w-full border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-stone-500 mt-1.5"
                  placeholder="https://youtube.com/watch?v=…"
                  value={customMusicUrl}
                  onChange={(e) => { setCustomMusicUrl(e.target.value); updateSlideshow({ musicUrl: e.target.value }) }}
                />
              )}
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className="text-[10px] text-stone-400 mb-2">Sequence · {includedCount} image{includedCount !== 1 ? 's' : ''}{textCount > 0 ? ` · ${textCount} text` : ''}</div>
            {sequence.length === 0 ? (
              <div className="h-12 flex items-center justify-center text-[10px] text-stone-300 border border-dashed border-stone-200 rounded">
                Add blocks to populate the slideshow
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {sequence.map((item, i) => {
                  if (item.type === 'text') {
                    return (
                      <div
                        key={`text-${i}`}
                        onMouseEnter={(e) => { if (item.content) { const r = e.currentTarget.getBoundingClientRect(); setTooltip({ text: item.content, x: r.left + r.width / 2, y: r.top }) } }}
                        onMouseLeave={() => setTooltip(null)}
                        className="w-10 h-10 bg-stone-100 border border-stone-200 rounded flex items-center justify-center cursor-default flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                        </svg>
                      </div>
                    )
                  }
                  return (
                    <button
                      key={`img-${item.url}-${i}`}
                      onClick={() => toggleExcluded(item.url)}
                      onMouseEnter={(e) => { if (item.caption) { const r = e.currentTarget.getBoundingClientRect(); setTooltip({ text: item.caption, x: r.left + r.width / 2, y: r.top }) } }}
                      onMouseLeave={() => setTooltip(null)}
                      className={`relative group w-10 h-10 overflow-hidden rounded border flex-shrink-0 transition-all ${item.excluded ? 'opacity-25 border-stone-100' : 'opacity-100 border-stone-200'}`}
                    >
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity pointer-events-none">
                        {item.excluded ? (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>}

        {tooltip && (
          <div
            className="fixed z-[10000] px-2 py-1 bg-stone-800 text-white text-[10px] rounded pointer-events-none max-w-[200px] leading-snug"
            style={{ left: tooltip.x, top: tooltip.y - 6, transform: 'translate(-50%, -100%)' }}
          >
            {tooltip.text}
          </div>
        )}
      </PopoverShell>
    )
  }

  // ── Client features drill-in ──────────────────────────────────────────────
  if (view === 'client') {
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`}>
        <DrillHeader label="Client Features" onBack={() => setView('main')} />
        <div className="px-3 py-3 space-y-3">
          <Toggle
            checked={cf.enabled || false}
            onChange={(v) => update({ clientFeatures: { ...cf, enabled: v } })}
            label="Enable client features"
          />
          {cf.enabled && <>
            <div>
              <div className="text-[10px] text-stone-400 mb-1">Client password</div>
              <input
                type="text"
                className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                placeholder="Required to access client content"
                value={cf.password || ''}
                onChange={(e) => update({ clientFeatures: { ...cf, password: e.target.value } })}
                autoComplete="off"
              />
            </div>
            <div className="space-y-3">
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
                        const next = e.target.checked ? [...new Set([...cur, q])] : cur.filter(x => x !== q)
                        updateCf('downloads', { quality: next })
                      }}
                      className="rounded border-stone-300 text-stone-700 focus:ring-stone-500"
                    />
                    <span className="text-xs text-stone-600 capitalize">{q}</span>
                  </label>
                ))}
                <Toggle checked={cf.downloads?.requireEmail || false} onChange={(v) => updateCf('downloads', { requireEmail: v })} label="Require email to download" />
                <Toggle checked={cf.downloads?.watermarkEnabled || false} onChange={(v) => updateCf('downloads', { watermarkEnabled: v })} label="Watermark" />
              </FeatureBlock>

              <FeatureBlock
                label="Favorites"
                checked={cf.favorites?.enabled || false}
                onToggle={(v) => updateCf('favorites', { enabled: v })}
              >
                <Toggle checked={cf.favorites?.requireEmail || false} onChange={(v) => updateCf('favorites', { requireEmail: v })} label="Require email" />
                <Toggle checked={cf.favorites?.submitWorkflow || false} onChange={(v) => updateCf('favorites', { submitWorkflow: v })} label="Submit workflow" hint="Client clicks 'Submit selection' when done; you're notified" />
              </FeatureBlock>

              <FeatureBlock
                label="Comments"
                checked={cf.comments?.enabled || false}
                onToggle={(v) => updateCf('comments', { enabled: v })}
              >
                <Toggle checked={cf.comments?.requireEmail || false} onChange={(v) => updateCf('comments', { requireEmail: v })} label="Require email" />
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
                      type="number" min="0" step="0.01"
                      className="flex-1 border-b border-stone-200 p-0 pb-1 text-xs text-stone-700 outline-none focus:border-stone-500 bg-transparent"
                      placeholder="0.00"
                      value={cf.purchase?.defaultPrice ?? ''}
                      onChange={(e) => updateCf('purchase', { defaultPrice: e.target.value === '' ? null : parseFloat(e.target.value) })}
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
                    {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <p className="text-[10px] text-stone-400">Override pricing per photo in the photo block inspector.</p>
              </FeatureBlock>
            </div>
          </>}
        </div>
      </PopoverShell>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title={`${page.title || 'Page'} Settings`}>

      <Section label="URL">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-stone-400 flex-shrink-0 font-mono">{username}/</span>
          <input
            className="flex-1 border-b border-stone-200 p-0 pb-1 text-xs font-mono text-stone-700 outline-none focus:border-stone-500 bg-transparent min-w-0"
            value={displayValue}
            onChange={(e) => setSlugDraft(e.target.value)}
            onBlur={() => {
              const sanitized = slugify(slugDraft ?? displaySlug)
              setSlugDraft(null)
              update({ slug: sanitized })
            }}
            placeholder={autoSlug || 'page-url'}
            spellCheck={false}
          />
        </div>
      </Section>

      <Section label="Thumbnail">
        <div className="flex items-center gap-3">
          <div
            onClick={onPickThumbnail}
            className={`w-14 h-14 flex-shrink-0 overflow-hidden border border-stone-200 flex items-center justify-center bg-stone-50 ${onPickThumbnail ? 'cursor-pointer hover:border-stone-400 transition-colors' : ''}`}
          >
            {currentThumbUrl ? (
              <img
                src={getSizedUrl(currentThumbUrl, 'thumbnail')}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = currentThumbUrl }}
              />
            ) : (
              <span className="text-stone-300 text-lg">+</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {onPickThumbnail && (
              <button onClick={onPickThumbnail} className="text-xs text-stone-500 hover:text-stone-900 text-left">
                {currentThumbUrl ? 'Change…' : 'Select from library'}
              </button>
            )}
            {page.thumbnail?.imageUrl && (
              <button onClick={() => update({ thumbnail: null })} className="text-[10px] text-stone-400 hover:text-red-600 text-left">
                Reset to auto
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section label="Privacy">
        <Toggle
          checked={!!page.password?.trim()}
          onChange={(v) => {
            if (!v) update({ password: '', passwordGateMessage: '' })
            else update({ password: ' ' })
          }}
          label="Password protect"
        />
        {!!page.password?.trim() && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
              placeholder="Enter password"
              value={page.password.trim()}
              onChange={(e) => update({ password: e.target.value })}
              autoComplete="off"
              autoFocus
            />
            <textarea
              className="w-full border-b border-stone-200 p-0 pb-1 text-xs text-stone-600 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent resize-none"
              placeholder="Gate message (optional)"
              rows={2}
              value={page.passwordGateMessage || ''}
              onChange={(e) => update({ passwordGateMessage: e.target.value })}
            />
            <p className="text-[10px] text-stone-400">Not indexed by search engines.</p>
          </div>
        )}
      </Section>

      <Section label="Slideshow">
        <div className="flex items-center justify-between">
          <Toggle
            checked={slideshow.enabled || false}
            onChange={handleEnableSlideshow}
            label="Enable slideshow"
            disabled={!canSlideshow}
            hint={!canSlideshow ? 'Requires 6+ photos' : undefined}
          />
          {slideshow.enabled && (
            <button
              type="button"
              onClick={() => setView('slideshow')}
              className="flex-shrink-0 text-stone-400 hover:text-stone-700 transition-colors ml-2"
            >
              <ChevronRight />
            </button>
          )}
        </div>
      </Section>

      <Section label="Client Features">
        <div className="flex items-center justify-between">
          <Toggle
            checked={cf.enabled || false}
            onChange={(v) => update({ clientFeatures: { ...cf, enabled: v } })}
            label="Enable client features"
          />
          {cf.enabled && (
            <button
              type="button"
              onClick={() => setView('client')}
              className="flex-shrink-0 text-stone-400 hover:text-stone-700 transition-colors ml-2"
            >
              <ChevronRight />
            </button>
          )}
        </div>
      </Section>

      <Section label="Buttons">
        {(page.cover?.buttons || []).map((btn, i) => (
          <div key={i} className="flex items-start gap-1.5 mb-3">
            <div className="flex-1 space-y-1.5 min-w-0">
              <input
                className="w-full border-b border-stone-200 p-0 pb-1 text-sm text-stone-700 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                placeholder="Button label"
                value={btn.label}
                onChange={(e) => updateButton(i, { label: e.target.value })}
              />
              <input
                className="w-full border-b border-stone-200 p-0 pb-1 text-xs text-stone-500 outline-none focus:border-stone-500 placeholder:text-stone-300 bg-transparent"
                placeholder="URL or #anchor"
                value={btn.href}
                onChange={(e) => updateButton(i, { href: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1 items-end flex-shrink-0 pt-0.5">
              <button
                type="button"
                onClick={() => updateButton(i, { style: btn.style === 'solid' ? 'outline' : 'solid' })}
                className="text-[10px] text-stone-500 border border-stone-200 rounded px-1.5 py-0.5 hover:border-stone-400 transition-colors whitespace-nowrap"
              >
                {btn.style === 'solid' ? 'Solid' : 'Outline'}
              </button>
              <button
                type="button"
                onClick={() => removeButton(i)}
                className="text-stone-300 hover:text-red-400 transition-colors text-sm leading-none"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addButton}
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
        >
          + Add button
        </button>
        {autoButtonLabels.length > 0 && (
          <p className="text-[10px] text-stone-400 mt-2">
            Auto: {autoButtonLabels.join(' · ')}
          </p>
        )}
      </Section>

    </PopoverShell>
  )
}
```

- [ ] **Step 2: Verify no test regressions**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest --no-coverage 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/admin/platform/PageSettingsPopover.js
git commit -m "feat: restructure PageSettingsPopover — flat panel with Privacy toggle, Slideshow/Client drill-ins, Buttons section"
```

---

## Task 4: Update PageCover + callers

**Files:**
- Modify: `components/image-displays/page/PageCover.js`
- Modify: `pages/admin/index.js` (line 309)
- Modify: `pages/sites/[username]/index.js` (line 71)
- Modify: `pages/sites/[username]/[slug].js` (line 74)

PageCover now accepts `slideshowHref` (string|null) and `clientFeaturesEnabled` (boolean). It renders `cover.buttons` (custom) plus auto-injects slideshow/client buttons. Button style logic: if any custom button has style `'solid'`, auto buttons default to `'outline'`; otherwise the first auto button gets `'solid'`, the rest `'outline'`.

- [ ] **Step 1: Replace PageCover.js**

Write `components/image-displays/page/PageCover.js` in full:

```js
// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'

function CtaButton({ button }) {
  if (!button?.label) return null
  const href = button.href || '#'
  const isExternal = href.startsWith('http')
  const base = 'inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors'
  const style = button.style === 'solid'
    ? 'bg-white text-stone-900 hover:bg-stone-100'
    : 'border border-white text-white hover:bg-white/10'
  return (
    <a
      href={href}
      className={`${base} ${style}`}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {button.label}
    </a>
  )
}

export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled }) {
  if (!cover || !cover.imageUrl) return null
  const heightClass = cover.height === 'partial' ? 'h-[60vh]' : 'h-[100vh]'
  const isCover = cover.variant === 'cover'

  const customButtons = cover.buttons || []
  const hasSolid = customButtons.some(b => b.style === 'solid')

  const autoButtons = []
  if (slideshowHref) {
    autoButtons.push({ label: 'Start Slideshow', href: slideshowHref, style: hasSolid ? 'outline' : 'solid' })
  }
  if (clientFeaturesEnabled) {
    const firstAutoIsSolid = autoButtons.some(b => b.style === 'solid')
    autoButtons.push({ label: 'Client Login', href: '#client-login', style: (hasSolid || firstAutoIsSolid) ? 'outline' : 'solid' })
  }

  const allButtons = [...customButtons, ...autoButtons].filter(b => b.label)

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
          {allButtons.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {allButtons.map((btn, i) => <CtaButton key={i} button={btn} />)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Update admin/index.js (line 309)**

Read `pages/admin/index.js` around lines 297-310. The existing code has `slideshowHref` computed at line 297. Change line 309 from:

```jsx
<PageCover cover={selectedPage.cover} title={selectedPage.title} description={selectedPage.description} />
```

to:

```jsx
<PageCover
  cover={selectedPage.cover}
  title={selectedPage.title}
  description={selectedPage.description}
  slideshowHref={slideshowHref}
  clientFeaturesEnabled={selectedPage.clientFeatures?.enabled}
/>
```

- [ ] **Step 3: Update pages/sites/[username]/index.js (line 71)**

Read the file around lines 62-75. The existing code has `slideshowHref` at line 65. Change line 71 from:

```jsx
<PageCover cover={homePage?.cover} title={homePage?.title} description={homePage?.description} />
```

to:

```jsx
<PageCover
  cover={homePage?.cover}
  title={homePage?.title}
  description={homePage?.description}
  slideshowHref={slideshowHref}
  clientFeaturesEnabled={homePage?.clientFeatures?.enabled}
/>
```

- [ ] **Step 4: Update pages/sites/[username]/[slug].js (line 74)**

Read the file around lines 62-80. The existing code has `slideshowHref` at line 62. Change line 74 from:

```jsx
<PageCover cover={page.cover} title={page.title} description={page.description} />
```

to:

```jsx
<PageCover
  cover={page.cover}
  title={page.title}
  description={page.description}
  slideshowHref={slideshowHref}
  clientFeaturesEnabled={page.clientFeatures?.enabled}
/>
```

- [ ] **Step 5: Run all tests**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest --no-coverage 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/page/PageCover.js pages/admin/index.js "pages/sites/[username]/index.js" "pages/sites/[username]/[slug].js"
git commit -m "feat: render cover.buttons in PageCover with auto slideshow/client buttons"
```

---

## Self-Review

**Spec coverage:**
- ✅ Tabbed layout removed from PageSettingsPopover → flat panel
- ✅ Privacy as toggle (not select) → with conditional password input
- ✅ Slideshow as toggle + right-chevron drill-in
- ✅ Client Features as toggle + right-chevron drill-in
- ✅ CTA fields removed from PageSettingsPanel hero editor
- ✅ Buttons section in PageSettingsPopover: add/remove custom buttons with solid/outline style toggle
- ✅ Auto slideshow/client login buttons injected at render in PageCover
- ✅ Style priority: if custom solid button exists, auto buttons get outline; otherwise first auto gets solid
- ✅ `cover.buttons` normalizer replaces primaryCta/secondaryCta with migration path
- ✅ External links get `target="_blank" rel="noopener noreferrer"`

**Placeholder scan:** No TBDs, no "add appropriate handling", all code blocks complete.

**Type consistency:**
- `cover.buttons` array used consistently across normalizer, PageSettingsPopover (updateButton/removeButton/addButton), and PageCover (customButtons + allButtons)
- `slideshowHref` prop name matches computation in all three caller files
- `clientFeaturesEnabled` prop name consistent across PageCover signature and all callers
