# Manhattan Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Manhattan theme into a clean editorial split-pane: fixed serif left rail, left-anchored content with right-side air, a thin hero "strip" at the top, sharp-cornered images with inside hover captions, and no full-bleed/centered layout options.

**Architecture:** Manhattan is data-only (`common/themes/manhattan.js` tokens + overrides); render code lives in shared components gated on `themeId === 'manhattan'` or `[data-theme="manhattan"]` CSS. We add two Manhattan-specific render components (`ManhattanHero`, rewrite `ManhattanGrid`), one shared `HoverCaption`, a handful of `themeId`-gated branches in `Gallery.js`/`PageCover.js`/`SiteNav.js`, and a block of scoped CSS. Stored block data stays theme-independent — variant collapse happens at resolution/render time, so switching themes is lossless.

**Tech Stack:** Next.js (pages router), React, Tailwind CSS, Jest + React Testing Library.

## Global Constraints

- **Scope is Manhattan only.** Every change must be gated on `themeId === 'manhattan'` (JS) or `[data-theme="manhattan"]` (CSS). Kyoto and other themes must render byte-for-byte identically. Existing tests (`GalleryThemeVariants`, `PageCover`, `SiteNavLeftRail`, etc.) must stay green.
- **Menu/logo serif font:** Fraunces, via the Tailwind class `font-fraunces` (already configured in `tailwind.config.js`). Sentence-case, no letter-spacing.
- **Accent color:** muted terracotta `#b5502e`, exposed as the CSS token `--theme-accent` on `manhattan.js`.
- **Hero buttons:** `View Music` (when a slideshow exists) and `Packages` (when purchase feature + packages exist). **No `Client Login` button** anywhere in Manhattan.
- **No `next build`** over the running dev server (workspace runs `next dev` on port 3000). Run `npm test` for verification; use the `/browse` skill on `localhost:3000` for visual dogfood.
- **Never commit `.env.local`.** Commit only source + test + doc files.
- Run tests with: `npx jest <path> --silent=false`.

---

### Task 1: Theme spec — tokens, single-photo lock, left-only align, no video full-bleed

**Files:**
- Modify: `common/themes/manhattan.js`
- Modify: `common/themes/base.js` (extend `mergeBlockSpec` to honor an `aligns` override)
- Modify: `components/admin/gallery-builder/DesignPopover.js:33` (hide the align control when only one align is offered)
- Test: `__tests__/themes/manhattanSpec.test.js` (new)

**Interfaces:**
- Produces: `getBlockSpec('manhattan', 'photo').variants` has length 1 (id `single`); `getBlockSpec('manhattan','text').aligns` === `['left']`; `getBlockSpec('manhattan','contact').aligns` === `['left']`; `getBlockSpec('manhattan','video').variants` excludes `full-bleed`; `getTheme('manhattan').tokens['--theme-accent']` === `'#b5502e'`.
- Consumes: `mergeBlockSpec(baseSpec, override)` from `base.js`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/themes/manhattanSpec.test.js`:

```javascript
import { getBlockSpec, getTheme } from '../../common/themes'

describe('manhattan theme spec', () => {
  it('exposes a terracotta accent token', () => {
    expect(getTheme('manhattan').tokens['--theme-accent']).toBe('#b5502e')
  })

  it('locks single photo to one no-choice variant', () => {
    const spec = getBlockSpec('manhattan', 'photo')
    expect(spec.variants.map(v => v.id)).toEqual(['single'])
    expect(spec.defaultVariant).toBe('single')
  })

  it('offers only left alignment for text and contact', () => {
    expect(getBlockSpec('manhattan', 'text').aligns).toEqual(['left'])
    expect(getBlockSpec('manhattan', 'text').defaultAlign).toBe('left')
    expect(getBlockSpec('manhattan', 'contact').aligns).toEqual(['left'])
    expect(getBlockSpec('manhattan', 'contact').defaultAlign).toBe('left')
  })

  it('drops full-bleed from manhattan video', () => {
    const ids = getBlockSpec('manhattan', 'video').variants.map(v => v.id)
    expect(ids).not.toContain('full-bleed')
    expect(getBlockSpec('manhattan', 'video').defaultVariant).toBe('centered')
  })

  it('leaves kyoto photo variants untouched', () => {
    const ids = getBlockSpec('kyoto', 'photo').variants.map(v => v.id)
    expect(ids).toEqual(['full-bleed', 'centered', 'side-by-side'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/themes/manhattanSpec.test.js`
Expected: FAIL (accent undefined, photo variants are `full-bleed`/`centered`, aligns undefined).

- [ ] **Step 3: Extend `mergeBlockSpec` to honor an `aligns` override**

In `common/themes/base.js`, replace the `mergeBlockSpec` return block (lines 135-142) so it also passes through `aligns`:

```javascript
  return {
    ...baseSpec,
    variants,
    ...(override && override.defaultVariant ? { defaultVariant: override.defaultVariant } : {}),
    ...(override && override.defaultAlign ? { defaultAlign: override.defaultAlign } : {}),
    ...(override && override.aligns ? { aligns: override.aligns } : {}),
    ...(override && override.defaultFont ? { defaultFont: override.defaultFont } : {}),
    ...(override && override.defaultButtonStyle ? { defaultButtonStyle: override.defaultButtonStyle } : {}),
  }
```

- [ ] **Step 4: Update Manhattan tokens + overrides**

Replace the body of `common/themes/manhattan.js` (keep the file header comment) with:

```javascript
// common/themes/manhattan.js
// Manhattan — fixed left rail + gallery-wall grid. Inherits the base menu and
// expresses its personality purely through label/default overrides + tokens.
export const manhattan = {
  id: 'manhattan',
  name: 'Manhattan',
  navStyle: 'left-rail',
  tokens: {
    '--theme-bg': '#fafafa',
    '--theme-text': '#141414',
    '--theme-text-muted': '#6b6b6b',
    '--theme-accent': '#b5502e',
    '--theme-rail-width': '260px',
    fonts: {
      serif: '"Cormorant Garamond", Georgia, serif',
      display: 'Muse',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"Geist Mono", monospace',
    },
  },
  overrides: {
    // Single photo has no layout choice in Manhattan: collapse all base variants
    // into one no-option "single" variant. Rendering ignores the id (see Gallery
    // photo case) and always draws the left-anchored ManhattanPhoto.
    photo: { hide: ['full-bleed', 'centered', 'side-by-side'], add: [{ id: 'single', label: 'Photo' }], defaultVariant: 'single' },
    photos: { defaultVariant: 'grid' },
    // Split pane can't full-bleed; keep Centered + Side for video.
    video: { hide: ['full-bleed'], defaultVariant: 'centered' },
    text: { defaultAlign: 'left', aligns: ['left'] },
    contact: { defaultAlign: 'left', aligns: ['left'] },
  },
}
```

- [ ] **Step 5: Hide the align control when only one align exists**

In `components/admin/gallery-builder/DesignPopover.js`, change line 33 from:

```javascript
  const aligns = spec.aligns ? spec.aligns.map(a => ({ value: a, label: ALIGN_LABELS[a] || a })) : null
```

to (only offer the control when there's a real choice — mirrors the `variants.length > 1` gate):

```javascript
  const aligns = spec.aligns && spec.aligns.length > 1 ? spec.aligns.map(a => ({ value: a, label: ALIGN_LABELS[a] || a })) : null
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest __tests__/themes/manhattanSpec.test.js __tests__/themes/getBlockSpec.test.js __tests__/themes/base.test.js __tests__/components/DesignPopover.test.js`
Expected: PASS. If `DesignPopover.test.js` or `getBlockSpec.test.js` assert the old Manhattan photo labels (`Full width`/`Framed`) or center-align pills, update those expectations to the new spec and re-run.

- [ ] **Step 7: Commit**

```bash
git add common/themes/manhattan.js common/themes/base.js components/admin/gallery-builder/DesignPopover.js __tests__/themes/manhattanSpec.test.js
git commit -m "feat(manhattan): lock single-photo layout, left-only align, accent token"
```

---

### Task 2: WiggleLine alignment prop + relocate divider to the left rail

**Files:**
- Modify: `components/wiggle-line/WiggleLine.js`
- Modify: `components/image-displays/gallery/Gallery.js` (suppress between-section wiggles for Manhattan)
- Test: `__tests__/components/WiggleLineManhattan.test.js` (new)

**Interfaces:**
- Produces: `WiggleLine` accepts an optional `className` prop (default `'mx-auto my-8'`); passing `className` overrides the default margins/alignment.
- Consumes: `themeId` already available in `Gallery.js` (default `'kyoto'`).

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/WiggleLineManhattan.test.js`:

```javascript
import { render } from '@testing-library/react'
import WiggleLine from '../../components/wiggle-line/WiggleLine'

describe('WiggleLine', () => {
  it('uses centered margins by default', () => {
    const { container } = render(<WiggleLine />)
    expect(container.querySelector('svg').getAttribute('class')).toContain('mx-auto')
  })

  it('honors a custom className for left alignment', () => {
    const { container } = render(<WiggleLine className="my-6 ml-0" />)
    const cls = container.querySelector('svg').getAttribute('class')
    expect(cls).toContain('ml-0')
    expect(cls).not.toContain('mx-auto')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/WiggleLineManhattan.test.js`
Expected: FAIL on the second case (className is ignored; svg always has `mx-auto my-8`).

- [ ] **Step 3: Add the `className` prop to WiggleLine**

Replace `components/wiggle-line/WiggleLine.js` with:

```javascript
import React from "react";

const WiggleLine = ({ color = "black", className = "mx-auto my-8" }) => (
  <svg width="100" height="10" viewBox="0 0 100 10" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 5C10 0 20 10 30 5C40 0 50 10 60 5C70 0 80 10 90 5C95 2.5 100 2.5 100 2.5" stroke={color} strokeWidth="2" />
  </svg>
);

export default WiggleLine;
```

- [ ] **Step 4: Suppress between-section wiggles for Manhattan in Gallery.js**

In `components/image-displays/gallery/Gallery.js`, immediately after the `const Gallery = ({ ... }) => {` signature's first body lines (after line 193 `const linkBase = ...`), add a gated divider element:

```javascript
  // Manhattan moves its section divider into the left rail (see SiteNav); the
  // body renders no between-section wiggles. Other themes keep them.
  const Wiggle = () => (themeId === 'manhattan' ? null : <WiggleLine />)
```

Then replace every `<WiggleLine />` occurrence **inside the block switch** (lines 263, 285, 292, 298, 305, 309, 315, 342, 362, 370, 374, 414, 450) with `<Wiggle />`. Leave the `import WiggleLine` line intact (still used by `Wiggle`).

- [ ] **Step 5: Write a Gallery divider test**

Append to `__tests__/components/WiggleLineManhattan.test.js`:

```javascript
import Gallery from '../../components/image-displays/gallery/Gallery'

const photosBlock = { type: 'photos', images: [{ url: 'https://x/a.jpg' }] }

function renderGallery(themeId) {
  return render(
    <Gallery name="P" description="" blocks={[photosBlock]} themeId={themeId} username="u" basePath="/sites/u" />
  )
}

describe('Gallery section dividers', () => {
  it('renders wiggle dividers for kyoto', () => {
    const { container } = renderGallery('kyoto')
    expect(container.querySelectorAll('svg path[d^="M0 5C10"]').length).toBeGreaterThan(0)
  })
  it('renders no wiggle dividers for manhattan', () => {
    const { container } = renderGallery('manhattan')
    expect(container.querySelectorAll('svg path[d^="M0 5C10"]').length).toBe(0)
  })
})
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest __tests__/components/WiggleLineManhattan.test.js`
Expected: PASS. (If `Gallery` requires additional context providers to mount, wrap the render in the same providers used by `__tests__/components/GalleryText.test.js` — mirror that file's setup.)

- [ ] **Step 7: Commit**

```bash
git add components/wiggle-line/WiggleLine.js components/image-displays/gallery/Gallery.js __tests__/components/WiggleLineManhattan.test.js
git commit -m "feat(manhattan): remove body section dividers, make WiggleLine alignable"
```

---

### Task 3: Left rail restyle — Fraunces, no divider, accent active, pushed-down logo, collapsible subpages, rail squiggle

**Files:**
- Modify: `components/image-displays/page/SiteNav.js` (the `style === 'left-rail'` desktop branch, lines 395-449; and the mobile branch fonts, lines 343-392)
- Test: `__tests__/components/SiteNavLeftRail.test.js` (extend)

**Interfaces:**
- Consumes: `WiggleLine` with `className` prop (Task 2); `buildNavTree`, `navItemActive` (existing).
- Produces: desktop rail with collapsible subpages (hidden by default, caret toggles, auto-expanded when a child is active).

- [ ] **Step 1: Write the failing test**

Add to `__tests__/components/SiteNavLeftRail.test.js` (create if it only covers other cases — mirror its existing render helper for `siteConfig`, `variant="left-rail"`):

```javascript
// Assumes a helper renderRail(siteConfig, { currentPageId }) exists in this file
// that renders <SiteNav variant="left-rail" .../>. If not, add one mirroring the
// existing tests here.
import { fireEvent, screen } from '@testing-library/react'

const config = {
  siteName: 'Swami Photography',
  design: { theme: 'manhattan' },
  contact: {},
  pages: [
    { id: 'work', title: 'Recent Work', slug: 'work', showInNav: true },
    { id: 'weddings', title: 'Weddings', slug: 'weddings', showInNav: true },
    { id: 'engage', title: 'Engagements', slug: 'engagements', parentId: 'weddings', showInNav: true },
  ],
}

it('hides subpages until the caret is expanded', () => {
  renderRail(config, { currentPageId: 'work' })
  expect(screen.queryByText('Engagements')).toBeNull()
  fireEvent.click(screen.getByLabelText('Weddings submenu'))
  expect(screen.getByText('Engagements')).toBeInTheDocument()
})

it('auto-expands the parent when a subpage is the current page', () => {
  renderRail(config, { currentPageId: 'engage' })
  expect(screen.getByText('Engagements')).toBeInTheDocument()
})

it('uses fraunces (not uppercase) for rail menu items', () => {
  renderRail(config, { currentPageId: 'work' })
  const link = screen.getByText('Recent Work')
  expect(link.className).toContain('font-fraunces')
  expect(link.className).not.toContain('uppercase')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/SiteNavLeftRail.test.js`
Expected: FAIL (subpages currently always visible; items are `uppercase tracking-[0.12em]`, not `font-fraunces`).

- [ ] **Step 3: Add a collapsible rail-item component**

In `components/image-displays/page/SiteNav.js`, add this component just above the `export default function SiteNav` (after the `NavMenu` component, ~line 316). It reuses the existing `navItemActive` and `Caret`:

```javascript
// A single left-rail top-level item: Fraunces, sentence-case, terracotta when
// active. Children are collapsed behind a caret and hidden until expanded; the
// parent auto-expands when one of its children is the current page.
function RailItem({ item, basePath, onPageClick, ctx }) {
  const kids = (item.children || []).filter(c => c.showInNav !== false)
  const childActive = kids.some(c => navItemActive(c, ctx))
  const [open, setOpen] = useState(childActive)
  useEffect(() => { if (childActive) setOpen(true) }, [childActive])

  const isLink = item.type === 'link'
  const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
  const active = navItemActive(item, ctx)
  const cls = 'font-fraunces text-[15px] tracking-normal transition-colors'
  const style = { color: active ? 'var(--theme-accent, #b5502e)' : 'var(--theme-text, #141414)', opacity: active ? 1 : 0.55, textDecoration: 'none' }

  return (
    <li>
      <div className="flex items-center gap-1.5">
        {onPageClick && !isLink
          ? <button onClick={() => onPageClick(item.id)} className={cls} style={style}>{item.title}</button>
          : <a href={href} target={isLink ? '_blank' : undefined} rel={isLink ? 'noopener noreferrer' : undefined} className={cls} style={style}>{item.title}</a>}
        {kids.length > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            aria-label={`${item.title} submenu`}
            aria-expanded={open}
            className="inline-flex items-center"
            style={{ color: 'var(--theme-text, #141414)', opacity: 0.45, lineHeight: 1, padding: '0 2px' }}
          >
            <Caret open={open} size={10} />
          </button>
        )}
      </div>
      {kids.length > 0 && open && (
        <ul className="flex flex-col gap-1.5 mt-1.5 ml-3">
          {kids.map(child => {
            const cActive = navItemActive(child, ctx)
            const cHref = `${basePath}/${child.slug || child.id}`
            const cStyle = { color: cActive ? 'var(--theme-accent, #b5502e)' : 'var(--theme-text, #141414)', opacity: cActive ? 1 : 0.5, textDecoration: 'none' }
            return (
              <li key={child.id}>
                {onPageClick
                  ? <button onClick={() => onPageClick(child.id)} className="font-fraunces text-[13px] tracking-normal transition-colors" style={cStyle}>{child.title}</button>
                  : <a href={cHref} className="font-fraunces text-[13px] tracking-normal transition-colors" style={cStyle}>{child.title}</a>}
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
```

- [ ] **Step 4: Rewrite the desktop left-rail branch**

In `components/image-displays/page/SiteNav.js`, replace the entire desktop `return (<nav ... left-rail ...>)` block (lines 395-449) with:

```javascript
    return (
      <nav
        data-testid="left-rail"
        aria-label="Site navigation"
        className="left-rail hidden md:flex flex-col justify-between sticky top-0 self-start h-screen w-[260px] shrink-0 px-8 py-10"
        style={{ background: 'var(--theme-bg, #fafafa)', color: 'var(--theme-text, #141414)' }}
      >
        <div className="flex flex-col gap-10">
          {onPageClick ? (
            <button onClick={() => onPageClick(null)} className="text-left font-fraunces text-2xl tracking-normal leading-tight mt-8" style={logoStyle || undefined}>{brand}</button>
          ) : (
            <a href={basePath || '/'} className="font-fraunces text-2xl tracking-normal leading-tight mt-8" style={{ textDecoration: 'none', color: 'inherit', ...(logoStyle || {}) }}>{brand}</a>
          )}
          <ul className="flex flex-col gap-2">
            {tree.map(item => (
              <RailItem
                key={item.id}
                item={item}
                basePath={basePath}
                onPageClick={onPageClick}
                ctx={{ currentPageId, currentPath, basePath }}
              />
            ))}
          </ul>
          <WiggleLine color="currentColor" className="my-2 ml-0 opacity-30" />
        </div>
        <div className="flex flex-col gap-4" style={{ color: 'var(--theme-text)', opacity: 0.4 }}>
          {socialKeys.length > 0 && (
            <div className="flex gap-3 text-xs tracking-[0.12em]">
              {socialKeys.map(k => <span key={k} aria-hidden="true">{k[0].toUpperCase()}</span>)}
            </div>
          )}
        </div>
      </nav>
    )
```

Add the import at the top of `SiteNav.js` (after the existing imports, ~line 9):

```javascript
import WiggleLine from '../../wiggle-line/WiggleLine'
```

Note: the `border-r border-black/10` divider is removed (not present in the new className). The logo gains `mt-8` (ample top margin, pushed down). The squiggle sits below the menu list, left-aligned (`ml-0`).

- [ ] **Step 5: Update the mobile rail fonts (sentence-case Fraunces)**

In the mobile branch, change the item class on line 363 from:

```javascript
                const cls = 'text-lg uppercase tracking-[0.14em]'
```

to:

```javascript
                const cls = 'font-fraunces text-lg tracking-normal'
```

and the subpage class on line 377 from `'text-sm uppercase tracking-[0.12em] opacity-60'` to `'font-fraunces text-sm tracking-normal opacity-60'`. Also change the mobile header brand (lines 351/353) class `text-base font-semibold uppercase tracking-[0.16em]` → `font-fraunces text-lg tracking-normal`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest __tests__/components/SiteNavLeftRail.test.js __tests__/components/SiteNavSubNav.test.js __tests__/components/SiteNavLogoFont.test.js`
Expected: PASS. Update any existing left-rail assertions that referenced the old `uppercase`/`border-r`/always-visible-subpages behavior.

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/page/SiteNav.js __tests__/components/SiteNavLeftRail.test.js
git commit -m "feat(manhattan): serif rail, no divider, accent active, collapsible subpages, rail squiggle"
```

---

### Task 4: `HoverCaption` shared component + `ManhattanGrid` masonry rewrite

**Files:**
- Create: `components/image-displays/gallery/HoverCaption.js`
- Modify: `components/image-displays/themes/manhattan/ManhattanGrid.js`
- Test: `__tests__/components/ManhattanGrid.test.js` (extend)

**Interfaces:**
- Produces: `HoverCaption({ caption, captionStyle })` — an absolutely-positioned bottom overlay (`data-hover-caption`) that fades in on `group-hover`; renders `null` when `caption` is empty. `ManhattanGrid` renders a sharp-cornered masonry (CSS columns, preserves aspect ratio) with a `HoverCaption` inside each tile.
- Consumes: `captionStyleCss` from `common/captionStyles`, `getSizedUrl`, `getImageRefUrl`.

- [ ] **Step 1: Write the failing test**

Extend `__tests__/components/ManhattanGrid.test.js`:

```javascript
import { render } from '@testing-library/react'
import ManhattanGrid from '../../components/image-displays/themes/manhattan/ManhattanGrid'

it('renders an inside hover caption when an image has a caption', () => {
  const images = [{ url: 'https://x/a.jpg', caption: 'On the bridge' }]
  const { container, getByText } = render(<ManhattanGrid images={images} />)
  expect(getByText('On the bridge').closest('[data-hover-caption]')).toBeTruthy()
})

it('renders sharp-cornered tiles (no rounded utility on the image)', () => {
  const images = [{ url: 'https://x/a.jpg', caption: '' }]
  const { container } = render(<ManhattanGrid images={images} />)
  const img = container.querySelector('img')
  expect(img.className).not.toMatch(/rounded/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ManhattanGrid.test.js`
Expected: FAIL (no `data-hover-caption` element exists).

- [ ] **Step 3: Create `HoverCaption`**

Create `components/image-displays/gallery/HoverCaption.js`:

```javascript
// A caption that lives inside the image, revealed on hover at the bottom over a
// subtle scrim. Used by Manhattan image blocks. Parent must be `relative group`.
import { captionStyleCss } from '../../../common/captionStyles'

export default function HoverCaption({ caption, captionStyle = 'sans' }) {
  if (!caption) return null
  return (
    <div
      data-hover-caption
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))' }}
    >
      <p
        className="px-3 pb-2.5 pt-8 text-[13px] font-sans text-white/95"
        style={captionStyleCss(captionStyle)}
      >
        {caption}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `ManhattanGrid` as a sharp masonry with inside captions**

Replace `components/image-displays/themes/manhattan/ManhattanGrid.js` with:

```javascript
// components/image-displays/themes/manhattan/ManhattanGrid.js
// Manhattan gallery-wall: a sharp-cornered masonry (CSS columns) that preserves
// each image's aspect ratio and reveals its caption inside on hover.
import { getSizedUrl } from '../../../../common/imageUtils'
import { getImageRefUrl } from '../../../../common/assetRefs'
import HoverCaption from '../../gallery/HoverCaption'

export default function ManhattanGrid({ images = [], onImageClick, captionStyle = 'sans' }) {
  return (
    <div className="manhattan-grid" style={{ columnGap: '1rem', columnCount: 2 }}>
      {images.map((img, i) => {
        const url = getImageRefUrl(img) || img.url || img
        const caption = img.caption || ''
        return (
          <button
            key={i}
            type="button"
            className="relative group block w-full mb-4 overflow-hidden bg-black/5"
            onClick={() => onImageClick?.(i)}
            style={{ breakInside: 'avoid' }}
          >
            <img
              src={getSizedUrl(url, 'display')}
              alt={caption || 'Photo'}
              loading="lazy"
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
            />
            <HoverCaption caption={caption} captionStyle={captionStyle} />
          </button>
        )
      })}
    </div>
  )
}
```

Note: `columnCount: 2` matches the reference (2-column gallery wall). A responsive bump to 3 columns on large screens is handled by CSS in Task 7 (`[data-theme="manhattan"] .manhattan-grid`).

- [ ] **Step 5: Pass `captionStyle` into `ManhattanGrid` from Gallery.js**

In `components/image-displays/gallery/Gallery.js` line 268, update the Manhattan grid render to forward the caption style:

```javascript
                    {themeId === 'manhattan'
                      ? <ManhattanGrid images={imageRefs} onImageClick={makeClickHandler(index)} captionStyle={resolveCaptionStyle(block)} />
                      : <GridGallery images={imageRefs} onImageClick={makeClickHandler(index)} basis={GRID_BASIS[size]} />}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest __tests__/components/ManhattanGrid.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/gallery/HoverCaption.js components/image-displays/themes/manhattan/ManhattanGrid.js components/image-displays/gallery/Gallery.js __tests__/components/ManhattanGrid.test.js
git commit -m "feat(manhattan): sharp masonry gallery-wall with inside hover captions"
```

---

### Task 5: `ManhattanPhoto` — single left-anchored photo, sharp, inside caption

**Files:**
- Create: `components/image-displays/gallery/photo-block/ManhattanPhoto.js`
- Modify: `components/image-displays/gallery/Gallery.js` (photo case, lines 339-365)
- Test: `__tests__/components/ManhattanPhoto.test.js` (new)

**Interfaces:**
- Produces: `ManhattanPhoto({ imageUrl, caption, onImageClick, captionStyle })` — left-anchored (`mr-auto`), capped width (~two-thirds of the content column), sharp corners, `HoverCaption` inside. No layout branching.
- Consumes: `HoverCaption` (Task 4), `getSizedUrl`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/ManhattanPhoto.test.js`:

```javascript
import { render } from '@testing-library/react'
import ManhattanPhoto from '../../components/image-displays/gallery/photo-block/ManhattanPhoto'

it('renders a left-anchored sharp photo with an inside caption', () => {
  const { container, getByText } = render(
    <ManhattanPhoto imageUrl="https://x/a.jpg" caption="A quiet street" />
  )
  const fig = container.querySelector('figure')
  expect(fig.className).toContain('mr-auto')
  const img = container.querySelector('img')
  expect(img.className).not.toMatch(/rounded/)
  expect(getByText('A quiet street').closest('[data-hover-caption]')).toBeTruthy()
})

it('renders no caption element when caption is empty', () => {
  const { container } = render(<ManhattanPhoto imageUrl="https://x/a.jpg" caption="" />)
  expect(container.querySelector('[data-hover-caption]')).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ManhattanPhoto.test.js`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Create `ManhattanPhoto`**

Create `components/image-displays/gallery/photo-block/ManhattanPhoto.js`:

```javascript
// components/image-displays/gallery/photo-block/ManhattanPhoto.js
// Manhattan single photo: one rendering, no layout options. Left-anchored,
// capped width with right-side air, sharp corners, caption inside on hover.
import { getSizedUrl } from '../../../../common/imageUtils'
import HoverCaption from '../HoverCaption'
import WatermarkOverlay from '../../engagement/WatermarkOverlay'
import BuyPrintButton from '../../print/BuyPrintButton'
import EngagementActions from '../../engagement/EngagementActions'

export default function ManhattanPhoto({ imageUrl, caption = '', onImageClick, captionStyle = 'sans', print }) {
  return (
    <figure className="manhattan-photo mr-auto w-full" style={{ maxWidth: 'min(66%, 720px)' }}>
      <div className="relative group">
        <img
          src={getSizedUrl(imageUrl, 'display')}
          alt={caption || 'Photo'}
          loading="lazy"
          className="w-full h-auto object-cover cursor-pointer"
          onClick={() => onImageClick?.(0)}
        />
        <WatermarkOverlay />
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <BuyPrintButton print={print} imageUrl={imageUrl} />
        </div>
        <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 [&:has([data-engagement=always-visible])]:opacity-100 transition-opacity duration-300">
          <EngagementActions imageUrl={imageUrl} />
        </div>
        <HoverCaption caption={caption} captionStyle={captionStyle} />
      </div>
    </figure>
  )
}
```

- [ ] **Step 4: Route Manhattan single photos through `ManhattanPhoto`**

In `components/image-displays/gallery/Gallery.js`, replace the `case "photo":` body (lines 339-365) with:

```javascript
            case "photo": {
              const variantId = resolveVariant(block, themeId)
              const size = sizeKey(resolvePhotoSize(block, themeId))
              if (!getImageRefUrl(block.image || block.imageUrl)) return showPlaceholders ? <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}><PlaceholderPhoto variant={variantId} size={size} /><Wiggle /></div> : null;
              if (themeId === 'manhattan') {
                return (
                  <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}>
                    <ManhattanPhoto
                      imageUrl={getImageRefUrl(block.image || block.imageUrl)}
                      caption={block.caption}
                      onImageClick={makeClickHandler(index)}
                      captionStyle={resolveCaptionStyle(block)}
                      print={block.print}
                    />
                  </div>
                );
              }
              const photoVariant = { centered: 2, 'side-by-side': 3 }[variantId] || 1
              return (
                <div key={`block-${index}`} className="photo-block" data-block-index={index} {...hoverProps}>
                  <PhotoBlock
                    imageUrl={getImageRefUrl(block.image || block.imageUrl)}
                    caption={block.caption}
                    variant={photoVariant}
                    widthPct={PHOTO_CENTERED_PCT[size]}
                    onImageClick={makeClickHandler(index)}
                    print={block.print}
                    captionStyle={resolveCaptionStyle(block)}
                  />
                  <Wiggle />
                </div>
              );
            }
```

Add the import near the other gallery imports in `Gallery.js` (after line 21 `import FramedPhoto ...`):

```javascript
import ManhattanPhoto from "./photo-block/ManhattanPhoto";
```

Note: this removes the `themeId === 'manhattan' && variantId === 'framed'` `FramedPhoto` branch (the white-mat look is dropped for Manhattan, per spec). `FramedPhoto` stays in the tree for any non-Manhattan use but is no longer referenced by Manhattan; leave its import if other code uses it, otherwise the unused import can remain harmlessly.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/components/ManhattanPhoto.test.js __tests__/components/GalleryThemeVariants.test.js`
Expected: PASS. If `GalleryThemeVariants.test.js` asserts the old Manhattan `FramedPhoto` behavior, update it to expect `.manhattan-photo`.

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/gallery/photo-block/ManhattanPhoto.js components/image-displays/gallery/Gallery.js __tests__/components/ManhattanPhoto.test.js
git commit -m "feat(manhattan): single-photo one-rendering, drop white-mat framed look"
```

---

### Task 6: Inside hover captions for Masonry + Stacked under Manhattan

**Files:**
- Modify: `components/image-displays/gallery/masonry-gallery/MasonryGallery.js`
- Modify: `components/image-displays/gallery/stacked-gallery/StackedGallery.js`
- Modify: `components/image-displays/gallery/Gallery.js` (pass `insideCaption` for Manhattan)
- Test: `__tests__/components/MasonryInsideCaption.test.js` (new)

**Interfaces:**
- Produces: `MasonryGallery` and `StackedGallery` accept `insideCaption` (default `false`). When `true`, the caption renders as a `HoverCaption` inside the image's `relative group` wrapper instead of the `<p>` below.
- Consumes: `HoverCaption` (Task 4).

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/MasonryInsideCaption.test.js`:

```javascript
import { render } from '@testing-library/react'
import MasonryGallery from '../../components/image-displays/gallery/masonry-gallery/MasonryGallery'

const images = [{ url: 'https://x/a.jpg', caption: 'Golden hour' }]

it('renders the caption below by default', () => {
  const { getByText } = render(<MasonryGallery images={images} />)
  expect(getByText('Golden hour').closest('[data-hover-caption]')).toBeNull()
})

it('renders an inside hover caption when insideCaption is set', () => {
  const { getByText } = render(<MasonryGallery images={images} insideCaption />)
  expect(getByText('Golden hour').closest('[data-hover-caption]')).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/MasonryInsideCaption.test.js`
Expected: FAIL on the second case (no `data-hover-caption`).

- [ ] **Step 3: Add `insideCaption` to MasonryGallery**

In `components/image-displays/gallery/masonry-gallery/MasonryGallery.js`:

Add the import after line 8:

```javascript
import HoverCaption from "../HoverCaption";
```

Change the signature (line 10) to accept the prop:

```javascript
const MasonryGallery = ({ images = [], imageUrls = [], onImageClick, columns, captionStyle = 'sans', insideCaption = false }) => {
```

Inside the tile `<div className="relative group">` (after the `EngagementActions` div, before the closing `</div>` on line 43), add the inside caption:

```javascript
                      {insideCaption && <HoverCaption caption={caption} captionStyle={captionStyle} />}
```

And change the below-caption `<p>` (lines 44-46) to only render when NOT inside:

```javascript
                    {caption && !insideCaption && (
                      <p className="mt-2 text-sm italic text-center text-gray-500" style={capCss}>{caption}</p>
                    )}
```

- [ ] **Step 4: Add `insideCaption` to StackedGallery**

In `components/image-displays/gallery/stacked-gallery/StackedGallery.js`:

Add the import after line 7:

```javascript
import HoverCaption from "../HoverCaption";
```

Change the signature (line 9) to:

```javascript
const StackedGallery = ({ images: imagesProp = [], imageUrls: imageUrlsProp = [], onImageClick, captionStyle = 'sans', widthPct = 72, insideCaption = false }) => {
```

In the vertical-pair tile, inside `<div className="relative group">` (after the EngagementActions div, before its closing `</div>` at line 107) add:

```javascript
                          {insideCaption && <HoverCaption caption={getCaptionForUrl(image.src)} captionStyle={captionStyle} />}
```

and gate the below `<p>` (lines 108-110):

```javascript
                        {getCaptionForUrl(image.src) && !insideCaption && (
                          <p className="mt-2 text-sm italic text-center text-gray-500" style={capCss}>{getCaptionForUrl(image.src)}</p>
                        )}
```

In the horizontal tile, inside `<div className="relative group" style={{ width: colWidth }}>` (after the EngagementActions div, before its closing `</div>` at line 136) add:

```javascript
                  {insideCaption && <HoverCaption caption={getCaptionForUrl(entry.src)} captionStyle={captionStyle} />}
```

and gate the below `<p>` (lines 137-139):

```javascript
                {getCaptionForUrl(entry.src) && !insideCaption && (
                  <p className="mt-2 text-sm italic text-center text-gray-500" style={{ ...capCss, maxWidth: colWidth }}>{getCaptionForUrl(entry.src)}</p>
                )}
```

- [ ] **Step 5: Pass `insideCaption` for Manhattan from Gallery.js**

In `components/image-displays/gallery/Gallery.js`, add `insideCaption={themeId === 'manhattan'}` to every `MasonryGallery` and `StackedGallery` usage (lines 283, 284, 296, 297, 308). Example for the photos-block masonry/stacked branch (lines 282-284):

```javascript
                  {usemasonry
                    ? <MasonryGallery images={imageRefs} onImageClick={makeClickHandler(index)} columns={isSmallScreen ? 1 : MASONRY_COLS[size]} captionStyle={resolveCaptionStyle(block)} insideCaption={themeId === 'manhattan'} />
                    : <StackedGallery images={imageRefs} onImageClick={makeClickHandler(index)} captionStyle={resolveCaptionStyle(block)} widthPct={STACKED_PCT[size]} insideCaption={themeId === 'manhattan'} />}
```

Apply the same `insideCaption={themeId === 'manhattan'}` addition to the `MasonryGallery`/`StackedGallery` in the `stacked` case (lines 296-297) and the `masonry` case (line 308).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest __tests__/components/MasonryInsideCaption.test.js __tests__/components/StackedGalleryClick.test.js __tests__/components/MasonryGalleryClick.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/gallery/masonry-gallery/MasonryGallery.js components/image-displays/gallery/stacked-gallery/StackedGallery.js components/image-displays/gallery/Gallery.js __tests__/components/MasonryInsideCaption.test.js
git commit -m "feat(manhattan): inside hover captions for masonry + stacked galleries"
```

---

### Task 7: Scoped CSS — split-pane layout, sharp corners, left-anchored blocks, right-side air

**Files:**
- Modify: `styles/globals.css` (the `[data-theme="manhattan"]` block, ~lines 135-145)
- Test: manual dogfood via `/browse` (visual — no unit test)

**Interfaces:**
- Consumes: DOM classes `theme-content`, `manhattan-grid`, `text-block`, `testimonial-block`, `[data-contact-wrap]`, `manhattan-photo`; token `--theme-accent`.

- [ ] **Step 1: Replace the Manhattan CSS block**

In `styles/globals.css`, replace the existing Manhattan block (from `[data-theme="manhattan"] { background: ... }` through the `.photo-block .w-screen` rule) with:

```css
/* Manhattan theme — left rail + content as a flex row so the sticky rail
   works both on the live page and inside the admin's scrollable preview. */
[data-theme="manhattan"] { background: var(--theme-bg, #fafafa); color: var(--theme-text, #141414); }
@media (min-width: 768px) {
  [data-theme="manhattan"] .theme-shell { display: flex; align-items: flex-start; }
  [data-theme="manhattan"] .theme-content { flex: 1 1 auto; min-width: 0; }
  /* Left-anchored content with air on the right (widescreens). Left edge sits
     where the old divider was; right padding grows with viewport. */
  [data-theme="manhattan"] .theme-content { padding-left: 2.5rem; padding-right: clamp(2.5rem, 8vw, 8rem); }
}
[data-theme="manhattan"] .gallery-container { max-width: none; }

/* Sharp corners on every image in the content column. */
[data-theme="manhattan"] .theme-content img { border-radius: 0 !important; }

/* Gallery-wall: 2 columns, 3 on large screens. */
[data-theme="manhattan"] .manhattan-grid { column-count: 2; }
@media (min-width: 1280px) { [data-theme="manhattan"] .manhattan-grid { column-count: 3; } }

/* Left-anchor blocks that ship centered (mx-auto / margin:0 auto): kill the
   right auto-margin so everything shares one left spine; each block's own
   max-width leaves the right-side air. !important overrides inline margins. */
[data-theme="manhattan"] .text-block { margin-left: 0 !important; margin-right: auto !important; text-align: left !important; color: var(--theme-text); }
[data-theme="manhattan"] .testimonial-block figure { margin-left: 0 !important; margin-right: auto !important; text-align: left !important; align-items: flex-start !important; }
[data-theme="manhattan"] .testimonial-block blockquote { color: var(--theme-text) !important; }
[data-theme="manhattan"] [data-contact-wrap] { margin-left: 0 !important; margin-right: auto !important; text-align: left !important; }
[data-theme="manhattan"] .stacked-gallery-block [style*="margin: 0px auto"],
[data-theme="manhattan"] .stacked-gallery-block .flex.flex-col.items-center { align-items: flex-start !important; }
```

- [ ] **Step 2: Restart-free reload check**

The dev server hot-reloads CSS. In the browser (`/browse` skill), open a Manhattan site page on `localhost:3000` and confirm: no vertical divider between rail and content; images have square corners; text/testimonials/contact align to the left with open space on the right; the gallery wall fills the content width; the rail squiggle sits under the menu.

- [ ] **Step 3: Verify no cross-theme regression**

In the browser, open a Kyoto site page and confirm it looks identical to before (centered content, rounded images, dividers present).

- [ ] **Step 4: Run the full component suite**

Run: `npx jest __tests__/components __tests__/themes`
Expected: PASS (CSS changes don't affect jsdom class assertions, but this catches any earlier-task fallout).

- [ ] **Step 5: Commit**

```bash
git add styles/globals.css
git commit -m "feat(manhattan): split-pane CSS — sharp corners, left-anchored blocks, right air"
```

---

### Task 8: `ManhattanHero` top strip + wiring (title/description + View Music/Packages)

**Files:**
- Create: `components/image-displays/page/ManhattanHero.js`
- Modify: `components/image-displays/page/PageCover.js` (branch to the strip for Manhattan)
- Modify: `components/image-displays/gallery/Gallery.js:248` (suppress `GalleryCover` for Manhattan)
- Modify: `pages/sites/[username]/[slug].js:137`, `pages/sites/[username]/index.js:170`, `components/admin/platform/PagePreview.js:75` (pass `themeId`)
- Test: `__tests__/components/ManhattanHero.test.js` (new)

**Interfaces:**
- Produces: `ManhattanHero({ title, description, slideshowHref })` — a top strip (`data-manhattan-hero`): title (small sans, left) + description (small subdued sans, below) on the left; `View Music` + `Packages` buttons (small outline) on the right. Reads packages from `useClientEngagement()` (same shape `PageCover` uses: `ctx.features.purchase`, `ctx.packages`, `ctx.openPurchase()`). Renders `null` when there is no title, description, or button. **Never renders Client Login.**
- Consumes: `useClientEngagement` from `../engagement/ClientEngagementContext`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/ManhattanHero.test.js`:

```javascript
import { render } from '@testing-library/react'
import ManhattanHero from '../../components/image-displays/page/ManhattanHero'

it('renders title, description, and View Music but never Client Login', () => {
  const { getByText, queryByText } = render(
    <ManhattanHero title="Weddings" description="Documentary work" slideshowHref="/x/slideshow" />
  )
  expect(getByText('Weddings')).toBeInTheDocument()
  expect(getByText('Documentary work')).toBeInTheDocument()
  expect(getByText('View Music')).toBeInTheDocument()
  expect(queryByText('Client Login')).toBeNull()
})

it('renders nothing when there is no content or action', () => {
  const { container } = render(<ManhattanHero title="" description="" slideshowHref={null} />)
  expect(container.querySelector('[data-manhattan-hero]')).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ManhattanHero.test.js`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Create `ManhattanHero`**

Create `components/image-displays/page/ManhattanHero.js`:

```javascript
// components/image-displays/page/ManhattanHero.js
// Manhattan's hero is a thin top strip (an "announcement bar"): optional small
// title + subdued description on the left, action buttons on the right. No cover
// image, no Client Login (password gating happens before page entry).
import { useClientEngagement } from '../engagement/ClientEngagementContext'

function StripButton({ label, href, onClick }) {
  const cls = 'inline-flex items-center px-3.5 py-1.5 text-xs font-sans font-medium transition-colors'
  const style = { border: '1px solid rgba(20,20,20,0.25)', color: 'var(--theme-text, #141414)' }
  if (onClick) return <button type="button" onClick={onClick} className={cls} style={style}>{label}</button>
  const external = href?.startsWith('http')
  return <a href={href || '#'} className={cls} style={style} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</a>
}

export default function ManhattanHero({ title, description, slideshowHref }) {
  const ctx = useClientEngagement()
  const showPackages = !!(ctx?.features?.purchase && (ctx.packages || []).length)

  const buttons = []
  if (slideshowHref) buttons.push({ label: 'View Music', href: slideshowHref })
  if (showPackages) buttons.push({ label: 'Packages', onClick: () => ctx.openPurchase() })

  if (!title && !description && buttons.length === 0) return null

  return (
    <div data-manhattan-hero className="flex items-start justify-between gap-6 pt-2.5 pb-8">
      <div className="min-w-0">
        {title && <div className="text-[15px] font-sans font-medium tracking-tight" style={{ color: 'var(--theme-text, #141414)' }}>{title}</div>}
        {description && <div className="mt-1 text-[13px] font-sans" style={{ color: 'var(--theme-text-muted, #6b6b6b)' }}>{description}</div>}
      </div>
      {buttons.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {buttons.map((b, i) => <StripButton key={i} label={b.label} href={b.href} onClick={b.onClick} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Branch `PageCover` to the strip for Manhattan**

In `components/image-displays/page/PageCover.js`:

Add the import after line 4:

```javascript
import ManhattanHero from './ManhattanHero'
```

Change the signature (line 25) to accept `themeId`:

```javascript
export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled, primaryButton, navLinks = [], themeId }) {
```

Immediately after `const ctx = useClientEngagement()` (line 26), before the `if (!cover ...) return null` guard, add:

```javascript
  if (themeId === 'manhattan') {
    return <ManhattanHero title={title} description={description} slideshowHref={slideshowHref} />
  }
```

- [ ] **Step 5: Suppress `GalleryCover` for Manhattan**

In `components/image-displays/gallery/Gallery.js` line 248, change:

```javascript
suppressCover={hasCover}
```

to:

```javascript
suppressCover={hasCover || themeId === 'manhattan'}
```

- [ ] **Step 6: Pass `themeId` at the three render sites**

- `pages/sites/[username]/[slug].js:137` — add `themeId={theme.id}` to the `<PageCover .../>` inside the `ClientEngagementProvider`.
- `pages/sites/[username]/index.js:170` — add `themeId={theme.id}` to the `<PageCover .../>` inside the `ClientEngagementProvider`. **Do not** touch the cover-splash `<PageCover>` at line 114 (that's the pre-entry landing splash, theme-agnostic).
- `components/admin/platform/PagePreview.js:75` — add `themeId={theme.id}` to the `<PageCover .../>`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx jest __tests__/components/ManhattanHero.test.js __tests__/components/PageCover.test.js __tests__/components/pageCover.packages.test.js __tests__/components/GalleryCover.test.js`
Expected: PASS. If `PageCover.test.js` renders with a Manhattan theme and expects the old big-cover markup, update it to expect `[data-manhattan-hero]`.

- [ ] **Step 8: Commit**

```bash
git add components/image-displays/page/ManhattanHero.js components/image-displays/page/PageCover.js components/image-displays/gallery/Gallery.js "pages/sites/[username]/[slug].js" "pages/sites/[username]/index.js" components/admin/platform/PagePreview.js __tests__/components/ManhattanHero.test.js
git commit -m "feat(manhattan): top-strip hero (View Music/Packages), drop cover hero + client login"
```

---

### Task 9: Full-suite verification + visual dogfood

**Files:**
- Test: whole suite + `/browse` dogfood

- [ ] **Step 1: Run the entire test suite**

Run: `npx jest`
Expected: PASS. Fix any regressions in existing tests caused by the Manhattan changes (update assertions that encoded the old behavior — do not weaken tests for other themes).

- [ ] **Step 2: Visual dogfood via `/browse`**

With the dev server on `localhost:3000`, open a Manhattan site (home page, a gallery page, a text/About page, and a contact page) and verify against the spec's success criteria:
- Rail: Fraunces, sentence-case, terracotta active item, no divider, logo pushed down, subpages collapsed behind a caret (expand on click; auto-expanded on a subpage), squiggle under the menu.
- Hero: top strip ~10px from top; small title + subdued description on the left; `View Music`/`Packages` on the right; no cover image hero; no Client Login.
- Images: sharp corners everywhere; captions appear inside on hover; gallery wall fills width; single photo left-anchored with right air.
- Text/contact/testimonials: left-aligned, readable width, right-side air on widescreens; no between-section squiggles.
- Editor: single-photo block shows no layout picker; text/contact show no center-align option.

Capture before/after screenshots for the summary.

- [ ] **Step 3: Confirm no Kyoto regression**

Open a Kyoto site in `/browse` and confirm it is visually unchanged.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "test(manhattan): fix suite regressions from theme redesign"
```

---

## Self-Review

**Spec coverage:**
- §1 Left rail (Fraunces, no divider, accent active, collapsible subpages, pushed-down logo, rail squiggle) → Tasks 2 (WiggleLine), 3, 7 (CSS accent/anchor). ✓
- §2 Hero top strip (title/desc left, View Music/Packages right, no Client Login, no cover hero) → Task 8. ✓
- §3 Images (sharp corners, inside hover captions, no full-bleed, single photo one-rendering, grids fill width, left-anchored) → Tasks 1 (no full-bleed/single-lock), 4 (grid), 5 (single photo), 6 (masonry/stacked captions), 7 (CSS sharp/anchor). ✓
- §4 Text/contact/testimonials left-anchored, no center option → Tasks 1 (aligns), 7 (CSS). ✓
- §5 Squiggle removed from body, moved to rail → Tasks 2, 3. ✓
- Editor implications (hide single-photo layout picker, hide center align) → Task 1. ✓
- Lossless variant collapse at resolution time → Task 1 (`add: [{id:'single'}]`, render ignores id). ✓
- Non-goal: no Kyoto changes → every task gated + Tasks 7/9 regression checks. ✓

**Placeholder scan:** No TBD/TODO; every code step contains full code. Visual-only CSS (Task 7) has explicit CSS + manual verification steps rather than a hollow unit test — intentional, not a placeholder.

**Type/name consistency:** `HoverCaption({caption, captionStyle})` used identically in Tasks 4/5/6. `insideCaption` prop name consistent (Task 6). `themeId` threaded consistently into `PageCover`/`Gallery`. `Wiggle` local component introduced in Task 2 and reused in Task 5's photo-case edit. `--theme-accent` defined in Task 1, consumed in Tasks 3/7. `data-manhattan-hero` / `data-hover-caption` selectors consistent between components and tests.

**Known coupling note:** Tasks 5 and 6 both edit the `Gallery.js` photo/photos cases and both rely on the `Wiggle` component from Task 2 — execute in order (2 → … → 5 → 6). Task 8 edits `Gallery.js:248` (a different line) and three page files.
