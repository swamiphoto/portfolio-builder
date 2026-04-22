# Cover Page + Button Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pinned "Cover" entry in the sidebar (mapped to the home page), and simplify PageCover buttons to auto-inject slideshow/client-login based on page settings — removing the explicit typed-buttons UI entirely.

**Architecture:** `hasCoverPage` is a siteConfig-level flag (default `true`). The home page (id `'home'`) is shown as a special pinned "Cover" entry above "Main Nav" in PlatformSidebar and filtered out of "Other Pages". PageCover drops `cover.buttons` reading and instead auto-builds from `slideshowHref` and `clientFeaturesEnabled` props. The normalizer keeps `cover.buttons` for backward compat but the UI no longer writes to it.

**Tech Stack:** Next.js (pages router), React, Tailwind CSS

---

## Files

| File | Change |
|------|--------|
| `common/siteConfig.js` | Add `hasCoverPage: true` to `createDefaultSiteConfig` |
| `components/admin/platform/PlatformSidebar.js` | Add Cover pinned row above Main Nav; filter home from Other Pages |
| `components/image-displays/page/PageCover.js` | Remove `cover.buttons` reading; add `clientFeaturesEnabled` prop; auto-build buttons |
| `components/admin/platform/PageDesignPopover.js` | Update button style condition from `cover.buttons.length > 0` to `slideshow.enabled \|\| clientFeatures.enabled` |
| `pages/admin/index.js` | Add `clientFeaturesEnabled` prop to `<PageCover>` |
| `pages/sites/[username]/index.js` | Add `clientFeaturesEnabled` prop to `<PageCover>` |
| `pages/sites/[username]/[slug].js` | Add `clientFeaturesEnabled` prop to `<PageCover>` |
| `components/admin/platform/PageSettingsPanel.js` | Remove Buttons section + all button helpers and state |

---

### Task 1: Add hasCoverPage to siteConfig + Cover pinned entry in PlatformSidebar

**Files:**
- Modify: `common/siteConfig.js`
- Modify: `components/admin/platform/PlatformSidebar.js`

- [ ] **Step 1: Add `hasCoverPage` to siteConfig defaults**

In `common/siteConfig.js`, add `hasCoverPage: true` to `createDefaultSiteConfig` right after the `slug` field:

```js
export function createDefaultSiteConfig(userId) {
  return {
    userId,
    siteName: 'My Portfolio',
    slug: '',
    hasCoverPage: true,        // ← add this line
    customDomain: null,
    tagline: '',
    logoType: 'sitename',
    logo: '',
    favicon: '',
    // ... rest unchanged
  }
}
```

- [ ] **Step 2: Add the Cover pinned row in PlatformSidebar**

In `components/admin/platform/PlatformSidebar.js`, find the `return (` block. The current pages section (around line 390) is:

```jsx
{/* Pages */}
<div className="flex-1 overflow-y-auto">
  <SidebarSection
    label="Main Nav"
    pages={buildNavTree(pages)}
    renderRow={renderPageRow}
    droppableId="main-nav"
  />
  <SidebarSection
    label="Other Pages"
    pages={flattenForOtherPages(pages)}
    renderRow={renderPageRow}
    droppableId="other-pages"
  />
</div>
```

Replace it with:

```jsx
{/* Pages */}
<div className="flex-1 overflow-y-auto">
  {/* Cover pinned entry — maps to home page */}
  {siteConfig.hasCoverPage !== false && (() => {
    const coverPage = pages.find(p => p.id === 'home')
    if (!coverPage) return null
    const isSelected = selectedPageId === coverPage.id
    return (
      <div className="px-2 pt-2 pb-1 border-b border-gray-200">
        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-3 mb-1">Cover</div>
        <div
          onClick={() => {
            if (didDragRef.current || pageDragRef.current) return
            onSelectPage?.(coverPage.id)
          }}
          className={`flex items-center px-3 py-1.5 rounded cursor-pointer group text-sm transition-colors ${
            isSelected ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex-1 truncate">Cover</span>
          <button
            onClick={e => {
              e.stopPropagation()
              if (pageSettingsId === coverPage.id) { setPageSettingsId(null); setPageSettingsAnchorEl(null) }
              else { setPageSettingsId(coverPage.id); setPageSettingsAnchorEl(e.currentTarget) }
            }}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-opacity"
            title="Page settings"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    )
  })()}
  <SidebarSection
    label="Main Nav"
    pages={buildNavTree(pages)}
    renderRow={renderPageRow}
    droppableId="main-nav"
  />
  <SidebarSection
    label="Other Pages"
    pages={flattenForOtherPages(pages).filter(p => siteConfig.hasCoverPage === false || p.id !== 'home')}
    renderRow={renderPageRow}
    droppableId="other-pages"
  />
</div>
```

- [ ] **Step 3: Verify in browser**

Start dev server (`npm run dev`). Open the admin. Confirm:
- "Cover" section appears above "Main Nav"
- Clicking "Cover" row selects the home page and opens the page editor
- The gear icon on hover opens PageSettingsPopover for the home page
- The home page no longer appears under "Other Pages"

- [ ] **Step 4: Commit**

```bash
git add common/siteConfig.js components/admin/platform/PlatformSidebar.js
git commit -m "feat: add hasCoverPage flag + Cover pinned entry above Main Nav"
```

---

### Task 2: PageCover — auto-inject buttons from props, update all callers

**Files:**
- Modify: `components/image-displays/page/PageCover.js`
- Modify: `components/admin/platform/PageDesignPopover.js`
- Modify: `pages/admin/index.js`
- Modify: `pages/sites/[username]/index.js`
- Modify: `pages/sites/[username]/[slug].js`

- [ ] **Step 1: Rewrite PageCover to auto-inject buttons**

Replace the entire contents of `components/image-displays/page/PageCover.js`:

```jsx
// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'

const BUTTON_STYLE_MAP = {
  solid: 'bg-white text-stone-900 hover:bg-stone-100',
  outline: 'border border-white text-white hover:bg-white/10',
  ghost: 'text-white hover:bg-white/10',
}

function CtaButton({ label, href, style }) {
  if (!label) return null
  const isExternal = href?.startsWith('http')
  return (
    <a
      href={href || '#'}
      className={`inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors ${BUTTON_STYLE_MAP[style] || BUTTON_STYLE_MAP.solid}`}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
    </a>
  )
}

export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled }) {
  if (!cover || !cover.imageUrl) return null
  const heightClass = cover.height === 'partial' ? 'h-[60vh]' : 'h-[100vh]'
  const isCover = cover.variant === 'cover'
  const buttonStyle = cover.buttonStyle || 'solid'

  const buttons = []
  if (slideshowHref) {
    buttons.push({ label: 'Start Slideshow', href: slideshowHref })
  }
  if (clientFeaturesEnabled) {
    buttons.push({ label: 'Client Login', href: '#client-login' })
  }

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
              {buttons.map((btn, i) => (
                <CtaButton key={i} label={btn.label} href={btn.href} style={buttonStyle} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Update PageDesignPopover button style condition**

In `components/admin/platform/PageDesignPopover.js`, find line 61:

```jsx
{(cover.buttons || []).length > 0 && (
```

Replace with:

```jsx
{(page.slideshow?.enabled || page.clientFeatures?.enabled) && (
```

- [ ] **Step 3: Add `clientFeaturesEnabled` to PageCover in `pages/admin/index.js`**

Find the `<PageCover>` call around line 318:

```jsx
<PageCover
      cover={selectedPage.cover}
      title={selectedPage.title}
      description={selectedPage.description}
      slideshowHref={slideshowHref}
    />
```

Replace with:

```jsx
<PageCover
  cover={selectedPage.cover}
  title={selectedPage.title}
  description={selectedPage.description}
  slideshowHref={slideshowHref}
  clientFeaturesEnabled={!!selectedPage.clientFeatures?.enabled}
/>
```

- [ ] **Step 4: Add `clientFeaturesEnabled` to PageCover in `pages/sites/[username]/index.js`**

Find the `<PageCover>` call around line 71:

```jsx
<PageCover
  cover={homePage?.cover}
  title={homePage?.title}
  description={homePage?.description}
  slideshowHref={slideshowHref}
/>
```

Replace with:

```jsx
<PageCover
  cover={homePage?.cover}
  title={homePage?.title}
  description={homePage?.description}
  slideshowHref={slideshowHref}
  clientFeaturesEnabled={!!homePage?.clientFeatures?.enabled}
/>
```

- [ ] **Step 5: Add `clientFeaturesEnabled` to PageCover in `pages/sites/[username]/[slug].js`**

Find the `<PageCover>` call around line 74:

```jsx
<PageCover
  cover={page.cover}
  title={page.title}
  description={page.description}
  slideshowHref={slideshowHref}
/>
```

Replace with:

```jsx
<PageCover
  cover={page.cover}
  title={page.title}
  description={page.description}
  slideshowHref={slideshowHref}
  clientFeaturesEnabled={!!page.clientFeatures?.enabled}
/>
```

- [ ] **Step 6: Verify in browser**

On a page with slideshow enabled and/or client features enabled:
- Cover variant shows the auto-injected buttons
- Button style from PageDesignPopover still applies
- PageDesignPopover shows "Button style" picker only when slideshow or client features are enabled
- Pages without either setting show no buttons

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/page/PageCover.js \
        components/admin/platform/PageDesignPopover.js \
        pages/admin/index.js \
        pages/sites/[username]/index.js \
        pages/sites/[username]/[slug].js
git commit -m "refactor: PageCover auto-inject slideshow+client-login buttons, drop cover.buttons"
```

---

### Task 3: Remove Buttons section from PageSettingsPanel

**Files:**
- Modify: `components/admin/platform/PageSettingsPanel.js`

- [ ] **Step 1: Remove button state, refs, and helpers**

In `components/admin/platform/PageSettingsPanel.js`, the current file has these which need to be deleted entirely:

State/refs to remove (in the function body):
```js
const [pickerOpen, setPickerOpen] = useState(false)
const dragIndex = useRef(null)
```

Functions to remove:
```js
function updateCover(patch) { ... }
function updateButton(i, patch) { ... }
function removeButton(i) { ... }
function hasButtonType(type) { ... }
function addButton(type) { ... }
function handleDragStart(i) { ... }
function handleDragOver(e) { ... }
function handleDrop(i) { ... }
```

Constant to remove:
```js
const DRAG_HANDLE = ( ... )
```

- [ ] **Step 2: Remove the Buttons section from JSX**

Delete the entire Buttons section from the expanded panel. The section starts at:
```jsx
{/* Buttons */}
<div>
  <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">Buttons</div>
  ...
</div>
```

and ends before the closing `</div>` of the `space-y-4` container.

Also remove these variables that were only used by buttons:
```js
const buttons = page.cover?.buttons || []
const canAddMore = buttons.length < 4
```

And the `inputCls` constant if it is no longer used by any remaining fields (check — it is used by the button label inputs, so remove it if it only appeared in the buttons section).

After removal, the expanded panel should contain only:

```jsx
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
  </div>
)}
```

- [ ] **Step 3: Clean up unused imports**

Check the import at the top of `PageSettingsPanel.js`:
```js
import { useState, useRef } from 'react'
```

After removing `pickerOpen` and `dragIndex`, verify `useRef` is still needed (it is — `brushRef` uses it). Both `useState` and `useRef` remain.

The `hasChildPages` prop is also no longer needed — remove it from the function signature:
```js
// Before:
export default function PageSettingsPanel({ page, onChange, hasChildPages }) {
// After:
export default function PageSettingsPanel({ page, onChange }) {
```

- [ ] **Step 4: Remove hasChildPages from caller**

In `components/admin/platform/PageEditorSidebar.js`, find:
```jsx
const hasChildPages = pages.some(p => p.parentId === page.id)
```
and:
```jsx
<PageSettingsPanel
  page={page}
  onChange={onPageChange}
  hasChildPages={hasChildPages}
/>
```

Remove the `hasChildPages` const and the prop:
```jsx
<PageSettingsPanel
  page={page}
  onChange={onPageChange}
/>
```

- [ ] **Step 5: Verify in browser**

Open a page in the admin. Confirm:
- Page hero panel shows Title and Description only
- No Buttons section appears
- The brush icon (PageDesignPopover) still works

- [ ] **Step 6: Commit**

```bash
git add components/admin/platform/PageSettingsPanel.js \
        components/admin/platform/PageEditorSidebar.js
git commit -m "refactor: remove explicit buttons UI from PageSettingsPanel"
```
