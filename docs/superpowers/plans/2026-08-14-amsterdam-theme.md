# Amsterdam Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Amsterdam theme — a Dutch-poster editorial theme (ink/cream/black, giant display type, thin left rail, horizontally scrolling panels) rendered by a bespoke AmsterdamWall on shared horizontal-scroll physics extracted from Florence.

**Architecture:** Extract FlorenceWall's interaction physics into a shared `useWallScroll` hook (zero behavior change), then add `common/themes/amsterdam.js` to the registry and build `AmsterdamWall`/`AmsterdamColumn` as a sibling of the Florence renderer, short-circuited from `Gallery.js` exactly like Florence. New stored data is limited to `siteConfig.design.amsterdamInk`, `siteConfig.design.amsterdamPhotoMeta`, and `block.amsterdamStyle`.

**Tech Stack:** Next.js pages router, React, plain CSS in `styles/globals.css`, Jest + jsdom + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-08-14-amsterdam-theme-design.md`

**Spec deviation (documented):** The spec said text Panel/Quiet "rides the existing variant system". Reality: the base text block's variant control IS the L/M/S size control (`heading`/`subheading`/`body`, labeled L/M/S — see `common/themes/base.js:60-70`), so Panel/Quiet as variants would destroy the size control. Instead, Panel/Quiet is an Amsterdam-only "Style" pill in DesignPopover stored flat on the block as `amsterdamStyle` — the exact precedent of `florenceAnchor` (`components/admin/gallery-builder/DesignPopover.js:100-111`). Both spec intents (panel default, quiet escape hatch, L/M/S sizing) survive.

## Global Constraints

- No WebGL, no scroll-linked distortion. Plain CSS/DOM only.
- No copying of canals-amsterdam.com compositions, fonts, logotype, or the XXX rail motif.
- Fonts are open-license Google faces only: Abril Fatface, Playfair Display, Anton, Inter.
- Inks are exactly: vermilion `#e02b20` (default, onInk `#ffffff`), ultramarine `#1a1690` (onInk `#ffffff`), black `#141210` (onInk `#f6efe4`). Cream bg `#f6efe4`, text `#141210`.
- Sidebar-only editing invariant: the preview renderer is read-only; it only passes `onBlockHover`/`onBlockClick` through.
- FlorenceWall's runtime behavior must not change. `npx jest __tests__/components/FlorenceGallery.test.js` must pass untouched after every task.
- The dev server for this workspace runs `next dev` on port 3000. NEVER run `next build` while it is up.
- Run tests with `npx jest <path> -t "<name>"` (jest 30, jsdom, `@/` maps to repo root).

---

### Task 1: Extract `useWallScroll` and refactor FlorenceWall onto it

**Files:**
- Create: `components/image-displays/themes/shared/useWallScroll.js`
- Create: `__tests__/components/useWallScroll.test.js`
- Modify: `components/image-displays/themes/florence/FlorenceWall.js`

**Interfaces:**
- Produces: `useWallScroll({ wallRef, mobile, columnSelector })` → `{ onPointerDown, onPointerMove, endDrag, page }`. `wallRef` is a React ref to the scrolling element; `columnSelector` is the CSS selector for pageable columns (`'.florence-col'` / `'.ams-col'`); `page('prev'|'next')` centers the neighboring column. Task 4 consumes this.

- [ ] **Step 1: Write the failing hook test**

```js
// __tests__/components/useWallScroll.test.js
// The shared horizontal-wall physics: vertical wheel → horizontal pan (3.2x),
// native horizontal gestures untouched, drag-to-pan, all inert on mobile.
import { useRef } from 'react'
import { render, fireEvent } from '@testing-library/react'
import useWallScroll from '@/components/image-displays/themes/shared/useWallScroll'

function Probe({ mobile = false }) {
  const wallRef = useRef(null)
  const { onPointerDown, onPointerMove, endDrag } = useWallScroll({ wallRef, mobile, columnSelector: '.col' })
  return (
    <div data-testid="wall" ref={wallRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}>
      <section className="col" />
    </div>
  )
}

describe('useWallScroll', () => {
  it('converts a vertical wheel into horizontal scroll at 3.2x', () => {
    const { getByTestId } = render(<Probe />)
    const wall = getByTestId('wall')
    wall.scrollLeft = 0
    fireEvent.wheel(wall, { deltaY: 100, deltaX: 0, deltaMode: 0 })
    expect(wall.scrollLeft).toBe(320)
  })

  it('leaves native horizontal gestures alone', () => {
    const { getByTestId } = render(<Probe />)
    const wall = getByTestId('wall')
    wall.scrollLeft = 0
    fireEvent.wheel(wall, { deltaY: 10, deltaX: 50, deltaMode: 0 })
    expect(wall.scrollLeft).toBe(0)
  })

  it('drag-to-pan moves scrollLeft by the inverse pointer delta', () => {
    const { getByTestId } = render(<Probe />)
    const wall = getByTestId('wall')
    wall.scrollLeft = 100
    fireEvent.pointerDown(wall, { clientX: 200 })
    fireEvent.pointerMove(wall, { clientX: 120 })
    expect(wall.scrollLeft).toBe(180)
    fireEvent.pointerUp(wall)
    fireEvent.pointerMove(wall, { clientX: 40 })
    expect(wall.scrollLeft).toBe(180) // drag ended — no further movement
  })

  it('is inert on mobile', () => {
    const { getByTestId } = render(<Probe mobile />)
    const wall = getByTestId('wall')
    wall.scrollLeft = 0
    fireEvent.wheel(wall, { deltaY: 100, deltaMode: 0 })
    fireEvent.pointerDown(wall, { clientX: 200 })
    fireEvent.pointerMove(wall, { clientX: 120 })
    expect(wall.scrollLeft).toBe(0)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx jest __tests__/components/useWallScroll.test.js`
Expected: FAIL — cannot find module `useWallScroll`.

- [ ] **Step 3: Create the hook (verbatim extraction of FlorenceWall's physics)**

The logic below is copied from `FlorenceWall.js` lines 56–118 with `wallRef`/`mobile`/selector parameterized. Do not "improve" it — behavior parity is the deliverable.

```js
// components/image-displays/themes/shared/useWallScroll.js
// The horizontal-wall interaction physics shared by the Florence museum wall and
// the Amsterdam poster wall. Extracted verbatim from FlorenceWall: a vertical
// wheel (mouse / vertical trackpad swipe) pans horizontally at 3.2x; a native
// horizontal gesture is left alone (stays fast + smooth); press-drag pans with a
// 3px guard so clicks still land; arrows center the neighboring column. All
// handlers no-op on mobile, where the wall collapses to a vertical stack.
import { useRef, useCallback, useEffect } from 'react'

export default function useWallScroll({ wallRef, mobile = false, columnSelector }) {
  const onWheel = useCallback((e) => {
    const wall = wallRef.current
    if (!wall || mobile) return
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return // native horizontal — don't touch
    const dy = e.deltaY
    if (!dy) return
    // deltaMode: 1 = lines, 2 = pages → normalize to px, then scale up for a brisk pan.
    const px = e.deltaMode === 1 ? dy * 16 : e.deltaMode === 2 ? dy * wall.clientWidth : dy
    e.preventDefault()
    wall.scrollLeft += px * 3.2
  }, [mobile, wallRef])

  useEffect(() => {
    const wall = wallRef.current
    if (!wall || mobile) return
    wall.addEventListener('wheel', onWheel, { passive: false })
    return () => wall.removeEventListener('wheel', onWheel)
  }, [onWheel, mobile, wallRef])

  // Arrows step to the next/prev column and center it in the viewport (so a click
  // always lands on a block, never between two).
  const page = useCallback((dir) => {
    const wall = wallRef.current
    if (!wall) return
    const cols = Array.from(wall.querySelectorAll(columnSelector))
    if (!cols.length) return
    const wallLeft = wall.getBoundingClientRect().left
    const viewCenter = wall.clientWidth / 2
    let idx = 0, best = Infinity
    cols.forEach((c, i) => {
      const r = c.getBoundingClientRect()
      const centerInView = (r.left - wallLeft) + r.width / 2
      const d = Math.abs(centerInView - viewCenter)
      if (d < best) { best = d; idx = i }
    })
    const nextIdx = Math.max(0, Math.min(cols.length - 1, idx + (dir === 'prev' ? -1 : 1)))
    const r = cols[nextIdx].getBoundingClientRect()
    const centerInContent = (r.left - wallLeft + wall.scrollLeft) + r.width / 2
    wall.scrollTo({ left: centerInContent - viewCenter, behavior: 'smooth' })
  }, [columnSelector, wallRef])

  // Drag-to-pan (desktop): press and drag anywhere on the wall.
  const drag = useRef({ active: false, x: 0, left: 0, moved: false })
  const onPointerDown = (e) => {
    if (mobile || e.target.closest('a,button')) return
    drag.current = { active: true, x: e.clientX, left: wallRef.current.scrollLeft, moved: false }
  }
  const onPointerMove = (e) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 3) drag.current.moved = true
    wallRef.current.scrollLeft = drag.current.left - dx
  }
  const endDrag = () => { drag.current.active = false }

  return { onPointerDown, onPointerMove, endDrag, page }
}
```

- [ ] **Step 4: Run the hook test — expect PASS**

Run: `npx jest __tests__/components/useWallScroll.test.js`
Expected: 4 passing.

- [ ] **Step 5: Refactor FlorenceWall onto the hook**

In `components/image-displays/themes/florence/FlorenceWall.js`:
1. Change the react import to `import { useRef, useState } from 'react'` and add `import useWallScroll from '../shared/useWallScroll'`.
2. Delete the `onWheel` callback, its `useEffect`, the `page` callback, and the `drag`/`onPointerDown`/`onPointerMove`/`endDrag` block (lines 56–118 in the current file).
3. In their place, immediately after `const [menuOpen, setMenuOpen] = useState(false)`:

```js
  const { onPointerDown, onPointerMove, endDrag, page } = useWallScroll({ wallRef, mobile, columnSelector: '.florence-col' })
```

Nothing else changes — the JSX already references `onPointerDown`, `onPointerMove`, `endDrag`, and `page` by these exact names.

- [ ] **Step 6: Verify zero behavior change**

Run: `npx jest __tests__/components/FlorenceGallery.test.js __tests__/components/useWallScroll.test.js`
Expected: all pass. Then run the full suite: `npx jest`. Expected: no new failures.

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/themes/shared/useWallScroll.js components/image-displays/themes/florence/FlorenceWall.js __tests__/components/useWallScroll.test.js
git commit -m "refactor(florence): extract horizontal-wall physics into shared useWallScroll hook"
```

---

### Task 2: Theme definition, registry, fonts

**Files:**
- Create: `common/themes/amsterdam.js`
- Create: `__tests__/themes/amsterdam.test.js`
- Modify: `common/themes/index.js`
- Modify: `__tests__/themes/registry.test.js:8-11`
- Modify: `pages/_document.js:20` (font URL)

**Interfaces:**
- Produces: named exports from `common/themes/amsterdam.js`: `amsterdam` (theme object), `AMSTERDAM_INKS` (map id → `{ ink, onInk }`), `resolveAmsterdamInk(design)` → ink id string, `amsterdamInkColors(design)` → `{ ink, onInk }`. Tasks 4, 6 consume `amsterdamInkColors`; Task 6 consumes `AMSTERDAM_INKS` + `resolveAmsterdamInk` for the swatch UI.

- [ ] **Step 1: Write the failing tests**

In `__tests__/themes/registry.test.js`, update the first test to expect amsterdam:

```js
  it('registers kyoto, manhattan, provence, florence and amsterdam', () => {
    expect(Object.keys(THEMES).sort()).toEqual(['amsterdam', 'florence', 'kyoto', 'manhattan', 'provence'])
    expect(THEME_LIST.map(t => t.id).sort()).toEqual(['amsterdam', 'florence', 'kyoto', 'manhattan', 'provence'])
  })
```

Create `__tests__/themes/amsterdam.test.js`:

```js
import { getBlockSpec } from '@/common/themes'
import { amsterdam, AMSTERDAM_INKS, resolveAmsterdamInk, amsterdamInkColors } from '@/common/themes/amsterdam'

describe('amsterdam theme', () => {
  it('is a left-rail theme with the poster palette', () => {
    expect(amsterdam.id).toBe('amsterdam')
    expect(amsterdam.navStyle).toBe('left-rail')
    expect(amsterdam.tokens['--theme-bg']).toBe('#f6efe4')
    expect(amsterdam.tokens.fonts.display).toContain('Abril Fatface')
    expect(amsterdam.tokens.fonts.serif).toContain('Playfair Display')
    expect(amsterdam.tokens.fonts.condensed).toContain('Anton')
  })

  it('photo defaults to full-height Fill; photos to Row (+Mosaic)', () => {
    const photo = getBlockSpec('amsterdam', 'photo')
    expect(photo.defaultVariant).toBe('full-height')
    expect(photo.variants.map(v => v.id).sort()).toEqual(['centered', 'full-height'])
    const photos = getBlockSpec('amsterdam', 'photos')
    expect(photos.defaultVariant).toBe('row')
    expect(photos.variants.map(v => v.id).sort()).toEqual(['mosaic', 'row'])
  })

  it('text keeps the L/M/S size variants and defaults to the Display font', () => {
    const text = getBlockSpec('amsterdam', 'text')
    expect(text.variants.map(v => v.id)).toEqual(['heading', 'subheading', 'body'])
    expect(text.defaultFont).toBe('display')
    expect(text.fonts.map(f => f.id)).toEqual(['display', 'serif', 'condensed'])
  })

  it('resolves inks: vermilion default, invalid ids fall back', () => {
    expect(resolveAmsterdamInk(undefined)).toBe('vermilion')
    expect(resolveAmsterdamInk({ amsterdamInk: 'nope' })).toBe('vermilion')
    expect(resolveAmsterdamInk({ amsterdamInk: 'ultramarine' })).toBe('ultramarine')
    expect(amsterdamInkColors({ amsterdamInk: 'black' })).toEqual({ ink: '#141210', onInk: '#f6efe4' })
    expect(AMSTERDAM_INKS.vermilion).toEqual({ ink: '#e02b20', onInk: '#ffffff' })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest __tests__/themes/`
Expected: FAIL — amsterdam module missing, registry mismatch.

- [ ] **Step 3: Create the theme file**

```js
// common/themes/amsterdam.js
// Amsterdam — the Dutch-poster editorial theme. A thin left rail beside a
// horizontally scrolling wall of columns: a poster hero (site name enormous in
// Abril Fatface over the cover photo) or an Anton condensed title panel opens
// the wall, text blocks render as full-height solid-ink Panels (Quiet opts out),
// photos hang as Fill columns / Rows / Mosaics with museum captions. Ink is a
// curated 3-swatch control (design.amsterdamInk), never a free color pick.
// Rendered bespoke via AmsterdamWall (Gallery short-circuits to it; SiteNav
// suppressed in the page files); this file supplies palette + fonts + controls.
const AMSTERDAM_FONTS = [
  { id: 'display', label: 'Display' },
  { id: 'serif', label: 'Editorial' },
  { id: 'condensed', label: 'Condensed' },
]

// Curated poster inks. onInk is the text color used on top of the ink.
export const AMSTERDAM_INKS = {
  vermilion: { ink: '#e02b20', onInk: '#ffffff' },
  ultramarine: { ink: '#1a1690', onInk: '#ffffff' },
  black: { ink: '#141210', onInk: '#f6efe4' },
}

export function resolveAmsterdamInk(design) {
  return AMSTERDAM_INKS[design?.amsterdamInk] ? design.amsterdamInk : 'vermilion'
}

export function amsterdamInkColors(design) {
  return AMSTERDAM_INKS[resolveAmsterdamInk(design)]
}

export const amsterdam = {
  id: 'amsterdam',
  name: 'Amsterdam',
  navStyle: 'left-rail',
  tokens: {
    '--theme-bg': '#f6efe4',        // warm cream
    '--theme-text': '#141210',      // near-black ink
    '--theme-text-muted': '#8a8175', // caption gray
    '--theme-accent': '#e02b20',    // vermilion (static accent; live ink is --ams-ink)
    '--theme-rail-width': '96px',
    fonts: {
      serif: '"Playfair Display", Georgia, serif',
      display: '"Abril Fatface", Georgia, serif',
      condensed: '"Anton", "Arial Narrow", sans-serif',
      // Slots stored under other themes still resolve to something sane here.
      fraunces: '"Playfair Display", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
    },
  },
  overrides: {
    // Single photo: Fill (spans the column height, default) or Centered (sized by
    // Size, positioned on cream with its caption).
    photo: {
      hide: ['full-bleed', 'centered', 'side-by-side'],
      add: [{ id: 'full-height', label: 'Fill' }, { id: 'centered', label: 'Centered' }],
      defaultVariant: 'full-height',
    },
    // Photo sets lay out horizontally: Row (side by side, captions beneath) or
    // Mosaic (varied groups of 1/2/3). Size scales the height.
    photos: {
      hide: ['stacked', 'masonry', 'grid', 'square'],
      add: [{ id: 'row', label: 'Row' }, { id: 'mosaic', label: 'Mosaic' }],
      defaultVariant: 'row',
      sizeVariants: ['row', 'mosaic'],
    },
    // Text keeps the base L/M/S variants (they ARE the size control). Panel/Quiet
    // is the Amsterdam-only Style pill (block.amsterdamStyle — see DesignPopover).
    text: { defaultAlign: 'left', aligns: ['left'], defaultFont: 'display', fonts: AMSTERDAM_FONTS },
    testimonial: { defaultFont: 'serif', fonts: AMSTERDAM_FONTS },
    contact: { defaultAlign: 'left', aligns: ['left'] },
  },
}
```

- [ ] **Step 4: Register it**

In `common/themes/index.js` add the import, registry entries, and named export (mirror florence exactly):

```js
import { amsterdam } from './amsterdam'
// ...
export const THEMES = { kyoto, manhattan, provence, florence, amsterdam }
export const THEME_LIST = [kyoto, manhattan, provence, florence, amsterdam]
// ...
export { kyoto, manhattan, provence, florence, amsterdam }
```

- [ ] **Step 5: Add the fonts to the Google Fonts link**

In `pages/_document.js:20`, extend the existing css2 href with the three new families (keep every existing family untouched):

```
&family=Abril+Fatface&family=Anton&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500
```

inserted before `&display=swap`.

- [ ] **Step 6: Run the theme tests — expect PASS**

Run: `npx jest __tests__/themes/`
Expected: all pass (registry + amsterdam).

- [ ] **Step 7: Run the full suite**

Run: `npx jest`
Expected: no new failures. If any test asserts the theme dropdown contents (e.g. ThemeToolbarControl/ThemeSwitcher tests), update its expected list to include Amsterdam — that is the intended product change.

- [ ] **Step 8: Commit**

```bash
git add common/themes/amsterdam.js common/themes/index.js __tests__/themes/ pages/_document.js
git commit -m "feat(themes): register the Amsterdam theme — poster palette, inks, fonts, block overrides"
```

---

### Task 3: Panel/Quiet style resolver + sidebar control

**Files:**
- Modify: `common/themes/variants.js` (add resolver next to `resolveFlorenceAnchor`, line ~92)
- Modify: `components/admin/gallery-builder/DesignPopover.js` (new section after the Florence Position section, line ~111)
- Create: `__tests__/components/AmsterdamDesignPopover.test.js`

**Interfaces:**
- Produces: `resolveAmsterdamStyle(block)` → `'panel' | 'quiet'` from `common/themes/variants.js`. Task 5's AmsterdamColumn consumes it.

- [ ] **Step 1: Write the failing tests**

`__tests__/components/AmsterdamDesignPopover.test.js` (mirror the render harness in the existing `__tests__/components/DesignPopover.test.js` — same mocks/props it uses for PopoverShell anchoring; the shape below is the minimum):

```js
import { render } from '@testing-library/react'
import DesignPopover from '@/components/admin/gallery-builder/DesignPopover'
import { resolveAmsterdamStyle } from '@/common/themes/variants'

describe('Amsterdam text Style control', () => {
  it('resolveAmsterdamStyle: panel by default, quiet only when stored', () => {
    expect(resolveAmsterdamStyle({ type: 'text' })).toBe('panel')
    expect(resolveAmsterdamStyle({ type: 'text', amsterdamStyle: 'quiet' })).toBe('quiet')
    expect(resolveAmsterdamStyle({ type: 'text', amsterdamStyle: 'bogus' })).toBe('panel')
    expect(resolveAmsterdamStyle(undefined)).toBe('panel')
  })

  it('offers Panel/Quiet for amsterdam text blocks only', () => {
    const anchor = document.createElement('div')
    document.body.appendChild(anchor)
    const props = { anchorEl: anchor, onClose: () => {}, onUpdate: () => {} }
    const ams = render(<DesignPopover {...props} block={{ type: 'text', content: 'x' }} themeId="amsterdam" />)
    expect(ams.getByText('Panel')).toBeTruthy()
    expect(ams.getByText('Quiet')).toBeTruthy()
    ams.unmount()
    const kyo = render(<DesignPopover {...props} block={{ type: 'text', content: 'x' }} themeId="kyoto" />)
    expect(kyo.queryByText('Panel')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest __tests__/components/AmsterdamDesignPopover.test.js`
Expected: FAIL — `resolveAmsterdamStyle` not exported.

- [ ] **Step 3: Add the resolver**

In `common/themes/variants.js`, directly beneath `resolveFlorenceAnchor`:

```js
// Amsterdam-only text Style: a text block renders as a full-height solid-ink
// Panel (default) or a Quiet cream museum-label column. Stored flat on the
// block (like florenceAnchor); ignored by every other theme.
export function resolveAmsterdamStyle(block) {
  return block?.amsterdamStyle === 'quiet' ? 'quiet' : 'panel'
}
```

- [ ] **Step 4: Add the sidebar pill**

In `components/admin/gallery-builder/DesignPopover.js`, add `resolveAmsterdamStyle` to the existing `common/themes/variants` import, then insert after the Florence Position section (after line ~111):

```jsx
      {/* Amsterdam: a text block is a solid ink Panel (default) or Quiet museum text. */}
      {themeId === 'amsterdam' && block.type === 'text' && (
        <DesignSection label="Style">
          <PillToggle
            value={resolveAmsterdamStyle(block)}
            onChange={(v) => onUpdate({ ...block, amsterdamStyle: v })}
            options={[{ value: 'panel', label: 'Panel' }, { value: 'quiet', label: 'Quiet' }]}
          />
        </DesignSection>
      )}
```

- [ ] **Step 5: Run tests — expect PASS, then full suite**

Run: `npx jest __tests__/components/AmsterdamDesignPopover.test.js && npx jest`
Expected: pass; no new failures.

- [ ] **Step 6: Commit**

```bash
git add common/themes/variants.js components/admin/gallery-builder/DesignPopover.js __tests__/components/AmsterdamDesignPopover.test.js
git commit -m "feat(amsterdam): Panel/Quiet text style — resolver + sidebar Style pill"
```

---

### Task 4: Shared FitImg, AmsterdamWall shell (rail, menu, openers), CSS foundation

**Files:**
- Create: `components/image-displays/themes/shared/WallFit.js` (FitImg + Overlays moved from FlorenceColumn)
- Create: `components/image-displays/themes/amsterdam/AmsterdamWall.js`
- Create: `components/image-displays/themes/amsterdam/AmsterdamCaption.js`
- Create: `__tests__/components/AmsterdamWall.test.js`
- Modify: `components/image-displays/themes/florence/FlorenceColumn.js` (import FitImg/Overlays from shared)
- Modify: `styles/globals.css` (Amsterdam section appended after the Florence section, line ~639)

**Interfaces:**
- Consumes: `useWallScroll` (Task 1), `amsterdamInkColors` (Task 2).
- Produces:
  - `WallFit.js` exports `FitImg({ img, index, onImageClick, fitClass = 'florence-fit' })` and `Overlays({ url, print })` — exact code moved from `FlorenceColumn.js:39-83`, with the box className parameterized (`<div className={`${fitClass} relative group`} …>`). FlorenceColumn imports them and passes nothing (default keeps `.florence-fit`); Task 5 passes `fitClass="ams-fit"`.
  - `AmsterdamWall` default export with props `{ siteConfig, name, description, blocks, basePath, makeClickHandler, onBlockHover, onBlockClick, mobile, actions, currentPageId, onPageClick, currentPath, photoMeta, pages, cover, opener }` — `cover` is a page cover object (`{ imageUrl, ... }` or asset ref), `opener` is `'hero' | 'title'` (default `'title'`). Task 5 provides `AmsterdamColumn`; until then AmsterdamWall imports it, so create it in this task as a stub that returns `null` (Task 5 replaces the stub with the real renderer).
  - `AmsterdamCaption({ caption, meta })` — museum label (Inter caps), used by Task 5.

- [ ] **Step 1: Move FitImg/Overlays into `shared/WallFit.js`**

Cut `Overlays` and `FitImg` (with their comments, verbatim) from `FlorenceColumn.js:39-83` into the new file; add the imports they need (`useRef`, `useEffect`, `getSizedUrl`, `getImageRefUrl`, `BuyPrintButton`, `EngagementActions`, `WatermarkOverlay` — note the shared dir is one level shallower, so paths are `../../print/BuyPrintButton` etc.); parameterize the class:

```js
// components/image-displays/themes/shared/WallFit.js
export function FitImg({ img, index, onImageClick, fitClass = 'florence-fit' }) {
  // ... moved code, box div becomes:
  // <div className={`${fitClass} relative group`} ref={boxRef} style={{ aspectRatio: ar || '3 / 4' }}>
}
export function Overlays({ url, print }) { /* moved verbatim */ }
```

In `FlorenceColumn.js`, delete the moved code and add `import { FitImg, Overlays } from '../shared/WallFit'`.

Run: `npx jest __tests__/components/FlorenceGallery.test.js` — Expected: PASS (pure move).

- [ ] **Step 2: Write the failing AmsterdamWall test**

```js
// __tests__/components/AmsterdamWall.test.js
import { render, fireEvent } from '@testing-library/react'
import AmsterdamWall from '@/components/image-displays/themes/amsterdam/AmsterdamWall'

describe('AmsterdamWall shell', () => {
  it('renders stage + rail + title opener with the site name, default vermilion ink', () => {
    const { container } = render(<AmsterdamWall name="Van der Meer" description="Photographs" siteConfig={{}} />)
    const stage = container.querySelector('.ams-stage')
    expect(stage).toBeTruthy()
    expect(stage.style.getPropertyValue('--ams-ink')).toBe('#e02b20')
    expect(container.querySelector('.ams-rail')).toBeTruthy()
    expect(container.querySelector('.ams-col--title .ams-title__name').textContent).toBe('Van der Meer')
    expect(container.querySelector('.ams-title__desc').textContent).toBe('Photographs')
  })

  it('renders the poster hero when opener=hero and a cover exists', () => {
    const { container } = render(
      <AmsterdamWall name="Van der Meer" siteConfig={{}} opener="hero" cover={{ imageUrl: 'https://x/cover.jpg' }} />
    )
    const hero = container.querySelector('.ams-col--hero')
    expect(hero).toBeTruthy()
    expect(hero.querySelector('.ams-hero__img').getAttribute('src')).toContain('cover.jpg')
    expect(hero.querySelector('.ams-hero__title').textContent).toBe('Van der Meer')
    expect(container.querySelector('.ams-col--title')).toBeNull()
  })

  it('falls back to the title opener when opener=hero but there is no cover', () => {
    const { container } = render(<AmsterdamWall name="V" siteConfig={{}} opener="hero" />)
    expect(container.querySelector('.ams-col--title')).toBeTruthy()
  })

  it('applies the stored ink', () => {
    const { container } = render(
      <AmsterdamWall name="V" siteConfig={{ design: { amsterdamInk: 'black' } }} />
    )
    const stage = container.querySelector('.ams-stage')
    expect(stage.style.getPropertyValue('--ams-ink')).toBe('#141210')
    expect(stage.style.getPropertyValue('--ams-on-ink')).toBe('#f6efe4')
  })

  it('menu column lists nav pages and marks data-open on toggle', () => {
    const pages = [{ id: 'p1', title: 'Iceland', slug: 'iceland' }, { id: 'p2', title: 'About', slug: 'about', showInNav: false }]
    const { container, getByLabelText, getByText } = render(<AmsterdamWall name="V" siteConfig={{ pages }} />)
    expect(container.querySelector('.ams-menu').getAttribute('data-open')).toBe('false')
    fireEvent.click(getByLabelText('Open menu'))
    expect(container.querySelector('.ams-menu').getAttribute('data-open')).toBe('true')
    expect(getByText('Iceland')).toBeTruthy()
    expect(container.textContent).not.toContain('About')
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx jest __tests__/components/AmsterdamWall.test.js`
Expected: FAIL — module missing.

- [ ] **Step 4: Create AmsterdamCaption, the AmsterdamColumn stub, and AmsterdamWall**

```js
// components/image-displays/themes/amsterdam/AmsterdamCaption.js
// A museum wall-label in the poster register: small Inter caps title, dimmer
// capture meta beneath. `white-space: pre-line` keeps multi-line labels intact.
export default function AmsterdamCaption({ caption, meta }) {
  if (!caption && !meta) return null
  return (
    <figcaption className="ams-caption">
      {caption && <span className="ams-caption__title">{caption}</span>}
      {meta && <span className="ams-caption__meta">{meta}</span>}
    </figcaption>
  )
}
```

```js
// components/image-displays/themes/amsterdam/AmsterdamColumn.js
// Stub — Task 5 replaces this with the real block-column renderer.
export default function AmsterdamColumn() {
  return null
}
```

```js
// components/image-displays/themes/amsterdam/AmsterdamWall.js
// The Amsterdam horizontal poster wall. A thin fixed rail (wordmark · hamburger ·
// ink rule) beside a horizontally-scrolling row of columns: an opener (poster
// hero on the home page, Anton title panel on gallery pages), then one column
// per block. The hamburger slides an ink menu column in at the front. Wheel +
// drag + arrows pan horizontally via useWallScroll; on phones the wall collapses
// to a vertical stack (CSS, via data-mobile). Read-only: edits stay in the sidebar.
import { useRef, useState } from 'react'
import { buildNavTree } from '../../../../common/pagesTree'
import { amsterdamInkColors } from '../../../../common/themes/amsterdam'
import { getImageRefUrl } from '../../../../common/assetRefs'
import { getSizedUrl } from '../../../../common/imageUtils'
import useWallScroll from '../shared/useWallScroll'
import AmsterdamColumn from './AmsterdamColumn'

const SOCIAL_KEYS = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'website']

function IconMenu() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d="M3 6h14M3 12h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
}
function IconClose() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
}
function IconArrow({ dir }) {
  const d = dir === 'prev' ? 'M12 5l-5 5 5 5' : 'M8 5l5 5-5 5'
  return <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden><path d={d} stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function navItemActive(item, currentPageId, basePath, currentPath) {
  const selfActive = currentPageId != null
    ? item.id === currentPageId
    : currentPath === `${basePath}/${item.slug || item.id}`
  if (selfActive) return true
  return (item.children || []).some(c => navItemActive(c, currentPageId, basePath, currentPath))
}

export default function AmsterdamWall({
  siteConfig = {}, name, description, blocks = [], basePath = '', makeClickHandler,
  onBlockHover, onBlockClick, mobile = false, actions = [],
  currentPageId, onPageClick, currentPath = '', photoMeta = 'off', pages = [],
  cover = null, opener = 'title',
}) {
  const wallRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { onPointerDown, onPointerMove, endDrag, page } = useWallScroll({ wallRef, mobile, columnSelector: '.ams-col' })

  const tree = buildNavTree(siteConfig.pages || [], { respectHideChildren: true }).filter(i => i.showInNav !== false)
  const socials = siteConfig.contact || {}
  const socialKeys = SOCIAL_KEYS.filter(k => socials[k])
  const inks = amsterdamInkColors(siteConfig?.design)

  const logoImage = siteConfig?.logoType === 'image' && siteConfig?.logo
  const brand = logoImage
    ? <img src={siteConfig.logo} alt={siteConfig.siteName || 'Logo'} />
    : (siteConfig.siteName || name || '')

  const toggleMenu = () => {
    setMenuOpen(o => {
      const next = !o
      if (next && wallRef.current) wallRef.current.scrollTo({ left: 0, behavior: 'smooth' })
      return next
    })
  }

  const renderLink = (item) => {
    const isLink = item.type === 'link'
    const href = isLink ? (item.url || '#') : `${basePath}/${item.slug || item.id}`
    const active = navItemActive(item, currentPageId, basePath, currentPath)
    const cls = `ams-menu__link${active ? ' is-active' : ''}`
    if (onPageClick && !isLink) {
      return <button className={cls} onClick={() => { onPageClick(item.id); setMenuOpen(false) }}>{item.title}</button>
    }
    return <a className={cls} href={href} {...(isLink ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.title}</a>
  }

  const coverUrl = getImageRefUrl(cover) || cover?.imageUrl
  const heroOpener = opener === 'hero' && !!coverUrl

  const actionButtons = actions.length > 0 && (
    <div className="ams-opener__actions">
      {actions.map((a, i) => (
        <button key={i} type="button" onClick={a.onClick} className={`ams-opener__btn${a.style === 'outline' ? ' ams-opener__btn--outline' : ''}`}>{a.label}</button>
      ))}
    </div>
  )

  return (
    <div className="ams-stage" data-mobile={mobile ? 'true' : 'false'} style={{ '--ams-ink': inks.ink, '--ams-on-ink': inks.onInk }}>
      <nav className="ams-rail" aria-label="Site navigation">
        {onPageClick
          ? <button className="ams-rail__logo" onClick={() => onPageClick(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{brand}</button>
          : <a className="ams-rail__logo" href={basePath || '/'}>{brand}</a>}
        <div className="ams-rail__mid">
          <button className="ams-rail__btn" onClick={toggleMenu} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
        <span className="ams-rail__rule" aria-hidden />
      </nav>

      <div
        className="ams-wall"
        ref={wallRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <section className="ams-menu" data-open={menuOpen ? 'true' : 'false'} aria-hidden={!menuOpen}>
          <div className="ams-menu__inner">
            <ul className="ams-menu__list">
              {tree.map(item => <li key={item.id}>{renderLink(item)}</li>)}
            </ul>
            {socialKeys.length > 0 && (
              <div className="ams-menu__socials">
                {socialKeys.map(k => {
                  const v = socials[k]
                  const href = v?.startsWith?.('http') ? v : `https://${k}.com/${String(v).replace(/^@/, '')}`
                  return <a key={k} className="ams-menu__social" href={href} target="_blank" rel="noopener noreferrer">{k}</a>
                })}
              </div>
            )}
          </div>
        </section>

        {heroOpener ? (
          <section className="ams-col ams-col--hero">
            <img className="ams-hero__img" src={getSizedUrl(coverUrl, 'display')} alt="" />
            <h1 className="ams-hero__title">{name}</h1>
            <div className="ams-hero__foot">
              {description && <p className="ams-hero__desc">{description}</p>}
              {actionButtons}
            </div>
          </section>
        ) : (
          <section className="ams-col ams-col--title">
            {name && <h1 className="ams-title__name">{name}</h1>}
            {description && <p className="ams-title__desc">{description}</p>}
            {actionButtons}
          </section>
        )}

        {blocks.map((block, index) => (
          <AmsterdamColumn
            key={`col-${index}`}
            block={block}
            blockIndex={index}
            photoMeta={photoMeta}
            siteConfig={siteConfig}
            pages={pages}
            basePath={basePath}
            onImageClick={makeClickHandler ? makeClickHandler(index) : undefined}
            hoverProps={{
              ...(onBlockHover ? { onMouseEnter: () => onBlockHover(index), onMouseLeave: () => onBlockHover(null) } : {}),
              ...(onBlockClick ? { onClick: () => onBlockClick(index), style: { cursor: 'pointer' } } : {}),
            }}
          />
        ))}
      </div>

      {!mobile && (
        <div className="ams-arrows">
          <button className="ams-arrows__btn" onClick={() => page('prev')} aria-label="Previous"><IconArrow dir="prev" /></button>
          <button className="ams-arrows__btn" onClick={() => page('next')} aria-label="Next"><IconArrow dir="next" /></button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Append the Amsterdam CSS to `styles/globals.css`**

After the Florence section (end of file region, ~line 639). Shell rules mirror the Florence ones at lines 371–378; wall/rail/menu/arrow rules mirror the `.florence-*` structure (read them in place for exact media-query wrapping — the desktop-only `height: 100vh; overflow: hidden` shell rule and the `data-mobile="true"` collapse follow the same pattern). New rules:

```css
/* ---------- Amsterdam: Dutch-poster horizontal wall ---------- */
[data-theme="amsterdam"] { background: var(--theme-bg, #f6efe4); color: var(--theme-text, #141210); }
[data-theme="amsterdam"] .theme-shell { background: var(--theme-bg, #f6efe4) !important; display: block; }
[data-theme="amsterdam"] .gallery-container { max-width: none; }
[data-theme="amsterdam"] img { border-radius: 0 !important; }

[data-theme="amsterdam"] .ams-stage { display: flex; height: 100vh; overflow: hidden; }
[data-theme="amsterdam"] .ams-rail { width: var(--theme-rail-width, 96px); flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; padding: 20px 0 24px; border-right: 1px solid rgba(20, 18, 16, 0.16); position: relative; z-index: 30; background: var(--theme-bg, #f6efe4); }
[data-theme="amsterdam"] .ams-rail__logo { writing-mode: vertical-rl; text-orientation: mixed; font-family: "Abril Fatface", Georgia, serif; font-size: 17px; letter-spacing: 0.06em; color: var(--theme-text); text-decoration: none; max-height: 46vh; overflow: hidden; }
[data-theme="amsterdam"] .ams-rail__logo img { max-width: 56px; height: auto; }
[data-theme="amsterdam"] .ams-rail__mid { margin: auto 0; }
[data-theme="amsterdam"] .ams-rail__btn { background: none; border: none; cursor: pointer; color: var(--theme-text); padding: 10px; }
[data-theme="amsterdam"] .ams-rail__rule { width: 3px; height: 44px; background: var(--ams-ink); margin-top: auto; }

[data-theme="amsterdam"] .ams-wall { flex: 1; display: flex; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; scrollbar-width: none; }
[data-theme="amsterdam"] .ams-wall::-webkit-scrollbar { display: none; }
[data-theme="amsterdam"] .ams-col { flex: 0 0 auto; height: 100%; box-sizing: border-box; border-right: 1px solid rgba(20, 18, 16, 0.12); position: relative; }

/* Opener: poster hero (home) */
[data-theme="amsterdam"] .ams-col--hero { width: calc(100vw - var(--theme-rail-width, 96px)); overflow: hidden; }
[data-theme="amsterdam"] .ams-hero__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
[data-theme="amsterdam"] .ams-hero__title { position: absolute; top: 2vh; left: 3vw; right: 3vw; margin: 0; font-family: "Abril Fatface", Georgia, serif; font-weight: 400; text-transform: uppercase; color: var(--ams-ink); font-size: clamp(64px, 12vw, 200px); line-height: 0.9; letter-spacing: -0.01em; overflow-wrap: break-word; }
[data-theme="amsterdam"] .ams-hero__foot { position: absolute; left: 3vw; bottom: 6vh; max-width: 40ch; }
[data-theme="amsterdam"] .ams-hero__desc { margin: 0 0 14px; font-family: "Playfair Display", Georgia, serif; font-size: clamp(17px, 1.5vw, 23px); line-height: 1.35; color: #fff; text-shadow: 0 1px 14px rgba(0, 0, 0, 0.45); }

/* Opener: condensed title panel (gallery pages / hero fallback) */
[data-theme="amsterdam"] .ams-col--title { width: min(74vw, 920px); background: var(--ams-ink); color: var(--ams-on-ink); display: flex; flex-direction: column; justify-content: flex-end; padding: 5vh 2.5vw; overflow: hidden; }
[data-theme="amsterdam"] .ams-title__name { margin: 0 0 2vh -0.04em; font-family: "Anton", "Arial Narrow", sans-serif; font-weight: 400; text-transform: uppercase; font-size: clamp(110px, 24vh, 260px); line-height: 0.86; letter-spacing: 0.005em; white-space: nowrap; }
[data-theme="amsterdam"] .ams-title__desc { margin: 0; max-width: 44ch; font-family: "Playfair Display", Georgia, serif; font-size: clamp(15px, 1.3vw, 19px); line-height: 1.45; opacity: 0.92; }

/* Opener actions (Music Show / Client Login) */
[data-theme="amsterdam"] .ams-opener__actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
[data-theme="amsterdam"] .ams-opener__btn { font-family: Inter, sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; padding: 10px 18px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; }
[data-theme="amsterdam"] .ams-col--hero .ams-opener__btn { color: #fff; }

/* Sliding ink menu */
[data-theme="amsterdam"] .ams-menu { flex: 0 0 auto; width: 0; overflow: hidden; transition: width 300ms ease; background: var(--ams-ink); color: var(--ams-on-ink); border-right: none; }
[data-theme="amsterdam"] .ams-menu[data-open="true"] { width: min(44vw, 480px); border-right: 1px solid rgba(20, 18, 16, 0.12); }
[data-theme="amsterdam"] .ams-menu__inner { width: min(44vw, 480px); height: 100%; display: flex; flex-direction: column; justify-content: flex-end; padding: 5vh 2.5vw; box-sizing: border-box; }
[data-theme="amsterdam"] .ams-menu__list { list-style: none; margin: 0; padding: 0; }
[data-theme="amsterdam"] .ams-menu__link { display: block; background: none; border: none; padding: 4px 0; cursor: pointer; text-decoration: none; font-family: "Anton", "Arial Narrow", sans-serif; text-transform: uppercase; font-size: clamp(30px, 4.6vh, 52px); line-height: 1.06; color: var(--ams-on-ink); opacity: 0.82; }
[data-theme="amsterdam"] .ams-menu__link:hover, [data-theme="amsterdam"] .ams-menu__link.is-active { opacity: 1; }
[data-theme="amsterdam"] .ams-menu__socials { display: flex; gap: 14px; margin-top: 4vh; flex-wrap: wrap; }
[data-theme="amsterdam"] .ams-menu__social { font-family: Inter, sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ams-on-ink); text-decoration: none; opacity: 0.75; }
[data-theme="amsterdam"] .ams-menu__social:hover { opacity: 1; }

/* Arrows */
[data-theme="amsterdam"] .ams-arrows { position: fixed; right: 22px; bottom: 20px; display: flex; gap: 6px; z-index: 40; }
[data-theme="amsterdam"] .ams-arrows__btn { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 999px; border: 1px solid rgba(20, 18, 16, 0.25); background: var(--theme-bg, #f6efe4); color: var(--theme-text); cursor: pointer; }
[data-theme="amsterdam"] .ams-arrows__btn:hover { background: var(--ams-ink); color: var(--ams-on-ink); border-color: var(--ams-ink); }

/* Mobile: vertical stack (mirrors the Florence data-mobile collapse) */
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] { display: block; height: auto; overflow: visible; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-rail { flex-direction: row; width: 100%; height: 56px; padding: 0 16px; border-right: none; border-bottom: 1px solid rgba(20, 18, 16, 0.16); position: sticky; top: 0; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-rail__logo { writing-mode: horizontal-tb; max-height: none; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-rail__rule { width: 28px; height: 3px; margin: 0 0 0 auto; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-wall { display: block; overflow: visible; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-col { width: 100% !important; height: auto; min-height: 40vh; border-right: none; border-bottom: 1px solid rgba(20, 18, 16, 0.12); }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-col--hero { height: 72vh; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-title__name { white-space: normal; font-size: clamp(64px, 18vw, 120px); overflow-wrap: break-word; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-menu { width: 100%; transition: none; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-menu[data-open="false"] { display: none; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-menu__inner { width: 100%; height: auto; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-arrows { display: none; }

/* Museum caption + fit box (fit rules mirror .florence-fit) */
[data-theme="amsterdam"] .ams-caption { display: flex; flex-direction: column; gap: 2px; padding: 10px 2px 0; font-family: Inter, sans-serif; }
[data-theme="amsterdam"] .ams-caption__title { font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--theme-text); white-space: pre-line; }
[data-theme="amsterdam"] .ams-caption__meta { font-size: 10px; letter-spacing: 0.1em; color: var(--theme-text-muted, #8a8175); white-space: pre-line; }
```

Then copy the `.florence-fit` rule set (find it in the Florence section of `globals.css`) and duplicate it as `.ams-fit` under `[data-theme="amsterdam"]`, unchanged apart from the class name.

- [ ] **Step 6: Run the wall tests — expect PASS, then the full suite**

Run: `npx jest __tests__/components/AmsterdamWall.test.js __tests__/components/FlorenceGallery.test.js && npx jest`
Expected: pass; no new failures.

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/themes/shared/WallFit.js components/image-displays/themes/amsterdam/ components/image-displays/themes/florence/FlorenceColumn.js styles/globals.css __tests__/components/AmsterdamWall.test.js
git commit -m "feat(amsterdam): AmsterdamWall shell — rail, ink menu, poster hero + title openers, CSS foundation"
```

---

### Task 5: AmsterdamColumn block treatments

**Files:**
- Modify: `components/image-displays/themes/amsterdam/AmsterdamColumn.js` (replace the Task 4 stub)
- Create: `__tests__/components/AmsterdamColumn.test.js`
- Modify: `styles/globals.css` (column rules appended to the Amsterdam section)

**Interfaces:**
- Consumes: `resolveVariant/resolvePhotoSize/resolveFont/resolveSize/resolveQuoteStyle/resolveButtonStyle/resolveAmsterdamStyle` from `common/themes/variants`, `FitImg`/`Overlays` from `../shared/WallFit` (with `fitClass="ams-fit"`), `AmsterdamCaption`, `formatCaptureMeta` from `common/photoMeta`.
- Produces: `AmsterdamColumn({ block, blockIndex, onImageClick, hoverProps, photoMeta, siteConfig, pages, basePath })` rendering one `.ams-col` section per block. Consumed by AmsterdamWall (already wired in Task 4).

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/components/AmsterdamColumn.test.js
import { render } from '@testing-library/react'
import AmsterdamWall from '@/components/image-displays/themes/amsterdam/AmsterdamWall'

const CAPTURE = { capturedAt: '2024-03-12T12:00:00Z', cameraModel: 'Nikon Z6' }

function renderWall(blocks, siteConfig = {}, extra = {}) {
  return render(<AmsterdamWall name="W" siteConfig={siteConfig} blocks={blocks} {...extra} />)
}

describe('AmsterdamColumn block treatments', () => {
  it('photo defaults to Fill; Centered gets a caption plaque', () => {
    const { container } = renderWall([
      { type: 'photo', image: 'https://x/one.jpg', caption: 'GRACHT (2024)' },
      { type: 'photo', image: 'https://x/two.jpg', caption: 'BRUG', themeState: { amsterdam: { variant: 'centered' } } },
    ])
    expect(container.querySelector('.ams-col--fill')).toBeTruthy()
    expect(container.querySelectorAll('.ams-col--photo .ams-caption').length).toBeGreaterThanOrEqual(1)
    expect(container.textContent).toContain('BRUG')
  })

  it('photos render as a Row by default and a Mosaic when stored', () => {
    const imgs = Array.from({ length: 5 }, (_, i) => ({ url: `https://x/${i}.jpg` }))
    const { container } = renderWall([
      { type: 'photos', images: imgs.slice(0, 2) },
      { type: 'photos', images: imgs, themeState: { amsterdam: { variant: 'mosaic' } } },
    ])
    expect(container.querySelector('.ams-col--photorow .ams-row')).toBeTruthy()
    expect(container.querySelector('.ams-col--mosaic .ams-mosaic')).toBeTruthy()
  })

  it('text renders as an ink Panel by default and a Quiet column when stored', () => {
    const { container } = renderWall([
      { type: 'text', content: 'Bold words' },
      { type: 'text', content: 'Small words', amsterdamStyle: 'quiet' },
    ])
    const panel = container.querySelector('.ams-col--panel .ams-panel__text')
    expect(panel.textContent).toBe('Bold words')
    expect(panel.style.fontFamily).toContain('Abril Fatface') // Display default
    expect(container.querySelector('.ams-col--quiet .ams-quiet__text').textContent).toBe('Small words')
  })

  it('testimonial, contact and video render their columns', () => {
    const { container } = renderWall([
      { type: 'testimonial', text: 'Wonderful work', name: 'A. Client' },
      { type: 'contact', heading: 'Get in touch' },
      { type: 'video', url: 'https://www.youtube.com/watch?v=abc123' },
    ])
    expect(container.querySelector('.ams-col--testimonial')).toBeTruthy()
    expect(container.textContent).toContain('Wonderful work')
    expect(container.querySelector('.ams-col--contact')).toBeTruthy()
    expect(container.querySelector('.ams-col--media')).toBeTruthy()
  })

  it('photo captions honor photoMeta', () => {
    const { container: withMeta } = renderWall(
      [{ type: 'photo', image: 'https://x/1.jpg', caption: 'T', capture: CAPTURE, themeState: { amsterdam: { variant: 'centered' } } }],
      {}, { photoMeta: 'date' }
    )
    expect(withMeta.querySelector('.ams-caption__meta')).toBeTruthy()
    const { container: noMeta } = renderWall(
      [{ type: 'photo', image: 'https://x/1.jpg', caption: 'T', capture: CAPTURE, themeState: { amsterdam: { variant: 'centered' } } }],
      {}, { photoMeta: 'off' }
    )
    expect(noMeta.querySelector('.ams-caption__meta')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest __tests__/components/AmsterdamColumn.test.js`
Expected: FAIL — stub renders nothing.

- [ ] **Step 3: Implement AmsterdamColumn**

```js
// components/image-displays/themes/amsterdam/AmsterdamColumn.js
// Renders one gallery block as a column in the Amsterdam poster wall. Nothing
// scrolls vertically — every block fits the viewport height and extends the
// wall's left→right scroll.
//   photo        → Fill (edge-to-edge height, default) or Centered (Size + plaque).
//   photos       → Row (side by side, captions beneath) or Mosaic (groups of 1/2/3).
//   text         → Panel (full-height ink column, Display type) or Quiet (cream
//                  museum label) via block.amsterdamStyle; L/M/S from the variant.
//   video/testimonial/contact/page-gallery → their own columns.
import { getSizedUrl } from '../../../../common/imageUtils'
import { getImageRefUrl, normalizeImageRefs, pageDisplayThumbnail } from '../../../../common/assetRefs'
import { resolveVariant, resolvePhotoSize, resolveFont, resolveButtonStyle, resolveSize, resolveQuoteStyle, resolveAmsterdamStyle } from '../../../../common/themes/variants'
import { formatCaptureMeta } from '../../../../common/photoMeta'
import { FitImg, Overlays } from '../shared/WallFit'
import VideoBlock from '../../gallery/video-block/VideoBlock'
import ContactDisplay from '../../../contact/ContactDisplay'
import AmsterdamCaption from './AmsterdamCaption'

const TID = 'amsterdam'
const PHOTO_HEIGHT = { large: '82vh', medium: '64vh', small: '46vh' }
const ROW_HEIGHT = { large: '62vh', medium: '50vh', small: '38vh' }
const MOSAIC_HEIGHT = { large: '84vh', medium: '66vh', small: '50vh' }
const MOSAIC_PATTERN = [1, 2, 3, 1, 2]
const MOSAIC_GROUP_WIDTHS = ['clamp(240px, 26vw, 400px)', 'clamp(190px, 20vw, 300px)', 'clamp(280px, 30vw, 440px)', 'clamp(210px, 23vw, 340px)']
// Panel text is poster-scaled; Quiet matches the museum-label register.
const PANEL_SIZE = { heading: 'clamp(2.6rem, 4.4vw, 5rem)', subheading: 'clamp(1.9rem, 3vw, 3.4rem)', body: 'clamp(1.15rem, 1.6vw, 1.5rem)' }
const QUIET_SIZE = { heading: 'clamp(1.3rem, 1.7vw, 1.65rem)', subheading: 'clamp(1.12rem, 1.4vw, 1.32rem)', body: 'clamp(1rem, 1.2vw, 1.14rem)' }
const QUOTE_SIZE = { large: 'clamp(1.4rem, 2.2vw, 1.9rem)', medium: 'clamp(1.15rem, 1.7vw, 1.5rem)', small: 'clamp(1rem, 1.4vw, 1.2rem)' }

function mosaicGroups(refs) {
  const groups = []
  let i = 0, p = 0
  while (i < refs.length) {
    const n = Math.min(MOSAIC_PATTERN[p % MOSAIC_PATTERN.length], refs.length - i)
    groups.push(refs.slice(i, i + n))
    i += n; p++
  }
  return groups
}

export default function AmsterdamColumn({ block, blockIndex, onImageClick, hoverProps = {}, photoMeta = 'off', siteConfig = {}, pages = [], basePath = '' }) {
  const metaFor = (o) => formatCaptureMeta(o?.capture, photoMeta, o?.uploadedAt)
  const wrap = (cls, style, children, extra = {}) => (
    <section className={`ams-col ${cls}`} data-block-index={blockIndex} style={style} {...extra} {...hoverProps}>{children}</section>
  )

  switch (block.type) {
    case 'photo': {
      const src = block.image || block.imageUrl
      if (!getImageRefUrl(src)) return null
      const imgObj = { ...(typeof src === 'object' ? src : { url: src }), caption: block.caption, print: block.print, aspectRatio: block.aspectRatio }
      const caption = block.caption || ''
      const meta = metaFor(block)
      if (resolveVariant(block, TID) !== 'centered') {
        return wrap('ams-col--photo ams-col--fill', null, (
          <figure className="ams-figure ams-figure--fill">
            <div className="ams-frame" style={{ height: '100vh' }}>
              <FitImg img={imgObj} index={0} onImageClick={onImageClick} fitClass="ams-fit" />
              {(caption || meta) && (
                <figcaption className="ams-fill-label">
                  {caption && <span className="ams-caption__title">{caption}</span>}
                  {meta && <span className="ams-caption__meta">{meta}</span>}
                </figcaption>
              )}
            </div>
          </figure>
        ))
      }
      const size = resolvePhotoSize(block, TID)
      return wrap('ams-col--photo', null, (
        <figure className="ams-figure">
          <div className="ams-frame" style={{ flex: '0 0 auto', height: PHOTO_HEIGHT[size] || PHOTO_HEIGHT.large }}>
            <FitImg img={imgObj} index={0} onImageClick={onImageClick} fitClass="ams-fit" />
          </div>
          <AmsterdamCaption caption={caption} meta={meta} />
        </figure>
      ))
    }

    case 'photos':
    case 'stacked':
    case 'masonry': {
      const refs = normalizeImageRefs(block.images || block.imageUrls || [])
      if (!refs.length) return null
      const size = resolvePhotoSize(block, TID)

      if (resolveVariant(block, TID) === 'mosaic') {
        const mH = MOSAIC_HEIGHT[size] || MOSAIC_HEIGHT.large
        return wrap('ams-col--mosaic', null, (
          <div className="ams-mosaic" style={{ height: mH }}>
            {mosaicGroups(refs).map((grp, gi) => {
              if (grp.length === 1) {
                return (
                  <div key={gi} className="ams-mosaic__group ams-mosaic__group--solo">
                    <div className="ams-frame" style={{ height: mH }}>
                      <FitImg img={grp[0]} index={refs.indexOf(grp[0])} onImageClick={onImageClick} fitClass="ams-fit" />
                    </div>
                  </div>
                )
              }
              return (
                <div key={gi} className="ams-mosaic__group" style={{ width: MOSAIC_GROUP_WIDTHS[gi % MOSAIC_GROUP_WIDTHS.length] }}>
                  {grp.map((img, ci) => {
                    const url = getImageRefUrl(img) || img.url || img
                    return (
                      <div key={ci} className="ams-mosaic__cell relative group">
                        <img src={getSizedUrl(url, 'display')} alt={img.caption || 'Photo'} loading="lazy" onClick={() => onImageClick?.(refs.indexOf(img))} />
                        <Overlays url={url} print={img.print} />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))
      }

      const rowH = ROW_HEIGHT[size] || ROW_HEIGHT.large
      return wrap('ams-col--photorow', null, (
        <div className="ams-row">
          {refs.map((img, i) => (
            <figure key={i} className="ams-row__item m-0">
              <div className="ams-frame" style={{ height: rowH }}>
                <FitImg img={img} index={i} onImageClick={onImageClick} fitClass="ams-fit" />
              </div>
              <AmsterdamCaption caption={img.caption || ''} meta={metaFor(img)} />
            </figure>
          ))}
        </div>
      ))
    }

    case 'text': {
      if (!block.content) return null
      const fontFamily = resolveFont(block, TID)
      const variant = resolveVariant(block, TID)
      if (resolveAmsterdamStyle(block) === 'quiet') {
        return wrap('ams-col--quiet', null, (
          <p className="ams-quiet__text" style={{ fontFamily, fontSize: QUIET_SIZE[variant] || QUIET_SIZE.body }}>{block.content}</p>
        ))
      }
      return wrap('ams-col--panel', null, (
        <p className="ams-panel__text" style={{ fontFamily, fontSize: PANEL_SIZE[variant] || PANEL_SIZE.body }}>{block.content}</p>
      ))
    }

    case 'video': {
      if (!(block.url || '').trim()) return null
      return wrap('ams-col--media', null, (
        <figure className="m-0" style={{ width: 'clamp(320px, 40vw, 640px)' }}>
          <VideoBlock url={block.url} caption="" variant={2} />
          <AmsterdamCaption caption={block.caption || ''} />
        </figure>
      ))
    }

    case 'testimonial': {
      const photoUrl = getImageRefUrl(block.image || block.imageUrl)
      if (!block.text && !block.name && !photoUrl) return null
      const fontFamily = resolveFont(block, TID)
      const italic = resolveQuoteStyle(block, TID) === 'italic'
      const fontSize = QUOTE_SIZE[resolveSize(block, TID)] || QUOTE_SIZE.large
      const photoAbove = resolveVariant(block, TID) === 'photo-above'
      const quote = block.text && (
        <blockquote className="ams-testimonial__quote" style={{ fontFamily, fontStyle: italic ? 'italic' : 'normal', fontSize }}>{block.text}</blockquote>
      )
      const by = (photoUrl || block.name) && (
        <figcaption className="ams-testimonial__by">
          {photoUrl && <img className="ams-testimonial__avatar" src={getSizedUrl(photoUrl, 'display')} alt={block.name || ''} />}
          {block.name && <span>{block.name}</span>}
        </figcaption>
      )
      return wrap('ams-col--testimonial', null, (
        <figure className="ams-testimonial m-0">
          {photoAbove ? <>{by}{quote}</> : <>{quote}{by}</>}
        </figure>
      ))
    }

    case 'contact': {
      return wrap('ams-col--contact', null, (
        <ContactDisplay
          heading={block.heading}
          subheading={block.subheading}
          buttonText={block.buttonText}
          toEmail={siteConfig?.contact?.email}
          align="left"
          buttonStyle={resolveButtonStyle(block, TID)}
        />
      ))
    }

    case 'page-gallery': {
      const linked = (block.pageIds || []).map(id => (pages || []).find(p => p.id === id)).filter(Boolean)
      if (!linked.length) return null
      return wrap('ams-col--pagelinks', null, (
        <div className="ams-row" style={{ height: ROW_HEIGHT.medium }}>
          {linked.map((p) => {
            const thumb = pageDisplayThumbnail(p)
            const href = `${basePath}/${p.slug || p.id}`
            return (
              <a key={p.id} className="ams-pagelink" href={href}>
                <div className="ams-pagelink__frame">
                  {thumb && <img src={getSizedUrl(thumb, 'display')} alt={p.title || ''} loading="lazy" />}
                </div>
                <span className="ams-pagelink__title">{p.title}</span>
              </a>
            )
          })}
        </div>
      ))
    }

    default:
      return null
  }
}
```

- [ ] **Step 4: Append the column CSS**

Add to the Amsterdam section of `styles/globals.css` (structure mirrors the Florence column rules — read them in place for the fill-label/figure/frame/row/mosaic/pagelink patterns and keep the same box model; only the poster styling differs):

```css
/* Amsterdam block columns */
[data-theme="amsterdam"] .ams-col--photo, [data-theme="amsterdam"] .ams-col--photorow, [data-theme="amsterdam"] .ams-col--mosaic, [data-theme="amsterdam"] .ams-col--media, [data-theme="amsterdam"] .ams-col--pagelinks { display: flex; flex-direction: column; justify-content: center; padding: 0 2vw; }
[data-theme="amsterdam"] .ams-col--fill { padding: 0; justify-content: flex-start; }
[data-theme="amsterdam"] .ams-figure { margin: 0; display: flex; flex-direction: column; justify-content: center; height: 100%; }
[data-theme="amsterdam"] .ams-figure--fill { height: 100%; }
[data-theme="amsterdam"] .ams-frame { position: relative; }
[data-theme="amsterdam"] .ams-fill-label { position: absolute; left: 14px; bottom: 12px; display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; background: rgba(246, 239, 228, 0.92); font-family: Inter, sans-serif; }
[data-theme="amsterdam"] .ams-row { display: flex; align-items: center; gap: 2vw; height: 100%; }
[data-theme="amsterdam"] .ams-row__item { display: flex; flex-direction: column; }
[data-theme="amsterdam"] .ams-mosaic { display: flex; align-items: center; gap: 1.2vw; }
[data-theme="amsterdam"] .ams-mosaic__group { display: flex; flex-direction: column; gap: 1.2vh; height: 100%; }
[data-theme="amsterdam"] .ams-mosaic__group--solo { width: auto; }
[data-theme="amsterdam"] .ams-mosaic__cell { flex: 1; min-height: 0; position: relative; }
[data-theme="amsterdam"] .ams-mosaic__cell img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Text panels */
[data-theme="amsterdam"] .ams-col--panel { background: var(--ams-ink); color: var(--ams-on-ink); width: clamp(420px, 46vw, 780px); display: flex; align-items: center; padding: 6vh 3vw; }
[data-theme="amsterdam"] .ams-panel__text { margin: 0; max-width: 24ch; line-height: 1.08; overflow-wrap: break-word; }
[data-theme="amsterdam"] .ams-col--quiet { width: clamp(300px, 30vw, 480px); display: flex; align-items: center; padding: 6vh 2.5vw; }
[data-theme="amsterdam"] .ams-quiet__text { margin: 0; line-height: 1.5; white-space: pre-line; color: var(--theme-text); }

/* Testimonial / contact / page links */
[data-theme="amsterdam"] .ams-col--testimonial, [data-theme="amsterdam"] .ams-col--contact { width: clamp(340px, 34vw, 560px); display: flex; align-items: center; padding: 6vh 2.5vw; }
[data-theme="amsterdam"] .ams-testimonial__quote { margin: 0 0 16px; line-height: 1.3; }
[data-theme="amsterdam"] .ams-testimonial__by { display: flex; align-items: center; gap: 10px; font-family: Inter, sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--theme-text-muted); }
[data-theme="amsterdam"] .ams-testimonial__avatar { width: 36px; height: 36px; border-radius: 999px; object-fit: cover; }
[data-theme="amsterdam"] .ams-pagelink { display: flex; flex-direction: column; gap: 8px; height: 100%; text-decoration: none; color: var(--theme-text); }
[data-theme="amsterdam"] .ams-pagelink__frame { flex: 1; min-height: 0; width: clamp(220px, 24vw, 380px); background: rgba(20, 18, 16, 0.06); }
[data-theme="amsterdam"] .ams-pagelink__frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
[data-theme="amsterdam"] .ams-pagelink__title { font-family: "Anton", "Arial Narrow", sans-serif; text-transform: uppercase; font-size: 18px; letter-spacing: 0.02em; }

/* Mobile column adjustments */
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-col--panel, [data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-col--quiet, [data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-col--testimonial, [data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-col--contact { width: 100%; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-row { flex-direction: column; align-items: stretch; height: auto; gap: 12px; padding: 16px 0; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-frame { height: auto !important; }
[data-theme="amsterdam"] .ams-stage[data-mobile="true"] .ams-mosaic { flex-wrap: wrap; height: auto !important; }
```

- [ ] **Step 5: Run the column tests — expect PASS, then full suite**

Run: `npx jest __tests__/components/AmsterdamColumn.test.js && npx jest`
Expected: pass; no new failures. (If `VideoBlock`/`ContactDisplay` need mocks in jsdom, mirror how `FlorenceGallery.test.js` handles them — it renders the same components without mocks.)

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/themes/amsterdam/AmsterdamColumn.js styles/globals.css __tests__/components/AmsterdamColumn.test.js
git commit -m "feat(amsterdam): AmsterdamColumn — fill/centered photos, row/mosaic sets, ink panels, quiet text, media columns"
```

---

### Task 6: Integration — Gallery, PageCover, page files, previews, ink + photo-details controls

**Files:**
- Modify: `components/image-displays/gallery/Gallery.js` (props line 282, short-circuit after line 381)
- Modify: `components/image-displays/page/PageCover.js` (return null, next to the florence branch)
- Modify: `pages/sites/[username]/index.js` (lines ~159-161, 187, Gallery call ~221)
- Modify: `pages/sites/[username]/[slug].js` (lines ~103-105, 146, Gallery call ~179)
- Modify: `components/admin/platform/PagePreview.js` (SiteNav line ~81, GalleryPreview call ~94)
- Modify: `components/admin/gallery-builder/GalleryPreview.js` (thread `cover`/`opener`, memo deps line ~154)
- Modify: `components/admin/platform/DesignControlsBody.js` (Amsterdam sections after the Florence ones, line ~78)
- Create: `__tests__/components/AmsterdamGallery.test.js`

**Interfaces:**
- Consumes: `AmsterdamWall` (Task 4/5), `AMSTERDAM_INKS`, `resolveAmsterdamInk` (Task 2), `resolveHomePage` from `common/homePage`.
- Produces: `Gallery` accepts new optional props `cover` (page cover object) and `opener` (`'hero' | 'title'`, default `'title'`); `GalleryPreview` accepts and forwards the same two props.

- [ ] **Step 1: Write the failing integration tests**

```js
// __tests__/components/AmsterdamGallery.test.js
// Mirrors FlorenceGallery.test.js: the wall is reached through Gallery.
import { render } from '@testing-library/react'
import Gallery from '@/components/image-displays/gallery/Gallery'
import PageCover from '@/components/image-displays/page/PageCover'

jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn(), asPath: '/' }) }))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))

describe('Amsterdam wall via Gallery', () => {
  it('short-circuits to the Amsterdam stage with the title opener', () => {
    const { container } = render(
      <Gallery blocks={[{ type: 'text', content: 'Hello' }]} themeId="amsterdam" name="Iceland" siteConfig={{}} />
    )
    expect(container.querySelector('.ams-stage')).toBeTruthy()
    expect(container.querySelector('.ams-col--title .ams-title__name').textContent).toBe('Iceland')
    expect(container.querySelector('.ams-col--panel')).toBeTruthy()
  })

  it('renders the poster hero when cover + opener=hero are passed', () => {
    const { container } = render(
      <Gallery blocks={[]} themeId="amsterdam" name="Van der Meer" siteConfig={{}} cover={{ imageUrl: 'https://x/c.jpg' }} opener="hero" />
    )
    expect(container.querySelector('.ams-col--hero .ams-hero__title').textContent).toBe('Van der Meer')
  })

  it('PageCover renders nothing for amsterdam (the wall owns the opener)', () => {
    const { container } = render(<PageCover themeId="amsterdam" cover={{ imageUrl: 'https://x/c.jpg' }} title="T" />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest __tests__/components/AmsterdamGallery.test.js`
Expected: FAIL — Gallery renders the vertical flow for amsterdam.

- [ ] **Step 3: Gallery short-circuit**

In `components/image-displays/gallery/Gallery.js`:
1. Add `import AmsterdamWall from '../themes/amsterdam/AmsterdamWall'` next to the FlorenceWall import.
2. Add `cover = null, opener = 'title'` to the props destructuring (line 282).
3. Next to `const isFlorence = themeId === 'florence'` add `const isAmsterdam = themeId === 'amsterdam'`.
4. After the Florence short-circuit block (after line 381), add the Amsterdam one:

```jsx
  // Amsterdam is a bespoke, fixed-viewport horizontal poster wall: the rail, the
  // sliding ink menu, the opener column and every block-column live in
  // AmsterdamWall. It owns its own nav (SiteNav suppressed in the page files).
  if (isAmsterdam) {
    const amsActions = []
    if (enableSlideshow) amsActions.push({ label: 'View Music Show', onClick: onSlideshowClick })
    if (enableClientView) amsActions.push({ label: 'Client Login', onClick: onClientLoginClick, style: 'outline' })
    return (
      <PrintStoreProvider printStore={printStore} username={username}>
        <div className="gallery-container">
          <AmsterdamWall
            siteConfig={siteConfig}
            name={name}
            description={description}
            blocks={blocks || []}
            basePath={linkBase}
            makeClickHandler={makeClickHandler}
            onBlockHover={onBlockHover}
            onBlockClick={onBlockClick}
            mobile={isSmallScreen}
            actions={amsActions}
            currentPath={(router.asPath || '').split('?')[0]}
            photoMeta={siteConfig?.design?.amsterdamPhotoMeta || 'date'}
            pages={pages}
            cover={cover}
            opener={opener}
          />
        </div>
        {lightboxIndex !== null && (
          <PhotoLightbox images={allImages} index={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} printStore={printStore} />
        )}
      </PrintStoreProvider>
    )
  }
```

(Use the same local names the Florence block uses — `linkBase`, `enableClientView`, `isSmallScreen`, `lightboxIndex`, `allImages`, `closeLightbox`, `navigateLightbox` all already exist in scope; copy their exact spelling from the Florence block directly above.)

- [ ] **Step 4: PageCover opt-out**

In `PageCover.js`, next to the florence branch:

```js
  // Amsterdam renders its own opener inside AmsterdamWall (poster hero / title
  // panel), so the page-level cover never shows.
  if (themeId === 'amsterdam') {
    return null
  }
```

- [ ] **Step 5: Page files**

`pages/sites/[username]/index.js`:
- Next to `const isFlorence = theme.id === 'florence'` add `const isAmsterdam = theme.id === 'amsterdam'`.
- Line 187: `{!isFlorence && !isAmsterdam && (!isProvence || isMobile) && <SiteNav … />}`
- Gallery call (~221): add `cover={homePage?.cover}` and `opener="hero"`.

`pages/sites/[username]/[slug].js`:
- Same `isAmsterdam` const; line 146 becomes `{!isProvence && !isFlorence && !isAmsterdam && <SiteNav … />}`.
- Gallery call (~179): add `cover={page.cover}` and `opener="title"`.

- [ ] **Step 6: Admin previews**

`components/admin/platform/PagePreview.js` (it already imports `resolveHomePage`):
- Add `const isAmsterdam = theme.id === 'amsterdam'` next to the existing consts; SiteNav line ~81 becomes `{!isProvence && !isFlorence && !isAmsterdam && <SiteNav … />}`.
- GalleryPreview call: add `cover={page.cover}` and `opener={page.id === resolveHomePage(config)?.id ? 'hero' : 'title'}`.

`components/admin/gallery-builder/GalleryPreview.js`:
- Accept `cover` and `opener` in the component props, pass both to `<Gallery … cover={cover} opener={opener} />`, and add `cover?.imageUrl` and `opener` to the `inner` memo dependency array (line ~154) so cover swaps refresh the preview.

- [ ] **Step 7: Ink + photo-details controls**

In `components/admin/platform/DesignControlsBody.js`, add after the Florence "Photo treatment" section (line ~78), importing `AMSTERDAM_INKS, resolveAmsterdamInk` from `../../../common/themes/amsterdam`:

```jsx
      {(config.design?.theme || 'kyoto') === 'amsterdam' && (
        <DesignSection label="Ink" description="The poster color used for panels, titles and the menu.">
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(AMSTERDAM_INKS).map(([id, v]) => {
              const active = resolveAmsterdamInk(config.design) === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={`${id} ink`}
                  aria-pressed={active}
                  onClick={() => update({ design: { ...(config.design || {}), amsterdamInk: id } })}
                  style={{
                    width: 26, height: 26, borderRadius: 999, cursor: 'pointer',
                    background: v.ink,
                    border: active ? '2px solid var(--text-primary)' : '2px solid transparent',
                    outline: active ? '1px solid #fff' : 'none', outlineOffset: -3,
                  }}
                />
              )
            })}
          </div>
        </DesignSection>
      )}

      {(config.design?.theme || 'kyoto') === 'amsterdam' && (
        <DesignSection label="Photo details" description="Show each photo's date or full camera details beneath it.">
          <DesignPillToggle
            value={['off', 'date', 'exif'].includes(config.design?.amsterdamPhotoMeta) ? config.design.amsterdamPhotoMeta : 'date'}
            onChange={(v) => update({ design: { ...(config.design || {}), amsterdamPhotoMeta: v } })}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'date', label: 'Date' },
              { value: 'exif', label: 'EXIF' },
            ]}
          />
        </DesignSection>
      )}
```

Add two assertions to `__tests__/components/AmsterdamGallery.test.js` (or extend `DesignControlsBody.test.js` following its existing harness): rendering `DesignControlsBody` with `config={{ design: { theme: 'amsterdam' } }}` shows the three `aria-label="… ink"` buttons; with `theme: 'kyoto'` it shows none.

- [ ] **Step 8: Run tests — expect PASS, then full suite**

Run: `npx jest __tests__/components/AmsterdamGallery.test.js && npx jest`
Expected: pass; no new failures (FlorenceGallery, GalleryPreview*, SiteNav*, PageCover tests all still green).

- [ ] **Step 9: Commit**

```bash
git add components/image-displays/gallery/Gallery.js components/image-displays/page/PageCover.js "pages/sites/[username]/index.js" "pages/sites/[username]/[slug].js" components/admin/platform/PagePreview.js components/admin/gallery-builder/GalleryPreview.js components/admin/platform/DesignControlsBody.js __tests__/components/AmsterdamGallery.test.js
git commit -m "feat(amsterdam): wire the wall into Gallery, pages and admin preview; ink + photo-details controls"
```

---

### Task 7: Preview page + visual QA

**Files:**
- Create: `pages/amsterdam-preview.js`

**Interfaces:**
- Consumes: `Gallery`, `ThemeProvider` — the full public render path.

- [ ] **Step 1: Create the seeded preview page**

```jsx
// pages/amsterdam-preview.js
// Dev-only playground for the Amsterdam poster wall: one seeded page covering
// every block treatment. ?ink=ultramarine|black swaps the ink; ?theme=florence
// renders the same seed through Florence (regression comparison for the shared
// useWallScroll hook). 404s in production.
import { useRouter } from 'next/router'
import Gallery from '../components/image-displays/gallery/Gallery'
import ThemeProvider from '../components/image-displays/ThemeProvider'

export async function getServerSideProps() {
  if (process.env.NODE_ENV === 'production') return { notFound: true }
  return { props: {} }
}

const P = (id, w = 900, h = 1200) => `https://picsum.photos/id/${id}/${w}/${h}`

const BLOCKS = [
  { type: 'photo', image: P(1015, 1600, 1000), caption: 'HERENGRACHT (2024)\narchival pigment print' },
  { type: 'text', content: 'Four hundred years of water, brick and light.' },
  { type: 'photos', images: [{ url: P(1039) }, { url: P(1043), caption: 'JORDAAN' }, { url: P(1044) }] },
  { type: 'text', content: 'Shot over three winters along the canal ring.', amsterdamStyle: 'quiet', themeState: { amsterdam: { variant: 'body' } } },
  { type: 'photos', images: [{ url: P(1050) }, { url: P(1051) }, { url: P(1052) }, { url: P(1053) }, { url: P(1054) }], themeState: { amsterdam: { variant: 'mosaic' } } },
  { type: 'photo', image: P(1056, 1200, 900), caption: 'PRINSENGRACHT', themeState: { amsterdam: { variant: 'centered' } } },
  { type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: 'PROCESS FILM' },
  { type: 'testimonial', text: 'The prints are extraordinary — the water almost moves.', name: 'A. Collector' },
  { type: 'contact', heading: 'Commissions', subheading: 'Open for 2027 bookings.', buttonText: 'Write to me' },
]

const SITE = {
  siteName: 'Van der Meer',
  design: { theme: 'amsterdam' },
  pages: [
    { id: 'p1', title: 'Canals', slug: 'canals' },
    { id: 'p2', title: 'Portraits', slug: 'portraits' },
    { id: 'p3', title: 'About', slug: 'about' },
  ],
  contact: { instagram: '@vandermeer' },
}

export default function AmsterdamPreview() {
  const router = useRouter()
  const themeId = router.query.theme === 'florence' ? 'florence' : 'amsterdam'
  const ink = ['ultramarine', 'black'].includes(router.query.ink) ? router.query.ink : 'vermilion'
  const siteConfig = { ...SITE, design: { theme: themeId, amsterdamInk: ink } }
  return (
    <ThemeProvider themeId={themeId}>
      <div className="theme-shell">
        <Gallery
          name="Van der Meer"
          description="Photographs from the canal ring, 2021–2026."
          blocks={BLOCKS}
          pages={siteConfig.pages}
          siteConfig={siteConfig}
          themeId={themeId}
          cover={{ imageUrl: P(1015, 2000, 1300) }}
          opener="hero"
        />
      </div>
    </ThemeProvider>
  )
}
```

- [ ] **Step 2: Visual QA against the running dev server (port 3000 — do NOT build)**

Confirm the dev server is up (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/amsterdam-preview` → 200; if it isn't running, start `npm run dev` in the background). Then with the gstack browse skill:

1. `goto http://localhost:3000/amsterdam-preview` → screenshot. Verify: rail + poster hero (Abril name in vermilion over the cover), hairline columns, ink text panel, row + mosaic, museum captions.
2. Wheel/drag: `js "document.querySelector('.ams-wall').scrollLeft = 2000"` → screenshot mid-wall.
3. `goto http://localhost:3000/amsterdam-preview?ink=ultramarine` and `?ink=black` → screenshots; panels/menu/hero title recolor.
4. Menu: click the hamburger (`click .ams-rail__btn`), screenshot the ink menu with Anton page names, click again to close.
5. Title opener: `js "document.querySelector('.ams-col--hero') && 'hero ok'"`, then verify the fallback by loading the page with the hero suppressed — edit nothing; instead confirm via the AmsterdamWall test suite (`falls back to the title opener`) plus a screenshot of any non-home gallery page of a real site switched to Amsterdam in the admin (title panel with Anton name).
5. `viewport 375x812` → screenshot; wall collapses to a vertical stack, rail becomes a top bar.
6. Florence regression: `goto http://localhost:3000/amsterdam-preview?theme=florence` (desktop viewport) → screenshot; the Florence museum wall renders and pans (wheel converts to horizontal) exactly as before.
7. Read every screenshot with the Read tool and fix anything broken before proceeding.

- [ ] **Step 3: Full suite + lint**

Run: `npx jest && npx eslint components/image-displays/themes/amsterdam common/themes/amsterdam.js pages/amsterdam-preview.js`
Expected: all pass, no lint errors.

- [ ] **Step 4: Commit**

```bash
git add pages/amsterdam-preview.js
git commit -m "feat(amsterdam): seeded amsterdam-preview page (dev-only) for visual QA + florence regression"
```

---

## Post-plan checks (before calling it done)

1. Theme pill: Amsterdam appears in the toolbar theme list (no `hidden` flag), the brush popover shows Ink swatches + Photo details when Amsterdam is active.
2. Switch an existing test site Kyoto → Amsterdam → Kyoto in the admin; confirm nothing breaks and stored `amsterdamStyle`/`amsterdamInk` are inert under Kyoto.
3. FlorenceGallery tests + a manual Florence look (`?theme=florence` preview) — unchanged.
