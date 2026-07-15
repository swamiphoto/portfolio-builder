# Editor Polish: Scrollbar, Status, Logo Font, Navigation, Footer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Design popup's dead nav/sub-nav/footer controls to real behavior, add a logo-font control, and polish the sidebar scrollbar and save/publish status label.

**Architecture:** Add one pure module (`common/siteDesign.js`) that normalizes the `design.*` config values at read time and provides wordmark/social helpers; consume it in `SiteNav`, `SiteFooter`, and `GalleryCover`. Config controls live in `SiteSettingsPopover`. Polish changes are localized to `PlatformSidebar`.

**Tech Stack:** Next.js (pages router), React, Tailwind, Jest + @testing-library/react.

## Global Constraints

- Store theme-independent data; the sidebar is the source of edits, the preview is read-only (editing invariant).
- No new fonts loaded — Inter and Fraunces are already available (`pages/_document.js`, `styles/globals.css`).
- Copy must read like real prose; avoid AI-tell patterns.
- Tests live in `__tests__/**/*.test.js`; run with `npm test`. Never run `next build` over the live dev server on :3000.
- Hover states on buttons with an inline `background` need `onMouseEnter/Leave` handlers, not `hover:` classes.
- Follow existing file patterns; keep files focused.

---

### Task 1: Design config foundation (`common/siteDesign.js` + defaults)

**Files:**
- Create: `common/siteDesign.js`
- Create: `__tests__/common/siteDesign.test.js`
- Modify: `common/siteConfig.js:48-53` (design defaults) and the `footer` default block

**Interfaces:**
- Produces:
  - `resolveNavMode(design) => 'links' | 'menu'`
  - `resolveSubNavStyle(design) => 'dropdown' | 'inline'`
  - `resolveFooter(siteConfig) => { hidden: boolean, layout: 'simple' | 'expanded' }`
  - `logoFontStyle(logoFont) => ({ fontFamily, textTransform, letterSpacing }) | null`
  - `socialHref(key, value) => string | null`
  - `SOCIAL_KEYS: string[]` = `['instagram','facebook','twitter','tiktok','youtube','website']`

- [ ] **Step 1: Write the failing test**

Create `__tests__/common/siteDesign.test.js`:

```js
import {
  resolveNavMode, resolveSubNavStyle, resolveFooter,
  logoFontStyle, socialHref, SOCIAL_KEYS,
} from '@/common/siteDesign'

describe('resolveNavMode', () => {
  it('returns menu only when explicitly menu', () => {
    expect(resolveNavMode({ navStyle: 'menu' })).toBe('menu')
  })
  it('normalizes legacy/unknown values to links', () => {
    expect(resolveNavMode({ navStyle: 'minimal' })).toBe('links')
    expect(resolveNavMode({ navStyle: 'centered' })).toBe('links')
    expect(resolveNavMode({})).toBe('links')
    expect(resolveNavMode(undefined)).toBe('links')
  })
})

describe('resolveSubNavStyle', () => {
  it('returns inline only when explicitly inline, else dropdown', () => {
    expect(resolveSubNavStyle({ subNavStyle: 'inline' })).toBe('inline')
    expect(resolveSubNavStyle({ subNavStyle: 'dropdown' })).toBe('dropdown')
    expect(resolveSubNavStyle({})).toBe('dropdown')
    expect(resolveSubNavStyle(undefined)).toBe('dropdown')
  })
})

describe('resolveFooter', () => {
  it('hides for explicit footer.hidden and legacy footerLayout none', () => {
    expect(resolveFooter({ footer: { hidden: true } }).hidden).toBe(true)
    expect(resolveFooter({ design: { footerLayout: 'none' } }).hidden).toBe(true)
  })
  it('picks expanded only when explicit, else simple', () => {
    expect(resolveFooter({ design: { footerLayout: 'expanded' } })).toEqual({ hidden: false, layout: 'expanded' })
    expect(resolveFooter({ design: { footerLayout: 'standard' } })).toEqual({ hidden: false, layout: 'simple' })
    expect(resolveFooter({})).toEqual({ hidden: false, layout: 'simple' })
  })
})

describe('logoFontStyle', () => {
  it('returns null for theme/default', () => {
    expect(logoFontStyle('theme')).toBeNull()
    expect(logoFontStyle(undefined)).toBeNull()
  })
  it('returns Inter uppercase for modern', () => {
    const s = logoFontStyle('modern')
    expect(s.fontFamily).toMatch(/Inter/)
    expect(s.textTransform).toBe('uppercase')
  })
  it('returns Fraunces non-uppercase for editorial', () => {
    const s = logoFontStyle('editorial')
    expect(s.fontFamily).toMatch(/Fraunces/)
    expect(s.textTransform).toBe('none')
  })
})

describe('socialHref', () => {
  it('passes through absolute urls', () => {
    expect(socialHref('instagram', 'https://instagram.com/x')).toBe('https://instagram.com/x')
  })
  it('builds a handle url and strips @', () => {
    expect(socialHref('instagram', '@ansel')).toBe('https://instagram.com/ansel')
  })
  it('builds website with https prefix', () => {
    expect(socialHref('website', 'ansel.com')).toBe('https://ansel.com')
  })
  it('returns null for empty values', () => {
    expect(socialHref('instagram', '')).toBeNull()
  })
  it('SOCIAL_KEYS lists the six social platforms', () => {
    expect(SOCIAL_KEYS).toEqual(['instagram','facebook','twitter','tiktok','youtube','website'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- siteDesign`
Expected: FAIL — cannot find module `@/common/siteDesign`.

- [ ] **Step 3: Write the module**

Create `common/siteDesign.js`:

```js
// Read-time normalization for the Design popup controls, plus wordmark and
// social-link helpers. These controls historically stored values that no render
// code consumed; these resolvers give them a single, defensive source of truth.

export function resolveNavMode(design) {
  return design?.navStyle === 'menu' ? 'menu' : 'links'
}

export function resolveSubNavStyle(design) {
  return design?.subNavStyle === 'inline' ? 'inline' : 'dropdown'
}

export function resolveFooter(siteConfig) {
  const design = siteConfig?.design || {}
  const footer = siteConfig?.footer || {}
  const hidden = footer.hidden === true || design.footerLayout === 'none'
  const layout = design.footerLayout === 'expanded' ? 'expanded' : 'simple'
  return { hidden, layout }
}

const INTER = '"Inter", -apple-system, BlinkMacSystemFont, ui-sans-serif, system-ui, sans-serif'
const FRAUNCES = '"Fraunces", Georgia, serif'

// Wordmark styling for the site-name logo. `null` = keep the theme's default.
export function logoFontStyle(logoFont) {
  if (logoFont === 'modern') return { fontFamily: INTER, textTransform: 'uppercase', letterSpacing: '0.16em' }
  if (logoFont === 'editorial') return { fontFamily: FRAUNCES, textTransform: 'none', letterSpacing: '0.01em' }
  return null
}

export const SOCIAL_KEYS = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'website']

const SOCIAL_BASE = {
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  twitter: 'https://twitter.com/',
  tiktok: 'https://tiktok.com/@',
  youtube: 'https://youtube.com/',
}

export function socialHref(key, value) {
  if (!value) return null
  const v = String(value).trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  if (key === 'website') return `https://${v.replace(/^\/+/, '')}`
  const base = SOCIAL_BASE[key]
  if (!base) return null
  return base + v.replace(/^@+/, '')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- siteDesign`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Update config defaults**

In `common/siteConfig.js`, change the `design` default block (currently lines ~48-53) to:

```js
    design: {
      theme: 'kyoto',
      navStyle: 'links',
      subNavStyle: 'dropdown',
      footerLayout: 'simple',
    },
```

Then find the `footer:` default block in the same file and add `hidden: false`. If the block is e.g. `footer: { customText: '...' }`, make it:

```js
    footer: {
      customText: '',
      hidden: false,
    },
```

Add `logoFont: 'theme',` alongside the existing `logoType` default in the same config object (search for `logoType`).

- [ ] **Step 6: Run the full suite to confirm nothing broke**

Run: `npm test -- siteDesign` and `npm test -- siteConfig` (if a siteConfig test exists; otherwise skip).
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add common/siteDesign.js __tests__/common/siteDesign.test.js common/siteConfig.js
git commit -m "feat(design): add siteDesign resolvers + config defaults for nav/footer/logo"
```

---

### Task 2: Sidebar polish — scrollbar + status label

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js` — StatusLine (lines ~51-72), pages list container (line ~863)
- Test: `__tests__/components/platformStatus.test.js` (new)

**Interfaces:**
- Produces: `describeStatus({ saveStatus, hasUnpublishedChanges, lastSavedAt }) => string | null` (exported from `PlatformSidebar.js`). `null` means "reserve empty space".

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/platformStatus.test.js`:

```js
import { describeStatus } from '@/components/admin/platform/PlatformSidebar'

describe('describeStatus', () => {
  it('reports saving and error states', () => {
    expect(describeStatus({ saveStatus: 'saving' })).toBe('Saving…')
    expect(describeStatus({ saveStatus: 'error' })).toBe('Save failed')
  })
  it('reports a single "Changes made" line for unpublished edits', () => {
    const now = Date.now()
    expect(describeStatus({ hasUnpublishedChanges: true, lastSavedAt: now })).toBe('Changes made just now')
  })
  it('returns null when there is nothing to say (published/idle)', () => {
    expect(describeStatus({ hasUnpublishedChanges: false, lastPublishedAt: Date.now() })).toBeNull()
    expect(describeStatus({})).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- platformStatus`
Expected: FAIL — `describeStatus` is not exported.

- [ ] **Step 3: Add and export `describeStatus`, rewrite `StatusLine`**

In `components/admin/platform/PlatformSidebar.js`, keep the existing `relativeTime` helper. Add an exported pure helper above `StatusLine`:

```js
export function describeStatus({ saveStatus, hasUnpublishedChanges, lastSavedAt } = {}) {
  if (saveStatus === 'saving') return 'Saving…'
  if (saveStatus === 'error') return 'Save failed'
  if (hasUnpublishedChanges) return `Changes made ${lastSavedAt ? relativeTime(lastSavedAt) : 'just now'}`
  return null
}
```

Replace the `StatusLine` function body (lines ~51-72) with:

```js
function StatusLine({ saveStatus, hasUnpublishedChanges, lastSavedAt, lastPublishedAt }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const base = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.04em', textAlign: 'center', marginTop: 7, marginBottom: 6 }
  const text = describeStatus({ saveStatus, hasUnpublishedChanges, lastSavedAt })
  const color = saveStatus === 'error' ? '#c0392b'
    : hasUnpublishedChanges ? '#c2872f'
    : C.textFaint

  // Reserve exactly one line's height so the label appearing/disappearing never
  // shifts the pages list below it.
  if (!text) return <div style={{ ...base, visibility: 'hidden' }} aria-hidden>Changes made just now</div>
  return <div style={{ ...base, color }}>{text}</div>
}
```

Note: `lastPublishedAt` is no longer rendered (the publish toast covers it) but stays in the prop list so the call site at line ~845 needs no change.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- platformStatus`
Expected: PASS.

- [ ] **Step 5: Apply the thin scrollbar to the pages list**

In `components/admin/platform/PlatformSidebar.js`, change the pages list container (line ~863) from:

```js
      <div className="flex-1 overflow-y-auto">
```

to:

```js
      <div className="flex-1 overflow-y-auto scroll-thin">
```

- [ ] **Step 6: Tune the scroll thumb to blend into the sidebar (optional but preferred)**

In `styles/globals.css`, the `.scroll-thin` hover thumb color is `rgba(160,140,110,0.35)`. If it reads too warm against the sidebar panel, soften to `rgba(120,90,60,0.28)` in both the `:hover` `scrollbar-color` and `:hover::-webkit-scrollbar-thumb` `background` rules. Leave the track transparent.

- [ ] **Step 7: Manual verification**

With the dev server on :3000, open the admin editor for a site with many pages. Confirm: (a) the pages-list scrollbar is thin, has no white track, and its thumb only appears on hover; (b) editing shows one line "Changes made X"; (c) after publishing, the status area is empty (toast only) and the pages list does not shift; (d) the gap above "Pages" is tighter than before.

- [ ] **Step 8: Commit**

```bash
git add components/admin/platform/PlatformSidebar.js __tests__/components/platformStatus.test.js styles/globals.css
git commit -m "feat(sidebar): thin hover scrollbar + single-line status label"
```

---

### Task 3: SiteNav — logo font styling on the wordmark

**Files:**
- Modify: `components/image-displays/page/SiteNav.js` (brand definition ~155-159; the three nav renderings)
- Test: `__tests__/components/SiteNavLogoFont.test.js` (new)

**Interfaces:**
- Consumes: `logoFontStyle` from `common/siteDesign` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/SiteNavLogoFont.test.js`:

```js
import { render, screen } from '@testing-library/react'
import SiteNav from '@/components/image-displays/page/SiteNav'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/me' }) }))

const cfg = (extra = {}) => ({
  siteName: 'Ansel A',
  pages: [{ id: 'work', title: 'Work', slug: 'work', showInNav: true, type: 'page' }],
  ...extra,
})

describe('SiteNav logo font', () => {
  it('applies Inter uppercase for logoFont=modern on the left rail', () => {
    render(<SiteNav siteConfig={cfg({ logoFont: 'modern' })} username="me" variant="left-rail" basePath="/sites/me" />)
    const brand = screen.getByText('Ansel A')
    expect(brand.style.fontFamily).toMatch(/Inter/)
    expect(brand.style.textTransform).toBe('uppercase')
  })
  it('leaves the wordmark unstyled for logoFont=theme', () => {
    render(<SiteNav siteConfig={cfg({ logoFont: 'theme' })} username="me" variant="left-rail" basePath="/sites/me" />)
    const brand = screen.getByText('Ansel A')
    expect(brand.style.fontFamily).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SiteNavLogoFont`
Expected: FAIL — brand has no inline fontFamily.

- [ ] **Step 3: Compute the wordmark style once and apply it**

In `components/image-displays/page/SiteNav.js`:

Add the import near the top (with the other `common/` imports):

```js
import { logoFontStyle } from '../../../common/siteDesign'
```

After the `brand` definition (~line 159) add:

```js
  // Wordmark font only applies to the site-name logo, never an uploaded image.
  const logoStyle = logoImage ? null : logoFontStyle(siteConfig?.logoFont)
```

Apply `logoStyle` to every element that renders `{brand}` by merging it into that element's `style`. There are five sites; update each:

1. Left-rail mobile button (~173): add `style={logoStyle || undefined}`.
2. Left-rail mobile link (~175): merge — `style={{ textDecoration: 'none', color: 'inherit', ...(logoStyle || {}) }}`.
3. Left-rail desktop button (~207): add `style={logoStyle || undefined}`.
4. Left-rail desktop link (~209): merge — `style={{ textDecoration: 'none', color: 'inherit', ...(logoStyle || {}) }}`.
5. Header-dropdown button/link (~242, ~244): add `style={logoStyle || undefined}` to each.

For the default/cover-embedded path, the brand is rendered inside `NavList`/hamburger (Tasks 4–5). The logo in that path is not a separate element today — the cover renders the site name via `GalleryCover`, not `SiteNav`. So the default path needs no brand style change here; leave it.

Note: inline `style` overrides Tailwind classes (e.g. `uppercase`, `tracking-*`), so `textTransform: 'none'` for the editorial option correctly cancels an `uppercase` class.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SiteNavLogoFont`
Expected: PASS.

- [ ] **Step 5: Run the existing SiteNav suite for regressions**

Run: `npm test -- SiteNav`
Expected: PASS (including `SiteNavLeftRail`).

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/page/SiteNav.js __tests__/components/SiteNavLogoFont.test.js
git commit -m "feat(nav): apply logo font styling to the site-name wordmark"
```

---

### Task 4: Sub-navigation dropdown in the main nav

**Files:**
- Modify: `components/image-displays/page/SiteNav.js` (add a dropdown-capable nav item for the top-nav path; left-rail indented children)
- Modify: `components/image-displays/gallery/Gallery.js` (compute inline flag, pass to cover)
- Modify: `components/image-displays/gallery/gallery-cover/GalleryCover.js` (gate the inline child list)
- Test: `__tests__/components/SiteNavSubNav.test.js` (new)

**Interfaces:**
- Consumes: `resolveSubNavStyle` from `common/siteDesign` (Task 1); `buildNavTree` already provides `children` on each item.
- Produces: `GalleryCover` gains a `showChildNav` boolean prop (default `true` for back-compat).

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/SiteNavSubNav.test.js`:

```js
import { render, screen, fireEvent } from '@testing-library/react'
import SiteNav from '@/components/image-displays/page/SiteNav'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/me' }) }))

const withChildren = (subNavStyle) => ({
  siteName: 'Ansel A',
  design: { theme: 'kyoto', subNavStyle },
  pages: [
    { id: 'work', title: 'Work', slug: 'work', showInNav: true, type: 'page' },
    { id: 'portraits', title: 'Portraits', slug: 'portraits', parentId: 'work', showInNav: true, type: 'page' },
  ],
})

describe('SiteNav sub-nav dropdown (cover-embedded)', () => {
  it('shows a caret for a parent and reveals children on click when dropdown', () => {
    render(<SiteNav siteConfig={withChildren('dropdown')} username="me" variant="cover-embedded" basePath="/sites/me" />)
    const trigger = screen.getByRole('button', { name: /Work/ })
    expect(screen.queryByText('Portraits')).not.toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.getByText('Portraits')).toBeInTheDocument()
  })
  it('does not render a dropdown when subNavStyle is inline', () => {
    render(<SiteNav siteConfig={withChildren('inline')} username="me" variant="cover-embedded" basePath="/sites/me" />)
    expect(screen.queryByText('Portraits')).not.toBeInTheDocument()
    // Parent renders as a plain link, no caret trigger button
    expect(screen.queryByRole('button', { name: /Work/ })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SiteNavSubNav`
Expected: FAIL — the default nav path renders a plain `NavList` with no dropdown/caret.

- [ ] **Step 3: Add a dropdown-capable nav item and use it in the top-nav paths**

In `components/image-displays/page/SiteNav.js`:

Add the import:

```js
import { resolveSubNavStyle } from '../../../common/siteDesign'
```

Add a new component above `NavList`:

```js
// A single top-level nav item. When it has children and the site uses the
// "dropdown" sub-nav style, it shows a caret and reveals a themed menu of its
// subpages; the parent label still navigates to the parent page.
function NavItem({ item, basePath, dark, currentPath, currentPageId, onPageClick, subNavMode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const children = item.children || []
  const hasDropdown = subNavMode === 'dropdown' && children.length > 0
  const active = navItemActive(item, { currentPageId, currentPath, basePath })

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!hasDropdown) {
    return <NavLink item={item} basePath={basePath} dark={dark} active={active} onPageClick={onPageClick} />
  }

  const menuBg = dark ? '#1a120a' : '#fffdf9'
  const menuBorder = dark ? 'rgba(255,255,255,0.14)' : 'rgba(26,18,10,0.12)'
  const muted = dark ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-900'

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        onClick={() => setOpen(o => !o)}
        className={navItemClass(dark, active)}
        aria-haspopup="true" aria-expanded={open}
      >
        {item.title} <span aria-hidden style={{ fontSize: '0.7em' }}>▾</span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-3 py-2 min-w-[168px] z-40 rounded-sm"
          style={{ background: menuBg, border: `1px solid ${menuBorder}`, boxShadow: '0 8px 28px rgba(26,18,10,0.14)' }}
        >
          {children.map(child => {
            const cActive = navItemActive(child, { currentPageId, currentPath, basePath })
            return (
              <div key={child.id} className={`px-5 py-1.5 font-serif text-base ${muted} ${cActive ? (dark ? 'text-white underline' : 'text-gray-900 underline') : ''}`}>
                <NavLink item={child} basePath={basePath} dark={dark} active={cActive} onPageClick={onPageClick} onClose={() => setOpen(false)} />
              </div>
            )
          })}
        </div>
      )}
    </span>
  )
}
```

Update `NavList` to use `NavItem` and accept `subNavMode`:

```js
function NavList({ items, basePath, dark = false, currentPath = '', currentPageId, onPageClick, onClose, subNavMode = 'dropdown' }) {
  return (
    <ul className="flex gap-8">
      {items.map(item => (
        <li key={item.id}>
          <NavItem item={item} basePath={basePath} dark={dark}
            currentPath={currentPath} currentPageId={currentPageId}
            onPageClick={onPageClick} subNavMode={subNavMode} />
        </li>
      ))}
    </ul>
  )
}
```

In the default/cover-embedded `return` (currently `<nav className="absolute top-6 right-8 z-10">`), pass the resolved mode. First compute it once inside the `SiteNav` component body (near where `style` is derived):

```js
  const subNavMode = resolveSubNavStyle(siteConfig?.design)
```

Then:

```js
  return (
    <nav className="absolute top-6 right-8 z-10">
      <NavList items={tree} basePath={basePath} dark currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick} subNavMode={subNavMode} />
    </nav>
  )
```

(Leave `OverflowNav` for the legacy `header-dropdown` path as best-effort; do not change it in this task.)

- [ ] **Step 4: Left-rail indented children**

In the left-rail desktop nav (`<ul className="flex flex-col gap-2">`, ~211-225), render each item's children indented beneath it, independent of the dropdown/inline toggle. Replace the `tree.map(...)` body so that after each parent `<li>` you also render its children:

```js
            {tree.map(item => {
              const isLink = item.type === 'link'
              const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
              const isActive = navItemActive(item, { currentPageId, currentPath, basePath })
              const cls = `text-sm uppercase tracking-[0.12em] transition-colors ${isActive ? 'text-black underline' : 'text-black/50 hover:text-black'}`
              const kids = item.children || []
              return (
                <li key={item.id}>
                  {onPageClick && !isLink
                    ? <button onClick={() => onPageClick(item.id)} className={cls}>{item.title}</button>
                    : <a href={href} target={isLink ? '_blank' : undefined} rel={isLink ? 'noopener noreferrer' : undefined} className={cls} style={{ textDecoration: 'none' }}>{item.title}</a>}
                  {kids.length > 0 && (
                    <ul className="flex flex-col gap-1.5 mt-1.5 ml-3">
                      {kids.map(child => {
                        const cActive = navItemActive(child, { currentPageId, currentPath, basePath })
                        const cCls = `text-xs uppercase tracking-[0.10em] transition-colors ${cActive ? 'text-black underline' : 'text-black/40 hover:text-black'}`
                        const cHref = `${basePath}/${child.slug || child.id}`
                        return (
                          <li key={child.id}>
                            {onPageClick
                              ? <button onClick={() => onPageClick(child.id)} className={cCls}>{child.title}</button>
                              : <a href={cHref} className={cCls} style={{ textDecoration: 'none' }}>{child.title}</a>}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
```

- [ ] **Step 5: Gate the inline child list in the cover**

In `components/image-displays/gallery/gallery-cover/GalleryCover.js`, add a `showChildNav = true` prop and gate the child list on it. Change the signature (line 4) to include `showChildNav = true`, and change `const hasChildNav = childPages?.length > 0` (line 5) to:

```js
  const hasChildNav = showChildNav && childPages?.length > 0
```

In `components/image-displays/gallery/Gallery.js`, compute the inline flag from config and pass it to `GalleryCover`. Add the import:

```js
import { resolveSubNavStyle } from '../../../common/siteDesign'
```

At the `GalleryCover` call site (~line 125), add:

```js
showChildNav={resolveSubNavStyle(siteConfig?.design) === 'inline'}
```

This makes subpages appear inline under the title **only** in inline mode; in dropdown mode they live in the nav dropdown instead.

- [ ] **Step 6: Run tests**

Run: `npm test -- SiteNavSubNav` then `npm test -- SiteNav`
Expected: PASS (new sub-nav tests green, existing left-rail tests still green).

- [ ] **Step 7: Manual verification**

On :3000, add a page nested under a nav item. With Sub-navigation = Dropdown, the parent in the top nav shows a caret and the subpage appears in a styled dropdown (in both preview and the published `/sites/...` view), and the subpage no longer appears inline under the cover title. Switch to "Links below page title": the dropdown disappears and the subpage shows under the title. On the Manhattan theme, the subpage appears indented under its parent in the left rail.

- [ ] **Step 8: Commit**

```bash
git add components/image-displays/page/SiteNav.js components/image-displays/gallery/Gallery.js components/image-displays/gallery/gallery-cover/GalleryCover.js __tests__/components/SiteNavSubNav.test.js
git commit -m "feat(nav): real sub-nav dropdown for parent links + left-rail indented children"
```

---

### Task 5: Navigation "Menu" (hamburger) mode for the top-nav theme

**Files:**
- Modify: `components/image-displays/page/SiteNav.js` (default/cover-embedded path)
- Test: `__tests__/components/SiteNavMenuMode.test.js` (new)

**Interfaces:**
- Consumes: `resolveNavMode` from `common/siteDesign` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/SiteNavMenuMode.test.js`:

```js
import { render, screen, fireEvent } from '@testing-library/react'
import SiteNav from '@/components/image-displays/page/SiteNav'

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/sites/me' }) }))

const cfg = (navStyle) => ({
  siteName: 'Ansel A',
  design: { theme: 'kyoto', navStyle },
  pages: [
    { id: 'work', title: 'Work', slug: 'work', showInNav: true, type: 'page' },
    { id: 'about', title: 'About', slug: 'about', showInNav: true, type: 'page' },
  ],
})

describe('SiteNav menu mode (cover-embedded)', () => {
  it('renders inline links (no hamburger) when navStyle=links', () => {
    render(<SiteNav siteConfig={cfg('links')} username="me" variant="cover-embedded" basePath="/sites/me" />)
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.queryByLabelText('Open menu')).not.toBeInTheDocument()
  })
  it('renders a hamburger that opens an overlay of nav items when navStyle=menu', () => {
    render(<SiteNav siteConfig={cfg('menu')} username="me" variant="cover-embedded" basePath="/sites/me" />)
    expect(screen.queryByText('Work')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Open menu'))
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SiteNavMenuMode`
Expected: FAIL — the default path always renders inline links; no hamburger.

- [ ] **Step 3: Branch the default path on nav mode**

In `components/image-displays/page/SiteNav.js`, compute the mode once in the component body (near `subNavMode` from Task 4):

```js
  const navMode = resolveNavMode(siteConfig?.design)
```

Add the import:

```js
import { resolveNavMode } from '../../../common/siteDesign'
```

Replace the final default `return` (`<nav className="absolute top-6 right-8 z-10">...`) with a branch:

```js
  if (navMode === 'menu') {
    return (
      <>
        <button
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
          className="absolute top-6 right-8 z-20 p-2 text-white"
        >
          <RxHamburgerMenu className="h-6 w-6" />
        </button>
        {isMenuOpen && (
          <nav
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6"
            style={{ background: 'var(--theme-bg, #1a120a)', color: 'var(--theme-text, #f5efe6)' }}
            aria-label="Site navigation"
          >
            <button onClick={() => setIsMenuOpen(false)} aria-label="Close menu" className="absolute top-5 right-5 p-2">
              <TfiClose className="h-5 w-5" />
            </button>
            {tree.map(item => {
              const isLink = item.type === 'link'
              const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
              const cls = 'font-serif text-2xl'
              return onPageClick && !isLink ? (
                <button key={item.id} onClick={() => { onPageClick(item.id); setIsMenuOpen(false) }} className={cls}>{item.title}</button>
              ) : (
                <a key={item.id} href={href} target={isLink ? '_blank' : undefined} rel={isLink ? 'noopener noreferrer' : undefined} className={cls} style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setIsMenuOpen(false)}>{item.title}</a>
              )
            })}
          </nav>
        )}
      </>
    )
  }

  return (
    <nav className="absolute top-6 right-8 z-10">
      <NavList items={tree} basePath={basePath} dark currentPath={currentPath} currentPageId={currentPageId} onPageClick={onPageClick} subNavMode={subNavMode} />
    </nav>
  )
```

`RxHamburgerMenu` and `TfiClose` are already imported at the top of the file; `isMenuOpen`/`setIsMenuOpen` already exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SiteNavMenuMode`
Expected: PASS.

- [ ] **Step 5: Run the full SiteNav suite**

Run: `npm test -- SiteNav`
Expected: PASS (menu, sub-nav, logo font, left-rail all green).

- [ ] **Step 6: Manual verification**

On :3000, on the Kyoto-style theme set Navigation = Menu (Task 7 wires the control). The top links are replaced by a hamburger at top-right; clicking opens a full-screen overlay listing the nav items; selecting one navigates and closes. Navigation = Links restores inline links.

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/page/SiteNav.js __tests__/components/SiteNavMenuMode.test.js
git commit -m "feat(nav): hamburger Menu mode with desktop overlay for top-nav theme"
```

---

### Task 6: Footer — simple / expanded / hidden

**Files:**
- Modify: `components/image-displays/page/SiteFooter.js`
- Test: `__tests__/components/SiteFooter.test.js` (new)

**Interfaces:**
- Consumes: `resolveFooter`, `socialHref`, `SOCIAL_KEYS` from `common/siteDesign` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/SiteFooter.test.js`:

```js
import { render, screen } from '@testing-library/react'
import SiteFooter from '@/components/image-displays/page/SiteFooter'

describe('SiteFooter', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<SiteFooter siteConfig={{ siteName: 'A', footer: { hidden: true } }} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('simple layout shows the copyright line only', () => {
    render(<SiteFooter siteConfig={{ siteName: 'Ansel', design: { footerLayout: 'simple' } }} />)
    expect(screen.getByText(/Ansel/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
  it('expanded layout shows social links from contact', () => {
    render(<SiteFooter siteConfig={{ siteName: 'Ansel', design: { footerLayout: 'expanded' }, contact: { instagram: '@ansel', website: 'ansel.com' } }} />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map(a => a.getAttribute('href'))
    expect(hrefs).toContain('https://instagram.com/ansel')
    expect(hrefs).toContain('https://ansel.com')
  })
  it('expanded with no contacts falls back to the copyright line only', () => {
    render(<SiteFooter siteConfig={{ siteName: 'Ansel', design: { footerLayout: 'expanded' }, contact: {} }} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(/Ansel/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SiteFooter`
Expected: FAIL — current footer ignores layout/hidden and renders no links.

- [ ] **Step 3: Rewrite `SiteFooter`**

Replace `components/image-displays/page/SiteFooter.js` with:

```js
// components/image-displays/page/SiteFooter.js
import { resolveFooter, socialHref, SOCIAL_KEYS } from '../../../common/siteDesign'

const CG = '"Cormorant Garamond", "Cormorant", Georgia, serif'
const LABELS = { instagram: 'Instagram', facebook: 'Facebook', twitter: 'Twitter', tiktok: 'TikTok', youtube: 'YouTube', website: 'Website' }

export default function SiteFooter({ siteConfig }) {
  const { hidden, layout } = resolveFooter(siteConfig)
  if (hidden) return null

  const custom = siteConfig?.footer?.customText
  const name = siteConfig?.siteName || ''
  const text = custom || `© ${new Date().getFullYear()} ${name}`.trim()

  const contact = siteConfig?.contact || {}
  const socials = layout === 'expanded'
    ? SOCIAL_KEYS.map(k => ({ k, href: socialHref(k, contact[k]) })).filter(s => s.href)
    : []

  if (!text && socials.length === 0) return null

  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        fontFamily: CG,
        fontSize: '1rem',
        letterSpacing: '0.01em',
        color: 'var(--theme-text-muted, #7a6b55)',
      }}
    >
      {socials.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.75rem', marginBottom: '1rem' }}>
          {socials.map(({ k, href }) => (
            <a
              key={k}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}
            >
              {LABELS[k]}
            </a>
          ))}
        </div>
      )}
      {text && <div>{text}</div>}
    </footer>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SiteFooter`
Expected: PASS.

- [ ] **Step 5: Manual verification**

On :3000, set Footer = Expanded on a site with Instagram/website contact links → social links render above the copyright line. Footer = Simple → copyright only. Toggle footer off → footer disappears.

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/page/SiteFooter.js __tests__/components/SiteFooter.test.js
git commit -m "feat(footer): simple/expanded layouts with social links + hide toggle"
```

---

### Task 7: Design popup controls

**Files:**
- Modify: `components/admin/platform/SiteSettingsPopover.js` (Logo block ~653-685; Design popover ~768-816)

**Interfaces:**
- Consumes: `resolveNavStyle` from `common/navStyles` (gate the Navigation control); existing `DesignSection`, `DesignPillToggle`, `DesignNumberToggle`, `DesignSelect`.

- [ ] **Step 1: Add the logo-font control (site-name logos only)**

In `components/admin/platform/SiteSettingsPopover.js`, inside the Logo block, after the `DesignPillToggle` for `logoType` (~line 676, the closing of the `mb-2.5` wrapper) and before the `{logoType === 'image' && (...)}` asset field, add:

```jsx
          {logoType === 'sitename' && (
            <div className="mt-2.5">
              <DesignPillToggle
                value={config.logoFont || 'theme'}
                onChange={(v) => update({ logoFont: v })}
                options={[
                  { value: 'theme',     label: 'Default'   },
                  { value: 'modern',    label: 'Modern'    },
                  { value: 'editorial', label: 'Editorial' },
                ]}
              />
            </div>
          )}
```

- [ ] **Step 2: Reduce Navigation to two options and gate by theme**

Add the import at the top of the file (with the other `common/` imports):

```js
import { resolveNavStyle } from '../../../common/navStyles'
```

Replace the Navigation `DesignSection` (~781-791) with a theme-gated two-option toggle:

```jsx
          {resolveNavStyle(config.design?.theme || 'kyoto') !== 'left-rail' && (
            <DesignSection label="Navigation">
              <DesignNumberToggle
                value={config.design?.navStyle === 'menu' ? 'menu' : 'links'}
                onChange={(v) => update({ design: { ...(config.design || {}), navStyle: v } })}
                options={[
                  { value: 'links', label: '1', title: 'Links' },
                  { value: 'menu',  label: '2', title: 'Menu'  },
                ]}
              />
            </DesignSection>
          )}
```

- [ ] **Step 3: Footer — two options numbered from 1, plus a hide toggle**

Replace the Footer Layout `DesignSection` (~803-814) with:

```jsx
          <DesignSection label="Footer">
            <div className="flex items-center justify-between gap-3">
              <ToggleSwitch
                on={config.footer?.hidden !== true}
                onClick={() => updateFooter({ hidden: !(config.footer?.hidden === true) })}
              />
              <DesignNumberToggle
                value={config.design?.footerLayout === 'expanded' ? 'expanded' : 'simple'}
                onChange={(v) => update({ design: { ...(config.design || {}), footerLayout: v } })}
                options={[
                  { value: 'simple',   label: '1', title: 'Simple'   },
                  { value: 'expanded', label: '2', title: 'Expanded' },
                ]}
              />
            </div>
          </DesignSection>
```

`ToggleSwitch` and `updateFooter` are already used elsewhere in this file (search to confirm the exact prop shape: `ToggleSwitch` takes `on` + `onClick`; `updateFooter(patch)` merges into `config.footer`). If `updateFooter` is not in scope inside the Design popover, use `update({ footer: { ...(config.footer || {}), hidden: !(config.footer?.hidden === true) } })` instead.

- [ ] **Step 4: Manual verification**

On :3000:
- Logo = "Site name" shows the Default/Modern/Editorial toggle; Logo = "Image" hides it; switching changes the wordmark on the site.
- On the Kyoto theme, Navigation shows options 1 (Links) / 2 (Menu) and drives the site; selecting the Manhattan (left-rail) theme hides the Navigation control.
- Footer shows the on/off switch + 1 (Simple) / 2 (Expanded); toggling drives the footer.
- Confirm all changes autosave and survive a publish.

- [ ] **Step 5: Commit**

```bash
git add components/admin/platform/SiteSettingsPopover.js
git commit -m "feat(design-popup): logo font, 2-option nav (theme-gated), footer layout + hide"
```

---

## Self-Review

**Spec coverage:**
- §1 Scrollbar → Task 2 (Steps 5–6). ✓
- §2 Status label → Task 2 (Steps 1–4). ✓
- §3 Logo font (config + render + control) → Task 1 (defaults), Task 3 (render), Task 7 Step 1 (control). ✓
- §4 Navigation 2-option + menu → Task 5 (render), Task 7 Step 2 (control + theme gating). ✓
- §5 Sub-nav dropdown + inline gating + left-rail children → Task 4. ✓
- §6 Footer layouts + hide → Task 1 (`resolveFooter`), Task 6 (render), Task 7 Step 3 (control). ✓
- Read-time normalization of `design.*` → Task 1 resolvers. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. One implementer choice is flagged explicitly (Task 7 Step 3 `updateFooter` fallback) with the exact alternative given. ✓

**Type consistency:** `resolveNavMode`/`resolveSubNavStyle`/`resolveFooter`/`logoFontStyle`/`socialHref`/`SOCIAL_KEYS` are defined in Task 1 and consumed with matching names/signatures in Tasks 3–7. `GalleryCover` gains `showChildNav` (Task 4) consumed from `Gallery`. `describeStatus` defined and consumed within Task 2. `subNavMode` prop on `NavList`/`NavItem` consistent across Tasks 4–5. ✓
