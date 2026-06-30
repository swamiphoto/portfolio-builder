# Page-Gallery Thumbnail Focal Point Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a photographer set a per-page thumbnail focal point so a portrait/off-center subject isn't cropped out of a `page-gallery` card.

**Architecture:** A focal point is a normalized `{ x, y }` (each 0–1) stored on `page.thumbnail.focalPoint`. It renders as CSS `object-position` on the page-gallery card image. It is edited from a reposition icon on each page row inside the page-gallery block editor (sidebar), which opens a small popover with a draggable marker over the full thumbnail. Dragging writes the focal point to the linked page via the existing `updatePage` callback, and the whole-config autosave persists it. The preview re-crops live.

**Tech Stack:** Next.js (pages router), React, Tailwind + inline styles, Jest + React Testing Library.

## Global Constraints

- Default focal point is center; absence renders identically to today (`object-position: 50% 50%`). No data migration.
- Focal point is theme-independent (a point, not a crop). Single source of truth lives on the page's thumbnail, never on the block.
- The focal point lives **inside** `page.thumbnail`, so any action that reassigns the thumbnail object (pick new thumbnail, remove thumbnail) drops the focal point naturally — that is the reset rule. Known residual edge case (not handled in v1): changing the page's cover image while `useCover` is true leaves the old focal point in place.
- Editing is initiated from the sidebar only; the preview stays read-only.
- User-facing copy must read like plain prose (no AI-tell patterns). Strings in this feature: `Reposition`, `Reset`, `Drag to keep the subject in frame.`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `common/assetRefs.js` | Data helpers: normalize focal point into thumbnail, map to CSS, build updated page | Modify |
| `components/image-displays/gallery/Gallery.js` | Apply `object-position` to page-gallery card image | Modify |
| `components/admin/gallery-builder/FocalPointEditor.js` | Popover with draggable marker over the full thumbnail | Create |
| `components/admin/gallery-builder/BlockCard.js` | Reposition icon per page row; mount the editor | Modify |
| `components/admin/gallery-builder/BlockBuilder.js` | Pass `onUpdatePage` through to BlockCard | Modify |
| `components/admin/platform/PageEditorSidebar.js` | Pass `onUpdatePage` through to BlockBuilder | Modify |
| `pages/admin/index.js` | Provide `onUpdatePage={updatePage}` to PageEditorSidebar | Modify |
| `__tests__/common/focalPoint.test.js` | Unit tests for the new helpers | Create |
| `__tests__/common/normalizePageEntity.test.js` | Update 4 thumbnail assertions for new `focalPoint` key | Modify |
| `__tests__/components/PageGalleryFocalPoint.test.js` | Render test: card gets `object-position` | Create |
| `__tests__/components/FocalPointEditor.test.js` | Editor helper + marker + reset + drag tests | Create |

---

## Task 1: Data helpers and thumbnail normalization

**Files:**
- Modify: `common/assetRefs.js` (add helpers; extend `normalizePageEntity` thumbnail block at lines 198–207)
- Test: `__tests__/common/focalPoint.test.js` (create)
- Test: `__tests__/common/normalizePageEntity.test.js` (update 4 assertions)

**Interfaces:**
- Produces:
  - `normalizeFocalPoint(value) -> { x: number, y: number } | null` — clamps x,y to [0,1]; returns null for missing/invalid input.
  - `focalPointToObjectPosition(value) -> string` — e.g. `"25% 75%"`; returns `"50% 50%"` when null/invalid.
  - `applyFocalPointToPage(page, focalPoint) -> page` — returns a new page with `thumbnail.focalPoint` set (or null), preserving other thumbnail fields.
  - `normalizePageEntity` now yields `thumbnail = { imageUrl, useCover, focalPoint }`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/common/focalPoint.test.js`:

```js
import {
  normalizeFocalPoint,
  focalPointToObjectPosition,
  applyFocalPointToPage,
  normalizePageEntity,
} from '../../common/assetRefs'

describe('normalizeFocalPoint', () => {
  it('returns null for missing/invalid input', () => {
    expect(normalizeFocalPoint(null)).toBeNull()
    expect(normalizeFocalPoint(undefined)).toBeNull()
    expect(normalizeFocalPoint('x')).toBeNull()
    expect(normalizeFocalPoint({ x: 'a', y: 1 })).toBeNull()
  })

  it('passes through a valid point', () => {
    expect(normalizeFocalPoint({ x: 0.25, y: 0.75 })).toEqual({ x: 0.25, y: 0.75 })
  })

  it('clamps out-of-range values to [0,1]', () => {
    expect(normalizeFocalPoint({ x: -0.5, y: 2 })).toEqual({ x: 0, y: 1 })
  })
})

describe('focalPointToObjectPosition', () => {
  it('defaults to center when null/invalid', () => {
    expect(focalPointToObjectPosition(null)).toBe('50% 50%')
    expect(focalPointToObjectPosition({ x: 'a' })).toBe('50% 50%')
  })

  it('maps a point to a percentage string', () => {
    expect(focalPointToObjectPosition({ x: 0.25, y: 0.75 })).toBe('25% 75%')
  })
})

describe('applyFocalPointToPage', () => {
  it('sets focalPoint while preserving other thumbnail fields', () => {
    const page = { id: 'p1', thumbnail: { imageUrl: 'u', useCover: false } }
    const out = applyFocalPointToPage(page, { x: 0.2, y: 0.3 })
    expect(out.thumbnail).toEqual({ imageUrl: 'u', useCover: false, focalPoint: { x: 0.2, y: 0.3 } })
    expect(page.thumbnail.focalPoint).toBeUndefined() // does not mutate input
  })

  it('clears focalPoint when passed null', () => {
    const page = { id: 'p1', thumbnail: { imageUrl: 'u', useCover: false, focalPoint: { x: 0.2, y: 0.3 } } }
    const out = applyFocalPointToPage(page, null)
    expect(out.thumbnail.focalPoint).toBeNull()
  })

  it('defaults a missing thumbnail object', () => {
    const out = applyFocalPointToPage({ id: 'p1' }, { x: 0.5, y: 0.5 })
    expect(out.thumbnail).toEqual({ imageUrl: '', useCover: true, focalPoint: { x: 0.5, y: 0.5 } })
  })
})

describe('normalizePageEntity — focalPoint', () => {
  it('defaults focalPoint to null when absent', () => {
    const p = normalizePageEntity({ thumbnail: { imageUrl: 'u', useCover: false }, blocks: [] })
    expect(p.thumbnail.focalPoint).toBeNull()
  })

  it('preserves and clamps a provided focalPoint', () => {
    const p = normalizePageEntity({ thumbnail: { imageUrl: 'u', useCover: false, focalPoint: { x: 2, y: 0.4 } }, blocks: [] })
    expect(p.thumbnail.focalPoint).toEqual({ x: 1, y: 0.4 })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/common/focalPoint.test.js`
Expected: FAIL — `normalizeFocalPoint is not a function` (and related).

- [ ] **Step 3: Add the helpers to `common/assetRefs.js`**

Add these exports near the other image-ref helpers (e.g. just after `normalizeImageRefs`, around line 37):

```js
export function normalizeFocalPoint(value) {
  if (!value || typeof value !== "object") return null;
  const x = Number(value.x);
  const y = Number(value.y);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  const clamp = (n) => Math.min(1, Math.max(0, n));
  return { x: clamp(x), y: clamp(y) };
}

export function focalPointToObjectPosition(value) {
  const fp = normalizeFocalPoint(value);
  if (!fp) return "50% 50%";
  return `${fp.x * 100}% ${fp.y * 100}%`;
}

export function applyFocalPointToPage(page, focalPoint) {
  const base = page.thumbnail || { imageUrl: "", useCover: true };
  return {
    ...page,
    thumbnail: { ...base, focalPoint: normalizeFocalPoint(focalPoint) },
  };
}
```

- [ ] **Step 4: Extend the thumbnail block in `normalizePageEntity`**

Replace the thumbnail-building block (`common/assetRefs.js:198-207`):

```js
  // Back-compat: thumbnail used to be an image ref (or null). Detect and migrate.
  let thumbnail = page.thumbnail;
  if (!thumbnail || typeof thumbnail !== "object" || "url" in thumbnail) {
    const ref = normalizeImageRef(page.thumbnail || page.thumbnailUrl);
    thumbnail = { imageUrl: ref?.url || "", useCover: !ref, focalPoint: null };
  } else {
    thumbnail = {
      imageUrl: thumbnail.imageUrl || "",
      useCover: thumbnail.useCover ?? true,
      focalPoint: normalizeFocalPoint(thumbnail.focalPoint),
    };
  }
```

- [ ] **Step 5: Run the new tests to verify they pass**

Run: `npx jest __tests__/common/focalPoint.test.js`
Expected: PASS (all).

- [ ] **Step 6: Update the existing exact-shape thumbnail assertions**

In `__tests__/common/normalizePageEntity.test.js`, add `focalPoint: null` to the four `thumbnail` `toEqual` objects (lines 9, 19, 27, 32). Each becomes, respectively:

```js
expect(p.thumbnail).toEqual({ imageUrl: 'https://x/t.jpg', useCover: false, focalPoint: null })
```
```js
expect(p.thumbnail).toEqual({ imageUrl: 'https://x/t.jpg', useCover: false, focalPoint: null })
```
```js
expect(p.thumbnail).toEqual({ imageUrl: 'https://x/t.jpg', useCover: false, focalPoint: null })
```
```js
expect(p.thumbnail).toEqual({ imageUrl: '', useCover: true, focalPoint: null })
```

- [ ] **Step 7: Run the full common test suite to verify nothing else broke**

Run: `npx jest __tests__/common/normalizePageEntity.test.js __tests__/common/assetRefs.test.js __tests__/common/focalPoint.test.js`
Expected: PASS (all).

- [ ] **Step 8: Commit**

```bash
git add common/assetRefs.js __tests__/common/focalPoint.test.js __tests__/common/normalizePageEntity.test.js
git commit -m "feat(focal-point): add thumbnail focal-point data helpers and normalization"
```

---

## Task 2: Render `object-position` on the page-gallery card

**Files:**
- Modify: `components/image-displays/gallery/Gallery.js` (import at line 12; card `<img>` at line 255)
- Test: `__tests__/components/PageGalleryFocalPoint.test.js` (create)

**Interfaces:**
- Consumes: `focalPointToObjectPosition` from `common/assetRefs` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/PageGalleryFocalPoint.test.js`:

```js
import { render, screen } from '@testing-library/react'

jest.mock('next/router', () => ({
  useRouter: () => ({ get query() { return {} }, push: jest.fn(), pathname: '/test' }),
}))
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }))
jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }))
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }))

const Gallery = require('../../components/image-displays/gallery/Gallery').default

const linkedPage = {
  id: 'pg1',
  title: 'Trips',
  slug: 'trips',
  thumbnail: { imageUrl: 'https://x/t.jpg', useCover: false, focalPoint: { x: 0.25, y: 0.75 } },
}
const linkedPageNoFocal = {
  id: 'pg2',
  title: 'Weddings',
  slug: 'weddings',
  thumbnail: { imageUrl: 'https://x/w.jpg', useCover: false, focalPoint: null },
}
const blocks = [{ type: 'page-gallery', source: 'manual', pageIds: ['pg1', 'pg2'] }]

test('page-gallery card uses focal point as object-position', () => {
  render(<Gallery name="C" description="" blocks={blocks} pages={[linkedPage, linkedPageNoFocal]} />)
  expect(screen.getByAltText('Trips').style.objectPosition).toBe('25% 75%')
})

test('page-gallery card defaults to center when no focal point', () => {
  render(<Gallery name="C" description="" blocks={blocks} pages={[linkedPage, linkedPageNoFocal]} />)
  expect(screen.getByAltText('Weddings').style.objectPosition).toBe('50% 50%')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/PageGalleryFocalPoint.test.js`
Expected: FAIL — `objectPosition` is `""` (no style applied yet).

- [ ] **Step 3: Add the import**

In `components/image-displays/gallery/Gallery.js`, extend the existing `assetRefs` import (line 12) to include `focalPointToObjectPosition`:

```js
import { getImageRefUrl, normalizeImageRefs, pageDisplayThumbnail, pageThumbGradient, focalPointToObjectPosition } from "../../../common/assetRefs";
```

- [ ] **Step 4: Apply the style to the card image**

In the `page-gallery` case, replace the card `<img>` (line 255):

```jsx
                                {thumb ? (
                                  <img src={thumb} alt={p.title} className="w-full h-[400px] md:h-[500px] object-cover relative z-10 rounded-3xl" style={{ objectPosition: focalPointToObjectPosition(p.thumbnail?.focalPoint) }} />
                                ) : (
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest __tests__/components/PageGalleryFocalPoint.test.js`
Expected: PASS (both).

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/gallery/Gallery.js __tests__/components/PageGalleryFocalPoint.test.js
git commit -m "feat(focal-point): apply thumbnail focal point to page-gallery card crop"
```

---

## Task 3: FocalPointEditor component

**Files:**
- Create: `components/admin/gallery-builder/FocalPointEditor.js`
- Test: `__tests__/components/FocalPointEditor.test.js` (create)

**Interfaces:**
- Consumes: `PopoverShell` (`components/admin/platform/PopoverShell.js`), `pageDisplayThumbnail` (`common/assetRefs`).
- Produces:
  - `focalPointFromPointer(clientX, clientY, rect) -> { x, y }` — clamped [0,1] from a pointer position over a rect.
  - `FocalPointEditor({ page, anchorEl, onClose, onChange })` — default export. `onChange(focalPoint | null)` fires live during drag and on Reset (null).

- [ ] **Step 1: Write the failing tests**

Create `__tests__/components/FocalPointEditor.test.js`:

```js
import { render, screen, fireEvent } from '@testing-library/react'
import FocalPointEditor, { focalPointFromPointer } from '../../components/admin/gallery-builder/FocalPointEditor'

jest.mock('../../components/admin/platform/PopoverShell', () => ({
  __esModule: true,
  default: ({ children, headerRight }) => (
    <div data-testid="shell">{headerRight}{children}</div>
  ),
}))

const page = (focalPoint) => ({
  id: 'p1',
  title: 'Trips',
  thumbnail: { imageUrl: 'https://x/t.jpg', useCover: false, focalPoint },
})

describe('focalPointFromPointer', () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 }
  it('maps a pointer position to a normalized point', () => {
    expect(focalPointFromPointer(100, 50, rect)).toEqual({ x: 0.5, y: 0.5 })
  })
  it('clamps positions outside the rect', () => {
    expect(focalPointFromPointer(-20, 300, rect)).toEqual({ x: 0, y: 1 })
  })
})

describe('FocalPointEditor', () => {
  it('renders the marker at the stored focal point', () => {
    render(<FocalPointEditor page={page({ x: 0.25, y: 0.75 })} anchorEl={document.body} onClose={() => {}} onChange={() => {}} />)
    const marker = screen.getByTestId('focal-marker')
    expect(marker.style.left).toBe('25%')
    expect(marker.style.top).toBe('75%')
  })

  it('Reset calls onChange(null)', () => {
    const onChange = jest.fn()
    render(<FocalPointEditor page={page({ x: 0.25, y: 0.75 })} anchorEl={document.body} onClose={() => {}} onChange={onChange} />)
    fireEvent.click(screen.getByText('Reset'))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('dragging fires onChange with the pointer-derived focal point', () => {
    const onChange = jest.fn()
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => {} })
    render(<FocalPointEditor page={page(null)} anchorEl={document.body} onClose={() => {}} onChange={onChange} />)
    const area = screen.getByTestId('focal-image')
    fireEvent.pointerDown(area, { clientX: 100, clientY: 50 })
    expect(onChange).toHaveBeenLastCalledWith({ x: 0.5, y: 0.5 })
    HTMLElement.prototype.getBoundingClientRect.mockRestore()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/components/FocalPointEditor.test.js`
Expected: FAIL — cannot find module `FocalPointEditor`.

- [ ] **Step 3: Create the component**

Create `components/admin/gallery-builder/FocalPointEditor.js`:

```jsx
import { useState, useRef } from 'react'
import PopoverShell from '../platform/PopoverShell'
import { pageDisplayThumbnail } from '../../../common/assetRefs'

export function focalPointFromPointer(clientX, clientY, rect) {
  const clamp = (n) => Math.min(1, Math.max(0, n))
  const w = rect.width || 1
  const h = rect.height || 1
  return { x: clamp((clientX - rect.left) / w), y: clamp((clientY - rect.top) / h) }
}

export default function FocalPointEditor({ page, anchorEl, onClose, onChange }) {
  const imgWrapRef = useRef(null)
  const [point, setPoint] = useState(() => page?.thumbnail?.focalPoint || { x: 0.5, y: 0.5 })
  const [dragging, setDragging] = useState(false)
  const thumb = pageDisplayThumbnail(page)

  const applyFromEvent = (e) => {
    const rect = imgWrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const np = focalPointFromPointer(e.clientX, e.clientY, rect)
    setPoint(np)
    onChange(np)
  }

  const reset = () => {
    setPoint({ x: 0.5, y: 0.5 })
    onChange(null)
  }

  const resetBtn = (
    <button
      type="button"
      onClick={reset}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9e9788' }}
    >
      Reset
    </button>
  )

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={260} title="Reposition" headerRight={resetBtn}>
      <div style={{ padding: 10 }}>
        {thumb ? (
          <div
            ref={imgWrapRef}
            data-testid="focal-image"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDragging(true); applyFromEvent(e) }}
            onPointerMove={(e) => { if (dragging) applyFromEvent(e) }}
            onPointerUp={() => setDragging(false)}
            style={{ position: 'relative', width: '100%', cursor: 'crosshair', userSelect: 'none', borderRadius: 4, overflow: 'hidden' }}
          >
            <img src={thumb} alt="" draggable={false} style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} />
            <div
              data-testid="focal-marker"
              aria-hidden
              style={{
                position: 'absolute',
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
                width: 22,
                height: 22,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                border: '2px solid #fff',
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
              }}
            />
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#9e9788', padding: '12px 4px' }}>
            This page has no thumbnail image to reposition.
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: '#9e9788', lineHeight: 1.4 }}>
          Drag to keep the subject in frame.
        </div>
      </div>
    </PopoverShell>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/components/FocalPointEditor.test.js`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add components/admin/gallery-builder/FocalPointEditor.js __tests__/components/FocalPointEditor.test.js
git commit -m "feat(focal-point): add FocalPointEditor popover with draggable marker"
```

---

## Task 4: Wire the reposition icon into page-gallery rows

This task threads the `onUpdatePage` callback from the platform editor down to `BlockCard`, then adds a per-row reposition icon that opens `FocalPointEditor` and writes the focal point to the linked page. The data write uses `applyFocalPointToPage` (unit-tested in Task 1); the wiring is verified manually in the running app.

**Files:**
- Modify: `pages/admin/index.js` (PageEditorSidebar render, ~line 308)
- Modify: `components/admin/platform/PageEditorSidebar.js` (props + BlockBuilder render, lines 37 and 193)
- Modify: `components/admin/gallery-builder/BlockBuilder.js` (props line 66; BlockCard render line 484)
- Modify: `components/admin/gallery-builder/BlockCard.js` (props line 102; page-gallery state + rows + editor mount)

**Interfaces:**
- Consumes: `applyFocalPointToPage` (`common/assetRefs`, Task 1), `FocalPointEditor` (Task 3), `updatePage(pageId, updatedPage)` (already defined at `pages/admin/index.js:139`).
- Produces: a new prop `onUpdatePage(pageId, updatedPage)` threaded `index.js → PageEditorSidebar → BlockBuilder → BlockCard`.

- [ ] **Step 1: Pass `onUpdatePage` from the platform editor**

In `pages/admin/index.js`, in the `<PageEditorSidebar ... />` element (around line 308–313, where `onPageChange={(updated) => updatePage(selectedPageId, updated)}` already appears), add one prop:

```jsx
      onUpdatePage={updatePage}
```

- [ ] **Step 2: Forward it through PageEditorSidebar**

In `components/admin/platform/PageEditorSidebar.js`:

Add `onUpdatePage` to the destructured props (line 37):

```js
export default function PageEditorSidebar({ page, siteConfig, libraryConfig, saveStatus, onPageChange, onUpdatePage, onBack, onMoveBlockToPage, onUpdateLibraryCaption, username, blockBuilderRef, onScrollPreviewToBlock, highlightedBlockIndex, onBlockHover, onToggleSidebarCollapse }) {
```

Pass it to `<BlockBuilder>` (add near `pages={pages}` at line 209):

```jsx
        onUpdatePage={onUpdatePage}
```

- [ ] **Step 3: Forward it through BlockBuilder**

In `components/admin/gallery-builder/BlockBuilder.js`:

Add `onUpdatePage` to the destructured props (in the `forwardRef(function BlockBuilder({ ... })` list, around line 78 where `pages` appears):

```js
  pages,
  onUpdatePage,
```

Pass it to `<BlockCard>` (add near `pages={pages}` at line 495):

```jsx
                            onUpdatePage={onUpdatePage}
```

- [ ] **Step 4: Accept the prop and add editor state in BlockCard**

In `components/admin/gallery-builder/BlockCard.js`:

Add `onUpdatePage` to the destructured props (in the `function BlockCard({ ... })` list, after `pages,` at line 109):

```js
  pages,
  onUpdatePage,
```

Import `FocalPointEditor` and `applyFocalPointToPage`. Update the existing imports (lines 4 and 9 area):

```js
import { normalizeImageRefs, buildMultiImageFields, getNestedGalleries, pageDisplayThumbnail, pageThumbGradient, applyFocalPointToPage } from "../../../common/assetRefs";
```
```js
import FocalPointEditor from "./FocalPointEditor";
```

Find where the page-gallery state hooks live (the `pgDragIdx` / `pgDropTarget` / `pickerOpen` declarations) and add two more alongside them:

```js
  const [pgHoverIdx, setPgHoverIdx] = useState(null)
  const [focalEditor, setFocalEditor] = useState(null) // { pageId, anchorEl }
```

- [ ] **Step 5: Add the reposition icon to each page row**

In `BlockCard.js`, inside `manualRows` (the `pgSelected.map((p, idx) => ...)` block, lines 977–1021):

Add hover tracking to the row's existing handlers — extend `onMouseEnter`/`onMouseLeave` on the row `<div>` (lines 991–992):

```jsx
                      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.background = 'rgba(26,18,10,0.04)'; setPgHoverIdx(idx) }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; setPgHoverIdx(prev => prev === idx ? null : prev) }}
```

Then, immediately after the title/description `<div>` (after the closing of the block at line 1018, before the row `</div>` at line 1019), add the reposition button:

```jsx
                      <button
                        type="button"
                        draggable={false}
                        onMouseDown={e => { e.stopPropagation() }}
                        onClick={e => { e.stopPropagation(); setFocalEditor({ pageId: p.id, anchorEl: e.currentTarget }) }}
                        title="Reposition thumbnail"
                        style={{
                          flexShrink: 0,
                          width: 22, height: 22,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer',
                          color: '#9e9788',
                          opacity: pgHoverIdx === idx ? 1 : 0,
                          transition: 'opacity 120ms',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 2v12M2 8h12M8 2L6 4M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2" />
                        </svg>
                      </button>
```

- [ ] **Step 6: Mount the editor**

In `BlockCard.js`, in the page-gallery `return (<> ... </>)` (lines 1039–1053), add the editor next to the existing `PageGalleryPickerModal`, before the closing `</>`:

```jsx
                {focalEditor && (() => {
                  const fpPage = (pages || []).find(p => p.id === focalEditor.pageId)
                  if (!fpPage) return null
                  return (
                    <FocalPointEditor
                      page={fpPage}
                      anchorEl={focalEditor.anchorEl}
                      onClose={() => setFocalEditor(null)}
                      onChange={(fp) => onUpdatePage && onUpdatePage(fpPage.id, applyFocalPointToPage(fpPage, fp))}
                    />
                  )
                })()}
```

- [ ] **Step 7: Run the full test suite to confirm no regressions**

Run: `npx jest`
Expected: PASS (whole suite, including Tasks 1–3).

- [ ] **Step 8: Manual verification in the running app**

```bash
npm run dev
```

Then:
1. Open the admin platform editor and select a **collection** page that has a `page-gallery` block (one whose linked pages have portrait thumbnails).
2. In the sidebar page-gallery block, hover a page row — confirm a reposition (crosshair) icon fades in on the right of the row.
3. Click it — confirm the FocalPointEditor popover opens beside the sidebar, showing the full thumbnail with a marker, and the right-side preview stays visible.
4. Drag the marker — confirm the corresponding card in the live preview re-crops in real time (the subject moves into frame).
5. Click **Reset** — confirm the card returns to a centered crop.
6. Reload the page — confirm the focal point persisted (card still framed as set).
7. Pick a new thumbnail for that page (page settings) — confirm the focal point resets to center.

Capture before/after screenshots of step 4 as evidence.

- [ ] **Step 9: Commit**

```bash
git add pages/admin/index.js components/admin/platform/PageEditorSidebar.js components/admin/gallery-builder/BlockBuilder.js components/admin/gallery-builder/BlockCard.js
git commit -m "feat(focal-point): reposition icon on page-gallery rows opens focal-point editor"
```

---

## Self-Review

**Spec coverage:**
- Data model `page.thumbnail.focalPoint = {x,y}|null`, default center, no migration → Task 1.
- `normalizePageEntity` preserves field → Task 1.
- Reset rule (focal point dropped when thumbnail reassigned) → satisfied structurally by storing inside `thumbnail`; verified manually in Task 4 step 8.7; the residual cover-change edge case is documented in Global Constraints.
- Render `object-position` on the page-gallery card only → Task 2.
- Reposition icon on each sidebar page row → Task 4.
- Focal-point editor popover with draggable marker, preview stays visible → Task 3 + Task 4.
- Live re-crop via `updatePage` + whole-config autosave → Task 4 (no new save path).
- Acceptance criteria 1–8 → criteria 1–3 Task 4 step 8; 4 Task 4 step 8.6; 5 (same page, two galleries) holds because data lives on the page; 6 Task 4 step 8.7; 7 Task 2 default test; 8 Task 2 (same `Gallery` renders admin preview and published site).

**Placeholder scan:** No TBD/TODO; every code step shows complete code.

**Type consistency:** `normalizeFocalPoint`, `focalPointToObjectPosition`, `applyFocalPointToPage`, `focalPointFromPointer`, and the `onUpdatePage(pageId, updatedPage)` signature are used consistently across tasks. Marker test ids (`focal-image`, `focal-marker`) match between Task 3 component and its test.

## Execution Handoff

Two execution options below.
