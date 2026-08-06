# Sidebar: cover row, theme bar, honest home/empty states — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the seeded hidden `home` page, make the cover a first-class sidebar row, auto-assign home to the first real page, surface a theme bar with a brush design popover above the Pages list, and render honest empty states (cover-only / under-construction).

**Architecture:** New sites start with `pages: []`. A pure `common/homePage.js` centralizes home resolution and first-page assignment, replacing three duplicated `id:'home'` fallbacks. The admin's cover selection moves from the `selectedPage.id === 'home'` hack to an explicit `coverSelected` state, and the sidebar gains a reserved Cover row + a theme bar. Design controls are extracted into a shared `DesignControlsBody` so Site Settings and the sidebar render the identical set (Site Settings keeps the theme selector; the sidebar shows theme as a dropdown and puts the rest behind a brush icon).

**Tech Stack:** Next.js (pages router), React, Tailwind + inline styles, Jest + @testing-library/react (jsdom), GCS JSON config.

## Global Constraints

- **Editing invariant:** all edits are initiated from the sidebar; the preview is read-only. Store theme-independent data.
- **Cover is on by default:** `hasCoverPage: true` in `createDefaultSiteConfig`. Treat `hasCoverPage !== false` as "on" everywhere (never `=== true`).
- **No new themes / registry changes.** Theme list comes from `themeOptions()` (exported from `SiteSettingsPopover.js`).
- **Shared cover fallback:** the no-image cover backdrop is `COVER_FALLBACK_BG` from `common/coverBackground.js` — reuse it, never re-declare the gradient.
- **Hover states:** buttons with an inline `background` must set hover via `onMouseEnter/onMouseLeave` (Tailwind `hover:` is silently overridden by inline `background`).
- **Test imports:** component/unit tests use the `@/` alias (e.g. `@/common/homePage`); existing `common` tests use relative paths — match the neighboring file.
- **Commit after every task.** Run the full suite (`npm test`) before the final task's completion.

---

### Task 1: Start new sites with zero pages (remove the seeded `home` page)

Removes the hidden seeded page from both creation paths and updates the tests that asserted it.

**Files:**
- Modify: `common/siteConfig.js` (`createDefaultSiteConfig`, the `pages: [...]` seed, ~line 91-93)
- Modify: `pages/api/admin/reset.js` (~line 21)
- Test: `__tests__/common/siteConfig.test.js`, `__tests__/common/siteConfig.unifiedModel.test.js`

**Interfaces:**
- Produces: `createDefaultSiteConfig(userId, profile?)` now returns `{ …, hasCoverPage: true, pages: [] }`.

- [ ] **Step 1: Update the failing tests first**

In `__tests__/common/siteConfig.test.js`, find the `describe('createDefaultSiteConfig')` block. Replace any assertion that the config seeds a home page (e.g. `expect(config.pages).toHaveLength(1)` / `expect(config.pages[0].id).toBe('home')`) with:

```js
it('starts with zero pages — no hidden seeded page', () => {
  const config = createDefaultSiteConfig('user-123')
  expect(config.pages).toEqual([])
})

it('has the cover page enabled by default', () => {
  const config = createDefaultSiteConfig('user-123')
  expect(config.hasCoverPage).toBe(true)
})
```

In `__tests__/common/siteConfig.unifiedModel.test.js`, the block starts `const home = createDefaultSiteConfig('user-1').pages[0]`. That page no longer exists. Replace the whole `describe('createDefaultSiteConfig — unified page model')` body with a check that `defaultPage` (not the seed) carries the unified shape:

```js
import { createDefaultSiteConfig, defaultPage } from '../../common/siteConfig'

describe('createDefaultSiteConfig — unified page model', () => {
  it('seeds no pages', () => {
    expect(createDefaultSiteConfig('user-1').pages).toEqual([])
  })

  it('defaultPage carries the unified page shape', () => {
    const p = defaultPage({ id: 'gallery', title: 'Gallery' })
    expect(p).toMatchObject({ id: 'gallery', title: 'Gallery', type: 'page', showInNav: true })
    expect(Array.isArray(p.blocks)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/common/siteConfig.test.js __tests__/common/siteConfig.unifiedModel.test.js`
Expected: FAIL — current code still returns one seeded page.

- [ ] **Step 3: Remove the seed in `createDefaultSiteConfig`**

In `common/siteConfig.js`, change:

```js
    pages: [
      defaultPage({ id: 'home', title: 'Home', showInNav: false }),
    ],
```
to:
```js
    pages: [],
```

- [ ] **Step 4: Remove the seed in the reset route**

In `pages/api/admin/reset.js`, change `pages: [defaultPage({ id: 'home', title: 'Home', showInNav: false })],` to `pages: [],`. If that leaves `defaultPage` unused in the file, remove it from the import.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest __tests__/common/siteConfig.test.js __tests__/common/siteConfig.unifiedModel.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add common/siteConfig.js pages/api/admin/reset.js __tests__/common/siteConfig.test.js __tests__/common/siteConfig.unifiedModel.test.js
git commit -m "feat: new sites start with zero pages (drop seeded hidden home page)"
```

---

### Task 2: Centralize home resolution in `common/homePage.js` and drop the `'home'` fallbacks

DRY: three places duplicate the "resolve which page is home" ladder and lean on the now-gone `id:'home'`. Extract one pure helper and reuse it.

**Files:**
- Create: `common/homePage.js`
- Test: `__tests__/common/homePage.test.js`
- Modify: `components/admin/platform/PagePreview.js` (remove local `resolveHomePage`, import shared)
- Modify: `pages/admin/index.js` (`resolveEditingPage` — drop `pages.find(p => p.id === 'home')`)
- Modify: `components/admin/platform/PlatformSidebar.js` (line ~739 — drop `.filter(p => p.id !== 'home')`)

**Interfaces:**
- Produces:
  - `resolveHomePage(config) → page | null` — order: `homePageId` → first nav non-link → first non-link → `pages[0]` → null.
  - `assignHomeOnCreate(config, newPage) → config` — returns config unchanged if `homePageId` already set or `newPage` is hidden/link; otherwise a copy with `homePageId: newPage.id`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/common/homePage.test.js`:

```js
import { resolveHomePage, assignHomeOnCreate } from '@/common/homePage'

const page = (over) => ({ type: 'page', showInNav: true, ...over })

describe('resolveHomePage', () => {
  it('returns null when there are no pages', () => {
    expect(resolveHomePage({ pages: [] })).toBeNull()
  })
  it('prefers the explicit homePageId', () => {
    const cfg = { homePageId: 'b', pages: [page({ id: 'a' }), page({ id: 'b' })] }
    expect(resolveHomePage(cfg).id).toBe('b')
  })
  it('falls back to the first nav non-link page', () => {
    const cfg = { pages: [page({ id: 'l', type: 'link' }), page({ id: 'a' })] }
    expect(resolveHomePage(cfg).id).toBe('a')
  })
  it('does not special-case an id of "home"', () => {
    const cfg = { pages: [page({ id: 'home', showInNav: false }), page({ id: 'a' })] }
    expect(resolveHomePage(cfg).id).toBe('a')
  })
})

describe('assignHomeOnCreate', () => {
  it('assigns the new page as home when none is set', () => {
    const cfg = { homePageId: null, pages: [] }
    expect(assignHomeOnCreate(cfg, page({ id: 'a' })).homePageId).toBe('a')
  })
  it('leaves an existing home untouched', () => {
    const cfg = { homePageId: 'a', pages: [] }
    expect(assignHomeOnCreate(cfg, page({ id: 'b' })).homePageId).toBe('a')
  })
  it('ignores hidden and link pages', () => {
    const cfg = { homePageId: null, pages: [] }
    expect(assignHomeOnCreate(cfg, page({ id: 'h', showInNav: false })).homePageId).toBeUndefined()
    expect(assignHomeOnCreate(cfg, page({ id: 'l', type: 'link' })).homePageId).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/common/homePage.test.js`
Expected: FAIL — `Cannot find module '@/common/homePage'`.

- [ ] **Step 3: Create the helper**

Create `common/homePage.js`:

```js
// Pure home-page resolution + first-page assignment. Client- and server-safe
// (no GCS imports). Replaces the duplicated `id:'home'` fallback ladders that
// existed while a hidden seeded "home" page was created for every new site.

export function resolveHomePage(config) {
  const pages = config?.pages || []
  if (!pages.length) return null
  return pages.find(p => p.id === config.homePageId)
    || pages.find(p => p.showInNav && p.type !== 'link')
    || pages.find(p => p.type !== 'link')
    || pages[0]
    || null
}

// When the first *visible* page is created and no home is pinned yet, pin it.
// Later pages, hidden pages, and external links never change an existing home.
export function assignHomeOnCreate(config, newPage) {
  if (config.homePageId) return config
  if (!newPage || newPage.showInNav === false || newPage.type === 'link') return config
  return { ...config, homePageId: newPage.id }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/common/homePage.test.js`
Expected: PASS

- [ ] **Step 5: Use the shared helper in `PagePreview.js`**

In `components/admin/platform/PagePreview.js`, delete the local `resolveHomePage` function (lines 19-28) and add to the imports:

```js
import { resolveHomePage } from '../../../common/homePage'
```

- [ ] **Step 6: Drop the `'home'` fallback in `resolveEditingPage`**

In `pages/admin/index.js`, in `resolveEditingPage`, remove the line `|| pages.find(p => p.id === 'home')` so the ladder is `homePageId` → nav non-link → non-link → `pages[0]` → null. (Leave the rest of the function intact.)

- [ ] **Step 7: Drop the `'home'` filter in the sidebar**

In `components/admin/platform/PlatformSidebar.js` (~line 739), change:
```js
  const hiddenPages = flattenForOtherPages(pages).filter(p => p.id !== 'home')
```
to:
```js
  const hiddenPages = flattenForOtherPages(pages)
```

- [ ] **Step 8: Run the broader suite to confirm nothing regressed**

Run: `npx jest __tests__/common __tests__/components/PageCover.test.js`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add common/homePage.js __tests__/common/homePage.test.js components/admin/platform/PagePreview.js pages/admin/index.js components/admin/platform/PlatformSidebar.js
git commit -m "refactor: centralize home resolution in common/homePage; drop seeded-home fallbacks"
```

---

### Task 3: First visible page created → auto-assign home

Wire `assignHomeOnCreate` into both page-creation paths so the home icon appears the moment a real page exists.

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js` (`handleDraftCommit`, ~line 379-395)
- Modify: `pages/admin/index.js` (`handleCreateFirstPage`, ~line 300-314)
- Test: extend `__tests__/common/homePage.test.js` (behavior already covered by Task 2 helper tests — add an integration-style test of the config transform used by the handlers)

**Interfaces:**
- Consumes: `assignHomeOnCreate` from `common/homePage.js`, `defaultPage` from `common/siteConfig.js`.

- [ ] **Step 1: Add a test for the create-then-assign transform**

Append to `__tests__/common/homePage.test.js`:

```js
import { defaultPage } from '@/common/siteConfig'

describe('create-first-page assigns home', () => {
  it('pins the first created visible page as home', () => {
    let cfg = { homePageId: null, pages: [] }
    const p = defaultPage({ id: 'gallery', title: 'New Page', showInNav: true })
    cfg = { ...cfg, pages: [...cfg.pages, p] }
    cfg = assignHomeOnCreate(cfg, p)
    expect(cfg.homePageId).toBe('gallery')
    expect(cfg.pages).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `npx jest __tests__/common/homePage.test.js`
Expected: PASS (helper already exists) — this test locks the intended handler behavior.

- [ ] **Step 3: Wire into the sidebar's `handleDraftCommit`**

In `components/admin/platform/PlatformSidebar.js`, add to the imports (extend the existing `common/siteConfig` line or add a new one):

```js
import { assignHomeOnCreate } from '../../../common/homePage'
```

In `handleDraftCommit`, the code builds a `defaultPage(...)` and appends it via `onConfigChange(prev => ({ ...prev, pages: [...prev.pages, newPage] }))`. Change that updater so the new page object is created once and home is assigned in the same transform. Concretely, where it currently does something like:

```js
      onConfigChange(prev => ({
        ...prev,
        pages: [...prev.pages, defaultPage({ id, title, sortOrder, showInNav: inNav, parentId: null, template })],
      }))
```
replace with:
```js
      const newPage = defaultPage({ id, title, sortOrder, showInNav: inNav, parentId: null, template })
      onConfigChange(prev => assignHomeOnCreate(
        { ...prev, pages: [...prev.pages, newPage] },
        newPage,
      ))
```

- [ ] **Step 4: Wire into the admin's `handleCreateFirstPage`**

In `pages/admin/index.js`, add `import { assignHomeOnCreate } from '../../common/homePage'` (near the other `common` imports). In `handleCreateFirstPage`, change:

```js
    updateConfig(prev => ({
      ...prev,
      pages: [...prev.pages, defaultPage({ id, title: 'New Page', sortOrder, showInNav: true, parentId: null, template: 'gallery' })],
    }))
```
to:
```js
    const newPage = defaultPage({ id, title: 'New Page', sortOrder, showInNav: true, parentId: null, template: 'gallery' })
    updateConfig(prev => assignHomeOnCreate({ ...prev, pages: [...prev.pages, newPage] }, newPage))
```

- [ ] **Step 5: Run the suite**

Run: `npx jest __tests__/common/homePage.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/admin/platform/PlatformSidebar.js pages/admin/index.js __tests__/common/homePage.test.js
git commit -m "feat: first created visible page becomes home automatically"
```

---

### Task 4: Replace the `id === 'home'` cover proxy with a `coverSelected` state

The cover editor was reachable only by "selecting" the seeded page. Introduce explicit state so the cover can be selected with zero pages.

**Files:**
- Modify: `pages/admin/index.js` (state, `handleViewCover`, `handleSelectPage`, `handleCreateFirstPage`, `handleDisableCover`, `isCoverPageSelected`, `content` branching, `<PlatformSidebar>` props)

**Interfaces:**
- Produces (to sidebar, Task 5): props `coverSelected: boolean` and `onSelectCover: () => void` on `<PlatformSidebar>`. `onSelectCover` is wired to the existing `handleViewCover`.

- [ ] **Step 1: Add the `coverSelected` state and reset it on other selections**

In `pages/admin/index.js`, near `const [selectedPageId, setSelectedPageId] = useState(null)` add:

```js
  const [coverSelected, setCoverSelected] = useState(false)
```

Update the handlers so any non-cover selection clears it, and viewing the cover sets it:

```js
  const handleViewCover = useCallback(() => {
    setCoverSelected(true)
    setSelectedPageId(null)
    setShowLibrary(false)
  }, [])

  const handleDisableCover = useCallback(() => {
    const pages = siteConfig?.pages || []
    const targetId = siteConfig?.homePageId
      || pages.find(p => p.showInNav && p.type !== 'link')?.id
    if (!siteConfig?.homePageId && targetId) {
      updateConfig(prev => ({ ...prev, homePageId: targetId }))
    }
    setCoverSelected(false)
    setSelectedPageId(targetId || null)
    setShowLibrary(false)
  }, [siteConfig, updateConfig])

  const handleSelectPage = useCallback((pageId) => {
    setCoverSelected(false)
    setSelectedPageId(pageId)
    setShowLibrary(false)
  }, [])
```

In `handleCreateFirstPage`, add `setCoverSelected(false)` alongside the existing `setSelectedPageId(id)`. In the `onShowLibrary` prop on `<PlatformSidebar>` (`() => { setShowLibrary(true); setSelectedPageId(null) }`) add `setCoverSelected(false)`.

- [ ] **Step 2: Redefine `isCoverPageSelected`**

Replace:
```js
  const isCoverPageSelected = selectedPage?.id === 'home' && siteConfig.hasCoverPage !== false
```
with:
```js
  const isCoverPageSelected = coverSelected && siteConfig.hasCoverPage !== false
```

- [ ] **Step 3: Make the cover branch render even with zero pages**

The `content` block is currently `if (selectedPage) { … } else { CanvasEmptyState }`, and the cover preview lives inside the `selectedPage` branch. Lift the cover case out so it does not require a selected page. Restructure the top of the `content` computation to:

```js
  let content
  if (isCoverPageSelected) {
    const cover = siteConfig.cover || {}
    const bgStyle = cover.imageUrl
      ? { backgroundImage: `url(${cover.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: COVER_FALLBACK_BG }
    const homeTarget = siteConfig.homePageId || siteConfig.pages?.find(p => p.showInNav && p.type !== 'link')?.id
    content = (
      <div className="flex-1 h-full min-w-0 flex flex-col items-center justify-center text-center px-6 relative" style={bgStyle}>
        {cover.imageUrl && <div className="absolute inset-0 bg-black/30" />}
        <div className="relative z-10 text-white">
          {(cover.heading || siteConfig.siteName || cover.subheading || siteConfig.tagline) && (
            <div className="space-y-3 mb-9">
              {(cover.heading || siteConfig.siteName) && (
                <h2 className="text-4xl md:text-6xl font-light tracking-tight">{cover.heading || siteConfig.siteName}</h2>
              )}
              {(cover.subheading || siteConfig.tagline) && (
                <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto">{cover.subheading || siteConfig.tagline}</p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => { if (homeTarget) handleSelectPage(homeTarget); else setCoverCtaHint(true) }}
            className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-white text-stone-900 hover:bg-stone-100 transition-colors"
          >
            {cover.buttonText || 'View my portfolio'}
          </button>
          {coverCtaHint && !homeTarget && (
            <p className="mt-4 text-xs text-white/70">Coming soon — add a page and it becomes your site’s home.</p>
          )}
        </div>
      </div>
    )
  } else if (selectedPage) {
    // …existing link / PagePreview branches, WITHOUT the old isCoverPage sub-branch…
  } else {
    content = <CanvasEmptyState onAddPage={handleCreateFirstPage} />
  }
```

Delete the now-dead `const isCoverPage = isCoverPageSelected; if (isCoverPage) { … } else { … }` sub-branch inside the old `selectedPage` block — keep only the link branch and the `PagePreview` branch. Add the hint state near the other admin state:

```js
  const [coverCtaHint, setCoverCtaHint] = useState(false)
```

Reset it whenever the cover is opened: in `handleViewCover`, add `setCoverCtaHint(false)`.

- [ ] **Step 4: Pass the new props to `<PlatformSidebar>`**

Add to the `<PlatformSidebar ... />` props (they'll be consumed in Task 5):

```js
      coverSelected={coverSelected}
      onSelectCover={handleViewCover}
```

- [ ] **Step 5: Verify the admin builds and the cover opens**

Run: `npx jest __tests__/common` (unit safety net) then manually verify per Task 10. There is no jest test for `AdminIndex` (it needs a NextAuth session + GCS); the cover-selection behavior is verified in the dogfood step.
Expected: unit PASS.

- [ ] **Step 6: Commit**

```bash
git add pages/admin/index.js
git commit -m "refactor: drive cover editing from explicit coverSelected state (works with zero pages)"
```

---

### Task 5: Reserved "Cover page" row in the sidebar

A page-item-sized row at the top of the Pages list. Cover on → "Cover page" + thumbnail (image or `COVER_FALLBACK_BG`). Cover off → muted "Add a cover page" that re-enables it.

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js` (accept `coverSelected`, `onSelectCover`; render the row above the "Pages" section header)
- Test: `__tests__/components/CoverPageRow.test.js`
- Create: `components/admin/platform/CoverPageRow.js`

**Interfaces:**
- Consumes: `coverSelected`, `onSelectCover`, `siteConfig`, `onConfigChange` (from PlatformSidebar props).
- Produces: `<CoverPageRow siteConfig selected onSelect onEnableCover />` — a presentational row.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/CoverPageRow.test.js`:

```js
import { render, screen, fireEvent } from '@testing-library/react'
import CoverPageRow from '@/components/admin/platform/CoverPageRow'

describe('CoverPageRow', () => {
  it('shows "Cover page" when the cover is on', () => {
    render(<CoverPageRow siteConfig={{ hasCoverPage: true, cover: {} }} selected={false} onSelect={() => {}} onEnableCover={() => {}} />)
    expect(screen.getByText('Cover page')).toBeInTheDocument()
  })

  it('calls onSelect when the cover is on and the row is clicked', () => {
    const onSelect = jest.fn()
    render(<CoverPageRow siteConfig={{ hasCoverPage: true, cover: {} }} selected={false} onSelect={onSelect} onEnableCover={() => {}} />)
    fireEvent.click(screen.getByText('Cover page'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('shows "Add a cover page" and calls onEnableCover when the cover is off', () => {
    const onEnableCover = jest.fn()
    render(<CoverPageRow siteConfig={{ hasCoverPage: false, cover: {} }} selected={false} onSelect={() => {}} onEnableCover={onEnableCover} />)
    const el = screen.getByText('Add a cover page')
    expect(el).toBeInTheDocument()
    fireEvent.click(el)
    expect(onEnableCover).toHaveBeenCalled()
  })

  it('renders the cover image as the thumbnail when present', () => {
    const { container } = render(<CoverPageRow siteConfig={{ hasCoverPage: true, cover: { imageUrl: 'https://x/y.jpg' } }} selected={false} onSelect={() => {}} onEnableCover={() => {}} />)
    expect(container.querySelector('img')?.getAttribute('src')).toContain('y.jpg')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/CoverPageRow.test.js`
Expected: FAIL — `Cannot find module '@/components/admin/platform/CoverPageRow'`.

- [ ] **Step 3: Create the component**

Create `components/admin/platform/CoverPageRow.js`:

```js
import { COVER_FALLBACK_BG } from '../../../common/coverBackground'

const SERIF = "'Fraunces', Georgia, serif"

// A reserved, non-draggable row that represents the site cover in the Pages list.
// It is NOT a page in siteConfig.pages — clicking it selects the cover editor.
export default function CoverPageRow({ siteConfig, selected, onSelect, onEnableCover }) {
  const coverOn = siteConfig?.hasCoverPage !== false
  const imageUrl = siteConfig?.cover?.imageUrl || ''

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '4px 10px', margin: '0 8px', borderRadius: 5,
    cursor: 'pointer', border: 'none', width: 'calc(100% - 16px)', textAlign: 'left',
    background: selected ? '#f6f3ec' : 'transparent',
    boxShadow: selected ? 'inset 0 0 0 1px rgba(26,18,10,0.10)' : 'none',
    transition: 'background 120ms',
  }
  const hoverOn = (e) => { if (!selected) e.currentTarget.style.background = 'rgba(26,18,10,0.04)' }
  const hoverOff = (e) => { if (!selected) e.currentTarget.style.background = 'transparent' }

  if (!coverOn) {
    return (
      <button type="button" onClick={onEnableCover} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
        style={{ ...rowStyle, color: '#b0a490' }}>
        <span style={{ width: 24, height: 24, borderRadius: 3, flexShrink: 0, border: '1px dashed rgba(26,18,10,0.18)' }} />
        <span style={{ fontFamily: SERIF, fontSize: 13, flex: 1 }}>Add a cover page</span>
      </button>
    )
  }

  return (
    <button type="button" onClick={onSelect} onMouseEnter={hoverOn} onMouseLeave={hoverOff} style={rowStyle}>
      <span style={{ width: 24, height: 24, borderRadius: 3, flexShrink: 0, overflow: 'hidden', display: 'block', background: imageUrl ? undefined : COVER_FALLBACK_BG }}>
        {imageUrl && <img src={imageUrl} alt="" style={{ width: 24, height: 24, objectFit: 'cover', display: 'block' }} />}
      </span>
      <span style={{ fontFamily: SERIF, fontSize: 13, color: '#3a362f', flex: 1 }}>Cover page</span>
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/CoverPageRow.test.js`
Expected: PASS

- [ ] **Step 5: Render the row in the sidebar**

In `components/admin/platform/PlatformSidebar.js`:

Add to the prop destructure (in the `export default function PlatformSidebar({ … })` list): `coverSelected,` and `onSelectCover,`.

Add the import near the top: `import CoverPageRow from './CoverPageRow'`.

Inside the PAGES LIST scroll container, immediately **before** the `{/* Pages section header */}` div, insert:

```jsx
        <div style={{ padding: '10px 8px 2px' }}>
          <CoverPageRow
            siteConfig={siteConfig}
            selected={!!coverSelected}
            onSelect={() => onSelectCover?.()}
            onEnableCover={() => {
              onConfigChange(prev => ({ ...prev, hasCoverPage: true }))
              onSelectCover?.()
            }}
          />
        </div>
```

- [ ] **Step 6: Run the component suite**

Run: `npx jest __tests__/components/CoverPageRow.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/admin/platform/CoverPageRow.js __tests__/components/CoverPageRow.test.js components/admin/platform/PlatformSidebar.js
git commit -m "feat: reserved Cover page row at the top of the sidebar Pages list"
```

---

### Task 6: Extract `DesignControlsBody` (design controls, optional theme)

Pull the Design popover's control list out of `SiteSettingsPopover` so the sidebar brush popover can render the identical set minus the theme selector. Also export `BrushIcon` for reuse.

**Files:**
- Create: `components/admin/platform/DesignControlsBody.js`
- Modify: `components/admin/platform/SiteSettingsPopover.js` (replace the inline design sections with `<DesignControlsBody includeTheme />`; export `BrushIcon`)
- Test: `__tests__/components/DesignControlsBody.test.js`

**Interfaces:**
- Produces:
  - `<DesignControlsBody config onChange onEditHandles includeTheme />` where `onChange(patch)` merges a shallow patch into `config` (same contract as `SiteSettingsPopover`'s local `update`). `includeTheme` (default `false`) toggles the Theme section.
  - Named export `BrushIcon` (re-exported from `SiteSettingsPopover` too, to avoid churn).

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/DesignControlsBody.test.js`:

```js
import { render, screen } from '@testing-library/react'
import DesignControlsBody from '@/components/admin/platform/DesignControlsBody'

const base = { logoType: 'sitename', design: { theme: 'kyoto', navStyle: 'links' } }

describe('DesignControlsBody', () => {
  it('omits the Theme section by default', () => {
    render(<DesignControlsBody config={base} onChange={() => {}} />)
    expect(screen.queryByText('Theme')).not.toBeInTheDocument()
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Social links')).toBeInTheDocument()
  })
  it('includes the Theme section when includeTheme is set', () => {
    render(<DesignControlsBody config={base} onChange={() => {}} includeTheme />)
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/DesignControlsBody.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `DesignControlsBody.js`**

Move the design sections out of `SiteSettingsPopover.js` (lines 753-828) verbatim into a new component. Create `components/admin/platform/DesignControlsBody.js`:

```js
import { DesignSection, PillToggle as DesignPillToggle, DesignSelect } from './designControls'
import { THEME_LIST } from '../../../common/themes'
import { resolveNavStyle } from '../../../common/navStyles'
import { resolveFooterSocial } from '../../../common/siteDesign'

const themeOptions = () => THEME_LIST.filter(t => !t.hidden).map(t => ({ value: t.id, label: t.name }))

// The Design control list shared by Site Settings and the sidebar theme bar.
// `onChange(patch)` shallow-merges into siteConfig. `includeTheme` renders the
// theme <select> (Site Settings uses it; the sidebar splits theme into its own
// dropdown and passes includeTheme={false}).
export default function DesignControlsBody({ config, onChange, onEditHandles, includeTheme = false }) {
  const update = onChange
  return (
    <>
      {includeTheme && (
        <DesignSection label="Theme">
          <DesignSelect
            value={config.design?.theme || 'kyoto'}
            onChange={(e) => update({ design: { ...(config.design || {}), theme: e.target.value } })}
          >
            {themeOptions().map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </DesignSelect>
        </DesignSection>
      )}

      {(config.logoType || 'sitename') === 'sitename' && (
        <DesignSection label="Logo font">
          <DesignPillToggle
            value={config.logoFont || 'theme'}
            onChange={(v) => update({ logoFont: v })}
            options={[
              { value: 'theme',     label: <span style={{ fontFamily: 'Muse', fontSize: 15, lineHeight: 1 }}>Signature</span> },
              { value: 'modern',    label: <span style={{ fontFamily: 'Inter, -apple-system, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontSize: 11 }}>Modern</span> },
              { value: 'editorial', label: <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 13 }}>Editorial</span> },
              { value: 'cormorant', label: <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12 }}>Classic</span> },
            ]}
          />
        </DesignSection>
      )}

      {resolveNavStyle(config.design?.theme || 'kyoto') !== 'left-rail' && (
        <DesignSection label="Navigation">
          <DesignPillToggle
            value={config.design?.navStyle === 'menu' ? 'menu' : 'links'}
            onChange={(v) => update({ design: { ...(config.design || {}), navStyle: v } })}
            options={[{ value: 'links', label: 'Links' }, { value: 'menu', label: 'Menu' }]}
          />
        </DesignSection>
      )}

      {config.design?.navStyle !== 'menu' && (
        <DesignSection label="Nested pages">
          <DesignPillToggle
            value={config.design?.subNavStyle === 'inline' ? 'inline' : 'dropdown'}
            onChange={(v) => update({ design: { ...(config.design || {}), subNavStyle: v } })}
            options={[{ value: 'dropdown', label: 'Dropdown' }, { value: 'inline', label: 'Inline' }]}
          />
        </DesignSection>
      )}

      <DesignSection
        label="Social links"
        description={onEditHandles ? (
          <>You can add these in your{' '}
            <button type="button" onClick={onEditHandles}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#2c2416' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'inherit' }}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer', transition: 'color 0.15s' }}
            >profile</button>
          </>
        ) : 'You can add these in your profile'}
      >
        <DesignPillToggle
          value={resolveFooterSocial(config)}
          onChange={(v) => update({ design: { ...(config.design || {}), footerSocial: v } })}
          options={[{ value: 'text', label: 'Text' }, { value: 'icons', label: 'Icons' }, { value: 'off', label: 'Off' }]}
        />
      </DesignSection>
    </>
  )
}
```

- [ ] **Step 4: Use it inside `SiteSettingsPopover`**

In `components/admin/platform/SiteSettingsPopover.js`, add `import DesignControlsBody from './DesignControlsBody'`. Replace the design PopoverShell body (the `<DesignSection label="Theme">…` through the closing of the last `</DesignSection>`, lines 753-828) with:

```jsx
          <DesignControlsBody config={config} onChange={update} onEditHandles={onEditHandles} includeTheme />
```

Add a re-export so other modules can import the icon from here without a second copy: below the `BrushIcon` definition (line 176) leave it as-is, and add `export { BrushIcon }` — or simpler, change `const BrushIcon = ...` to `export const BrushIcon = ...`. (Task 7 imports it from `SiteSettingsPopover`.)

Leave the cover-design sub-popover and everything else in `SiteSettingsPopover` untouched.

- [ ] **Step 5: Run tests**

Run: `npx jest __tests__/components/DesignControlsBody.test.js __tests__/components/ThemeSwitcher.test.js`
Expected: PASS (the existing `themeOptions` test still passes — it imports from `SiteSettingsPopover`, which keeps its own `themeOptions` export).

- [ ] **Step 6: Commit**

```bash
git add components/admin/platform/DesignControlsBody.js components/admin/platform/SiteSettingsPopover.js __tests__/components/DesignControlsBody.test.js
git commit -m "refactor: extract DesignControlsBody; Site Settings renders it with the theme section"
```

---

### Task 7: Theme bar above the Pages section (dropdown + brush popover)

A bar showing the current theme as a `<select>` dropdown, with a brush icon just left of the caret opening a `DesignControlsBody` popover (no theme section).

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js` (add the bar above the cover row; brush popover state + anchor)
- Test: `__tests__/components/ThemeBar.test.js`
- Create: `components/admin/platform/ThemeBar.js`

**Interfaces:**
- Consumes: `siteConfig`, `onConfigChange`, `onEditHandles` (already available? — see Step 5).
- Produces: `<ThemeBar siteConfig onConfigChange onEditHandles />`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/ThemeBar.test.js`:

```js
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeBar from '@/components/admin/platform/ThemeBar'

describe('ThemeBar', () => {
  it('shows the current theme as the selected option', () => {
    render(<ThemeBar siteConfig={{ design: { theme: 'manhattan' } }} onConfigChange={() => {}} />)
    // Copenhagen is the display name for the `manhattan` id
    expect(screen.getByRole('combobox')).toHaveValue('manhattan')
  })

  it('writes design.theme when a new theme is chosen', () => {
    const onConfigChange = jest.fn(fn => fn({ design: { theme: 'kyoto' } }))
    render(<ThemeBar siteConfig={{ design: { theme: 'kyoto' } }} onConfigChange={onConfigChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'manhattan' } })
    expect(onConfigChange).toHaveBeenCalled()
    const result = onConfigChange.mock.results[0].value
    expect(result.design.theme).toBe('manhattan')
  })

  it('opens the design popover when the brush is clicked', () => {
    render(<ThemeBar siteConfig={{ design: { theme: 'kyoto' }, logoType: 'sitename' }} onConfigChange={() => {}} />)
    fireEvent.click(screen.getByTitle('Design'))
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.queryByText('Theme')).not.toBeInTheDocument() // theme is the dropdown, not in the popover
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ThemeBar.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `ThemeBar.js`**

Create `components/admin/platform/ThemeBar.js`. It renders a labeled `<select>` (reusing `DesignSelect`) plus a brush button; the popover is rendered inline (not `PopoverShell`, to keep the test DOM simple and avoid portal/anchor coupling) via a simple absolutely-positioned panel:

```js
import { useState, useRef } from 'react'
import { DesignSelect } from './designControls'
import { themeOptions } from './SiteSettingsPopover'
import { BrushIcon } from './SiteSettingsPopover'
import DesignControlsBody from './DesignControlsBody'

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"

export default function ThemeBar({ siteConfig, onConfigChange, onEditHandles }) {
  const [designOpen, setDesignOpen] = useState(false)
  const wrapRef = useRef(null)
  const update = (patch) => onConfigChange(prev => ({ ...prev, ...patch }))

  return (
    <div ref={wrapRef} style={{ position: 'relative', padding: '12px 14px 4px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#b0a490', fontWeight: 500, marginBottom: 6 }}>
        Theme
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <DesignSelect
            value={siteConfig.design?.theme || 'kyoto'}
            onChange={(e) => update({ design: { ...(siteConfig.design || {}), theme: e.target.value } })}
          >
            {themeOptions().map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </DesignSelect>
        </div>
        <button
          type="button"
          title="Design"
          onClick={() => setDesignOpen(v => !v)}
          className="w-6 h-6 flex items-center justify-center rounded transition-colors flex-shrink-0"
          style={{ color: '#9e9788', background: designOpen ? 'rgba(26,18,10,0.06)' : 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(26,18,10,0.06)' }}
          onMouseLeave={(e) => { if (!designOpen) e.currentTarget.style.background = 'transparent' }}
        >
          <BrushIcon />
        </button>
      </div>

      {designOpen && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 8, zIndex: 40, marginTop: 4,
            minWidth: 260, maxWidth: 'calc(100vw - 24px)',
            background: '#fbf8f1', border: '1px solid rgba(160,140,110,0.24)', borderRadius: 8,
            boxShadow: '0 12px 32px rgba(26,18,10,0.18)', padding: '4px 0',
          }}
        >
          <DesignControlsBody config={siteConfig} onChange={update} onEditHandles={onEditHandles} includeTheme={false} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ThemeBar.test.js`
Expected: PASS

- [ ] **Step 5: Mount `ThemeBar` in the sidebar**

In `components/admin/platform/PlatformSidebar.js`, add `import ThemeBar from './ThemeBar'`. Inside the PAGES LIST scroll container, **above** the `<CoverPageRow>` block added in Task 5, insert:

```jsx
        <ThemeBar siteConfig={siteConfig} onConfigChange={onConfigChange} onEditHandles={undefined} />
```

(`onEditHandles` is passed `undefined` here — the sidebar has no handles editor wired; the Social links section then shows the plain "You can add these in your profile" copy, matching the fallback already in the code. If a handles editor prop later exists on `PlatformSidebar`, thread it through.)

- [ ] **Step 6: Commit**

```bash
git add components/admin/platform/ThemeBar.js __tests__/components/ThemeBar.test.js components/admin/platform/PlatformSidebar.js
git commit -m "feat: theme bar with brush design popover above the sidebar Pages list"
```

---

### Task 8: Published site — cover-only, coming-soon CTA, and under-construction

Make the live site render correctly with zero pages now that the seed is gone.

**Files:**
- Modify: `pages/sites/[username]/index.js`
- Test: `__tests__/pages/publicPortfolioEmpty.test.js`

**Interfaces:**
- Consumes: `resolveHomePage` from `common/homePage.js`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/pages/publicPortfolioEmpty.test.js`. It renders the default export with minimal props for the two zero-page cases:

```js
import { render, screen } from '@testing-library/react'
import PublicPortfolio from '@/pages/sites/[username]/index'

const base = { assetsByUrl: {}, printStore: { paymentsReady: false, currency: 'USD' }, username: 'jane', basePath: '/sites/jane' }

describe('PublicPortfolio with zero pages', () => {
  it('renders the cover (with its button) when cover is on and there are no pages', () => {
    render(<PublicPortfolio {...base} siteConfig={{ siteName: 'Jane', hasCoverPage: true, cover: { buttonText: 'Enter' }, pages: [] }} />)
    expect(screen.getByText('Enter')).toBeInTheDocument()
  })

  it('renders an under-construction message when cover is off and there are no pages', () => {
    render(<PublicPortfolio {...base} siteConfig={{ siteName: 'Jane', hasCoverPage: false, cover: {}, design: { theme: 'kyoto' }, pages: [] }} />)
    expect(screen.getByText(/under construction/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/pages/publicPortfolioEmpty.test.js`
Expected: FAIL — the cover button is `null` with no home, and the cover-off branch says "No content yet."

- [ ] **Step 3: Resolve home via the shared helper and keep the button**

In `pages/sites/[username]/index.js`:

Add `import { resolveHomePage } from '../../../common/homePage'` and `import { useState } from 'react'` is already imported.

Replace the home resolution and cover-button lines:
```js
  const homePage = siteConfig.pages?.find((p) => p.id === 'home') || siteConfig.pages?.[0]
  const hasCoverPage = siteConfig.hasCoverPage !== false
  const coverConfig = siteConfig.cover || {}
  const initialPage = hasCoverPage && siteConfig.homePageId
    ? siteConfig.pages?.find(p => p.id === siteConfig.homePageId)
    : null
  const initialPageHref = initialPage ? `${basePath}/${initialPage.slug || initialPage.id}` : null
```
with:
```js
  const homePage = resolveHomePage(siteConfig)
  const hasCoverPage = siteConfig.hasCoverPage !== false
  const coverConfig = siteConfig.cover || {}
  const homeTarget = resolveHomePage(siteConfig)
  const initialPageHref = homeTarget ? `${basePath}/${homeTarget.slug || homeTarget.id}` : null
  const [comingSoon, setComingSoon] = useState(false)
```

- [ ] **Step 4: Always render the cover button; coming-soon when no home**

In the `if (hasCoverPage)` block, change the `<PageCover … primaryButton={…} />` so the button is always present:

```jsx
          primaryButton={{
            label: coverConfig.buttonText || 'View my portfolio',
            href: initialPageHref || undefined,
            onClick: initialPageHref ? undefined : () => setComingSoon(true),
          }}
```

Directly after the `<PageCover … />` (still inside the cover `<div>`), add the coming-soon note:

```jsx
        {comingSoon && !initialPageHref && (
          <div className="absolute inset-x-0 bottom-8 flex justify-center">
            <span className="px-4 py-2 text-sm text-white/90 bg-black/40 rounded">Coming soon</span>
          </div>
        )}
```

- [ ] **Step 5: Under-construction for cover-off + no pages**

In the non-cover render, replace the `homePage ? ( … ) : ( <div>No content yet.</div> )` else branch's fallback:

```jsx
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-gray-400">
            No content yet.
          </div>
        )}
```
with:
```jsx
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-1 text-center text-gray-400">
            <span className="text-sm">This site is under construction.</span>
          </div>
        )}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest __tests__/pages/publicPortfolioEmpty.test.js`
Expected: PASS. If `PageCover` pulls in ESM/asset imports that jsdom can't parse, mock it at the top of the test with `jest.mock('@/components/image-displays/page/PageCover', () => ({ __esModule: true, default: ({ primaryButton }) => <button>{primaryButton?.label}</button> }))` and keep the cover-on assertion focused on the button label.

- [ ] **Step 7: Commit**

```bash
git add "pages/sites/[username]/index.js" __tests__/pages/publicPortfolioEmpty.test.js
git commit -m "feat: published site renders cover-only + coming-soon CTA + under-construction with zero pages"
```

---

### Task 9: Default the admin to the cover when a site has no pages

With zero pages a fresh site should open on the cover (it's on by default), not a blank canvas.

**Files:**
- Modify: `pages/admin/index.js` (initial selection effect, ~line 280)

**Interfaces:**
- Consumes: `coverSelected` state (Task 4), `siteConfig.hasCoverPage`.

- [ ] **Step 1: Point the initial selection at the cover when there are no pages**

In `pages/admin/index.js`, find the effect/logic that currently does `setSelectedPageId(siteConfig?.pages?.find(p => p.id === 'home')?.id || null)` (~line 280). Replace it so that, on first load of a config:
- if there are no non-link pages and the cover is on → select the cover;
- otherwise select the resolved home page.

```js
    const pages = siteConfig?.pages || []
    const firstReal = pages.find(p => p.type !== 'link')
    if (!firstReal && siteConfig?.hasCoverPage !== false) {
      setCoverSelected(true)
      setSelectedPageId(null)
    } else {
      setCoverSelected(false)
      setSelectedPageId(firstReal?.id || null)
    }
```

(Adjust the surrounding effect to keep its existing dependency array and guards; only the body that computes the initial selection changes.)

- [ ] **Step 2: Verify unit safety net**

Run: `npx jest __tests__/common`
Expected: PASS. (Full admin behavior is verified in Task 10's dogfood.)

- [ ] **Step 3: Commit**

```bash
git add pages/admin/index.js
git commit -m "feat: admin opens on the cover when a site has no pages yet"
```

---

### Task 10: Full verification + dogfood

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: PASS. Fix any regressions in the seeded-page tests you didn't catch (search the repo for `id: 'home'` and `p.id === 'home'` to confirm none remain except intentional history).

Run: `grep -rn "p.id === 'home'\|id: 'home'\|id === \"home\"" common components pages | grep -v node_modules`
Expected: no functional matches remain (only unrelated strings, if any).

- [ ] **Step 2: Dogfood the flow in the running dev app**

The dev server runs on http://localhost:3000 (this workspace). Use the `/browse` skill (gstack) — never `next build` over the live dev server. Verify:
1. **Fresh site / no pages:** sidebar shows the Theme bar, then a "Cover page" row (with the warm gradient thumb), then an empty Pages section. The preview shows the cover. Clicking the cover's CTA shows "Coming soon".
2. **Add first page:** it appears under Pages and immediately shows the home icon on its thumbnail.
3. **Cover row:** clicking it opens the cover editor; toggling the cover off (via Site Settings) turns the row into a muted "Add a cover page" that re-enables on click.
4. **Theme bar:** changing the dropdown swaps the theme live; the brush icon opens the design popover with Logo font / Navigation / Nested pages / Social links and **no** Theme section.
5. **Published site** (open the public URL): cover-only with a working CTA once a page exists; with the cover off and no pages, an "under construction" message.

- [ ] **Step 3: Final commit (if any dogfood fixes were needed)**

```bash
git add -A
git commit -m "fix: dogfood adjustments for sidebar cover/theme/home"
```

---

## Self-Review

**Spec coverage:**
- D1 remove seed → Task 1. D2 cover as settings + `coverSelected` → Task 4. D3 first page → home → Tasks 2-3. D4 cover row → Task 5. D5 theme bar + shared controls → Tasks 6-7. D6 empty states / coming-soon CTA → Tasks 4 (admin), 8 (published). Cover fallback thumbnail → Task 5. Initial-selection to cover → Task 9. All spec sections map to a task.

**Placeholder scan:** No TBD/TODO; every code step shows real code. The one conditional instruction (Task 8 Step 6 PageCover mock) is a concrete fallback, not a placeholder.

**Type consistency:** `resolveHomePage(config)` and `assignHomeOnCreate(config, newPage)` are defined in Task 2 and consumed with those exact signatures in Tasks 3, 8. `coverSelected` / `onSelectCover` produced in Task 4 are consumed in Task 5. `DesignControlsBody({ config, onChange, onEditHandles, includeTheme })` defined in Task 6, consumed in Tasks 6 (Site Settings) and 7 (ThemeBar). `CoverPageRow({ siteConfig, selected, onSelect, onEnableCover })` defined and consumed in Task 5. `themeOptions` / `BrushIcon` exported from `SiteSettingsPopover` and imported by `ThemeBar` in Task 7. Consistent.
