# Cross-Page Drag & Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable dragging blocks between pages, images between blocks on the same or different pages, and multi-image selection + drag, all within the admin sidebar.

**Architecture:** A shared `DragContext` broadcasts drag state so `PlatformSidebar` page entries can act as drop targets during any drag. Block reordering within a page keeps `@hello-pangea/dnd`; cross-page block drags piggyback on its `onDragStart`/`onDragEnd` callbacks plus pointer events on page entries. Image drags use the existing native HTML5 drag API, extended with a richer JSON payload so cross-block and cross-page drops carry full image ref data and source block type.

**Tech Stack:** React context, native HTML5 drag API, `@hello-pangea/dnd` (existing, unchanged for within-page reorder), Jest + Testing Library

---

## Spec Summary

| Drag | Drop target | Result |
|---|---|---|
| Block (any type) | Same page (between blocks) | Reorder — existing behaviour |
| Block (any type) | Different page entry | Append block as last block of target page |
| Block (any type) | Same page entry | No-op |
| Single image | Same block | Reorder — existing behaviour |
| Single image | Different block (same page) | photo→photo: replace; *→photos/stacked/masonry: append |
| Single image | Page entry | Create new block at bottom; type matches source block |
| Multiple images | Different block | Same rules; photo block only accepts first image (others ignored) |
| Multiple images | Page entry | Create `photos`/`stacked`/`masonry` block (match source type) at bottom |

**Empty blocks:** When the last image is dragged out of a photos/stacked/masonry block, the block remains with its empty state (no auto-delete).

---

## File Structure

**Create:**
- `common/dragContext.js` — `DragProvider`, `useDrag` hook; holds drag payload during any cross-boundary drag

**Modify:**
- `pages/admin/index.js` — wrap with `DragProvider`; add `handleMoveBlockToPage`, `handleDropImagesToPage`
- `components/admin/platform/PlatformSidebar.js` — page entries become drop targets for both block and image drags
- `components/admin/gallery-builder/BlockBuilder.js` — call `startDrag`/`endDrag` from DnD callbacks; pass `sourcePageId` + new cross-page handlers down; accept richer image drop on block drop zones
- `components/admin/gallery-builder/BlockCard.js` — multi-select state; richer `dataTransfer` JSON; cross-block drop handling

**Tests:**
- `__tests__/common/dragContext.test.js`
- `__tests__/components/CrossBlockDrag.test.js`

---

## Task 1: DragContext

**Files:**
- Create: `common/dragContext.js`
- Create: `__tests__/common/dragContext.test.js`
- Modify: `pages/admin/index.js` (wrap with provider)

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/dragContext.test.js
import { render, screen, act } from '@testing-library/react'
import { DragProvider, useDrag } from '../../common/dragContext'

function Probe() {
  const { drag, startDrag, endDrag } = useDrag()
  return (
    <div>
      <span data-testid="type">{drag?.type ?? 'none'}</span>
      <button onClick={() => startDrag({ type: 'block', block: { id: 'b1' }, sourcePageId: 'p1' })}>start</button>
      <button onClick={endDrag}>end</button>
    </div>
  )
}

test('startDrag sets drag payload', () => {
  render(<DragProvider><Probe /></DragProvider>)
  expect(screen.getByTestId('type').textContent).toBe('none')
  act(() => screen.getByText('start').click())
  expect(screen.getByTestId('type').textContent).toBe('block')
})

test('endDrag clears payload', () => {
  render(<DragProvider><Probe /></DragProvider>)
  act(() => screen.getByText('start').click())
  act(() => screen.getByText('end').click())
  expect(screen.getByTestId('type').textContent).toBe('none')
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/swami/conductor/workspaces/portfolio-builder-v1/abuja
npx jest __tests__/common/dragContext.test.js --no-coverage
```
Expected: FAIL — `dragContext` not found.

- [ ] **Step 3: Implement `common/dragContext.js`**

```js
import { createContext, useContext, useState, useCallback } from 'react'

const DragContext = createContext(null)

export function DragProvider({ children }) {
  const [drag, setDrag] = useState(null)
  const startDrag = useCallback((payload) => setDrag(payload), [])
  const endDrag = useCallback(() => setDrag(null), [])
  return (
    <DragContext.Provider value={{ drag, startDrag, endDrag }}>
      {children}
    </DragContext.Provider>
  )
}

export function useDrag() {
  const ctx = useContext(DragContext)
  if (!ctx) throw new Error('useDrag must be used inside DragProvider')
  return ctx
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx jest __tests__/common/dragContext.test.js --no-coverage
```
Expected: PASS (2 tests).

- [ ] **Step 5: Wrap AdminIndex with DragProvider**

In `pages/admin/index.js`, import `DragProvider` and wrap the return:

```jsx
import { DragProvider } from '../../common/dragContext'

// In the return, at the outermost level:
return (
  <DragProvider>
    <AdminLayout sidebar={sidebar} panel={panel}>
      {content}
    </AdminLayout>
  </DragProvider>
)
```

- [ ] **Step 6: Commit**

```bash
git add common/dragContext.js __tests__/common/dragContext.test.js pages/admin/index.js
git commit -m "feat: add DragContext for cross-page drag state"
```

---

## Task 2: Multi-select images in BlockCard

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js`

- [ ] **Step 1: Add selection state and click handler to `BlockCard`**

Below the existing `const [lightboxIndex, setLightboxIndex] = useState(null)` line, add:

```js
const [selectedIndices, setSelectedIndices] = useState(new Set())
const lastSelectedRef = useRef(null)

const handleThumbClick = (e, i) => {
  if (e.metaKey || e.ctrlKey) {
    e.stopPropagation()
    setSelectedIndices(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      lastSelectedRef.current = i
      return next
    })
  } else if (e.shiftKey && lastSelectedRef.current !== null) {
    e.stopPropagation()
    const min = Math.min(lastSelectedRef.current, i)
    const max = Math.max(lastSelectedRef.current, i)
    setSelectedIndices(new Set(Array.from({ length: max - min + 1 }, (_, k) => min + k)))
  } else {
    lastSelectedRef.current = i
    // don't clear selection — plain click still opens lightbox
  }
}
```

- [ ] **Step 2: Pass selection props to `PhotoThumb`**

In `PhotoThumb`'s call site inside the `blockImageRefs.map`, change from:

```jsx
<PhotoThumb
  key={ref.url}
  imageRef={ref}
  onPreview={() => setLightboxIndex(i)}
  dragHandleProps={{ ... }}
  ...
/>
```

to:

```jsx
<PhotoThumb
  key={ref.url}
  imageRef={ref}
  selected={selectedIndices.has(i)}
  onPreview={(e) => {
    handleThumbClick(e, i)
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) setLightboxIndex(i)
  }}
  dragHandleProps={{ ... }}
  ...
/>
```

- [ ] **Step 3: Add `selected` prop to `PhotoThumb` and visual indicator**

In the `PhotoThumb` function signature, add `selected`:

```js
function PhotoThumb({ imageRef, dragHandleProps, onRemove, onUpdateCaption, onPreview, selected }) {
```

In the wrapper div, add a selection ring when selected. Change the outer className to:

```jsx
<div
  {...dragHandleProps}
  className={`relative group/thumb aspect-square bg-stone-100 overflow-hidden cursor-grab ${selected ? 'ring-2 ring-inset ring-blue-500' : ''}`}
  onClick={(e) => !editing && onPreview && onPreview(e)}
>
```

Also add a selection count badge when multiple are selected (shown on the drag handle element):

```jsx
{selected && (
  <div className="absolute top-0.5 left-0.5 bg-blue-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full z-10 leading-none pointer-events-none">
    ✓
  </div>
)}
```

- [ ] **Step 4: Clear selection on Escape key**

In the existing `useEffect` for keyboard handling in `BlockCard` (the one for the lightbox), there isn't one — so add a new effect:

```js
useEffect(() => {
  const handler = (e) => { if (e.key === 'Escape') setSelectedIndices(new Set()) }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])
```

- [ ] **Step 5: Verify visually**

Start dev server (`npm run dev`), open a page with a photos block, cmd+click thumbnails — they should show blue rings. Shift+click should range-select. Escape should clear.

- [ ] **Step 6: Commit**

```bash
git add components/admin/gallery-builder/BlockCard.js
git commit -m "feat: multi-select images in BlockCard with cmd/shift-click"
```

---

## Task 3: Richer drag payload for image drags

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js`

The current `onDragStart` in `PhotoThumb`'s `dragHandleProps` only sets `text/plain` (the URL). Change it to also carry a JSON payload identifying the source block type and all dragged image refs.

- [ ] **Step 1: Update drag start in `BlockCard`'s `blockImageRefs.map`**

The `dragHandleProps` currently passed to each `PhotoThumb` include:

```js
onDragStart: (e) => { dragPhotoIndex.current = i; e.dataTransfer.effectAllowed = "move"; e.stopPropagation(); },
```

Replace with:

```js
onDragStart: (e) => {
  dragPhotoIndex.current = i
  e.dataTransfer.effectAllowed = 'move'
  e.stopPropagation()
  const dragging = selectedIndices.size > 1 && selectedIndices.has(i)
    ? blockImageRefs.filter((_, j) => selectedIndices.has(j))
    : [blockImageRefs[i]]
  const payload = {
    imageRefs: dragging,
    sourceBlockType: block.type,
    sourceBlockIndex: null, // filled by BlockBuilder
  }
  e.dataTransfer.setData('application/x-photo-drag', JSON.stringify(payload))
  e.dataTransfer.setData('text/plain', blockImageRefs[i].url) // backward compat
},
```

- [ ] **Step 2: Update the existing `handleDrop` on the photo grid in `BlockCard`**

Currently the multi-image block drop zone reads:

```js
const handleDrop = (e) => {
  e.preventDefault();
  const url = e.dataTransfer.getData("text/plain");
  if (!url || !isPhotoBlock) return;
  const existingRefs = normalizeImageRefs(block.images || block.imageUrls || []);
  if (existingRefs.some(r => r.url === url)) return;
  onUpdate({ ...block, ...buildMultiImageFields([...existingRefs, { assetId: null, url }]) });
};
```

Replace with:

```js
const handleDrop = (e) => {
  e.preventDefault()
  if (!isPhotoBlock) return
  const raw = e.dataTransfer.getData('application/x-photo-drag')
  let incomingRefs
  if (raw) {
    try { incomingRefs = JSON.parse(raw).imageRefs } catch { incomingRefs = null }
  }
  if (!incomingRefs) {
    const url = e.dataTransfer.getData('text/plain')
    if (!url) return
    incomingRefs = [{ assetId: null, url }]
  }
  const existingRefs = normalizeImageRefs(block.images || block.imageUrls || [])
  const toAdd = incomingRefs.filter(r => !existingRefs.some(e => e.url === r.url))
  if (!toAdd.length) return
  onUpdate({ ...block, ...buildMultiImageFields([...existingRefs, ...toAdd]) })
}
```

Also update the **single photo block** (`block.type === 'photo'`) drop handler to read the richer payload:

Find:
```js
onDrop={(e) => {
  e.preventDefault();
  const url = e.dataTransfer.getData("text/plain");
  if (url) onUpdate({ ...block, imageUrl: url });
}}
```

Replace with:
```js
onDrop={(e) => {
  e.preventDefault()
  const raw = e.dataTransfer.getData('application/x-photo-drag')
  let url = null
  if (raw) {
    try { url = JSON.parse(raw).imageRefs?.[0]?.url } catch {}
  }
  if (!url) url = e.dataTransfer.getData('text/plain')
  if (url) onUpdate({ ...block, imageUrl: url })
}}
```

- [ ] **Step 3: Verify library drags still work**

Library drag in `AdminLibrary` still uses `text/plain` only. The fallback path in the new `handleDrop` reads `text/plain` when `application/x-photo-drag` is absent, so library drags still work. Test by dragging from the library picker and verifying it still lands in blocks.

- [ ] **Step 4: Commit**

```bash
git add components/admin/gallery-builder/BlockCard.js
git commit -m "feat: richer drag payload for image drags (cross-block/page support)"
```

---

## Task 4: Cross-block image drops on same page

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js`

Currently the `onDrop` handlers only fire if you drop directly onto the photo grid area of the same block. We need drops from _other_ blocks to also work. This is already mostly handled after Task 3 — the richer payload lands on the target block's existing `handleDrop`. The gap is that when you drag from one block, the source block also tries to reorder internally via `dragPhotoIndex`. We need to detect cross-block drops and skip internal reorder.

- [ ] **Step 1: Write a cross-block drop test**

```js
// __tests__/components/CrossBlockDrag.test.js
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('../../../common/imageUtils', () => ({ getSizedUrl: (url) => url }))
jest.mock('../../../common/assetRefs', () => ({
  normalizeImageRefs: (x) => Array.isArray(x) ? x : [],
  buildMultiImageFields: (refs) => ({ images: refs }),
  removeImageRef: (refs, ref) => refs.filter(r => r.url !== ref.url),
}))
jest.mock('../../../components/admin/gallery-builder/DesignPopover', () => ({ __esModule: true, default: () => null }))
jest.mock('../../../components/admin/AdminPhotoLightbox', () => ({ __esModule: true, default: () => null }))

const BlockCard = require('../../../components/admin/gallery-builder/BlockCard').default

const photosBlock = {
  type: 'masonry',
  images: [
    { assetId: 'a1', url: 'https://example.com/a.jpg', caption: '' },
  ],
}

test('dropping a cross-block drag payload appends image to target block', () => {
  const onUpdate = jest.fn()
  render(
    <BlockCard
      block={photosBlock}
      dragHandleProps={{}}
      onUpdate={onUpdate}
      onRemove={() => {}}
      onAddPhotos={() => {}}
      onRemovePhoto={() => {}}
      pages={[]}
    />
  )
  const grid = document.querySelector('.grid')
  const payload = JSON.stringify({
    imageRefs: [{ assetId: 'b2', url: 'https://example.com/b.jpg', caption: '' }],
    sourceBlockType: 'masonry',
  })
  fireEvent.drop(grid, {
    dataTransfer: {
      getData: (type) => type === 'application/x-photo-drag' ? payload : '',
    },
  })
  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
    images: expect.arrayContaining([
      expect.objectContaining({ url: 'https://example.com/a.jpg' }),
      expect.objectContaining({ url: 'https://example.com/b.jpg' }),
    ]),
  }))
})
```

- [ ] **Step 2: Run test**

```bash
npx jest __tests__/components/CrossBlockDrag.test.js --no-coverage
```
Expected: PASS (the logic from Task 3 already handles this).

- [ ] **Step 3: Fix the internal-reorder guard in `PhotoThumb`'s `onDrop`**

Each `PhotoThumb` also has an `onDrop` in its `dragHandleProps` for within-block reorder:

```js
onDrop: (e) => {
  e.preventDefault(); e.stopPropagation();
  const from = dragPhotoIndex.current;
  if (from === null || from === i) return;
  ...reorder logic...
}
```

This fires even on cross-block drags because `dragPhotoIndex.current` may be stale. Guard it:

```js
onDrop: (e) => {
  e.preventDefault(); e.stopPropagation();
  const from = dragPhotoIndex.current;
  // Only reorder if the drag originated within this block
  const raw = e.dataTransfer.getData('application/x-photo-drag')
  if (raw) return  // cross-block drag — handled by the grid's onDrop
  if (from === null || from === i) return;
  const refs = normalizeImageRefs(block.images || block.imageUrls || []);
  const [moved] = refs.splice(from, 1);
  refs.splice(i, 0, moved);
  dragPhotoIndex.current = null;
  onUpdate({ ...block, ...buildMultiImageFields(refs) });
},
```

Wait — `e.dataTransfer.getData` may not be available in `onDrop` on all browsers during testing. Check: `getData` is available in `drop` events. This is fine for runtime. For the test above, the mock provides it.

But for within-block drag, `application/x-photo-drag` IS set (we set it in Task 3). So the guard `if (raw) return` would break within-block reorder.

Fix: add a `sourceBlockKey` to the payload. Each block has a stable key from its position... but blocks don't have IDs. Use a ref instead:

In `BlockCard`, add:

```js
const blockKeyRef = useRef(Math.random().toString(36).slice(2))
```

In the drag start `onDragStart`:

```js
const payload = {
  imageRefs: dragging,
  sourceBlockType: block.type,
  sourceBlockKey: blockKeyRef.current,
}
```

In the `PhotoThumb`'s `onDrop`:

```js
onDrop: (e) => {
  e.preventDefault(); e.stopPropagation();
  const raw = e.dataTransfer.getData('application/x-photo-drag')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed.sourceBlockKey !== blockKeyRef.current) return // cross-block, let grid handle
    } catch {}
  }
  const from = dragPhotoIndex.current;
  if (from === null || from === i) return;
  const refs = normalizeImageRefs(block.images || block.imageUrls || []);
  const [moved] = refs.splice(from, 1);
  refs.splice(i, 0, moved);
  dragPhotoIndex.current = null;
  onUpdate({ ...block, ...buildMultiImageFields(refs) });
},
```

Also update the grid-level `handleDrop` to skip if `sourceBlockKey === blockKeyRef.current` (within-block drags are handled by the thumbnail's `onDrop`):

```js
const handleDrop = (e) => {
  e.preventDefault()
  if (!isPhotoBlock) return
  const raw = e.dataTransfer.getData('application/x-photo-drag')
  let incomingRefs
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed.sourceBlockKey === blockKeyRef.current) return // within-block, handled by thumb
      incomingRefs = parsed.imageRefs
    } catch { incomingRefs = null }
  }
  if (!incomingRefs) {
    const url = e.dataTransfer.getData('text/plain')
    if (!url) return
    incomingRefs = [{ assetId: null, url }]
  }
  const existingRefs = normalizeImageRefs(block.images || block.imageUrls || [])
  const toAdd = incomingRefs.filter(r => !existingRefs.some(ex => ex.url === r.url))
  if (!toAdd.length) return
  onUpdate({ ...block, ...buildMultiImageFields([...existingRefs, ...toAdd]) })
}
```

- [ ] **Step 4: Update test to include `sourceBlockKey`**

Update the test payload in `CrossBlockDrag.test.js` to include a `sourceBlockKey` that differs from the rendered block's key:

```js
const payload = JSON.stringify({
  imageRefs: [{ assetId: 'b2', url: 'https://example.com/b.jpg', caption: '' }],
  sourceBlockType: 'masonry',
  sourceBlockKey: 'different-key',  // cross-block
})
```

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add components/admin/gallery-builder/BlockCard.js __tests__/components/CrossBlockDrag.test.js
git commit -m "feat: cross-block image drag within same page"
```

---

## Task 5: PlatformSidebar page drop targets

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js`

Page entries need to:
1. Show a drop zone highlight when a block or image drag is in progress
2. Accept HTML5 `drop` events for image drags
3. Track pointer position for block drags (which use `@hello-pangea/dnd`, not HTML5)

- [ ] **Step 1: Import `useDrag` and add drop state**

```js
import { useDrag } from '../../../common/dragContext'

// inside PlatformSidebar:
const { drag } = useDrag()
const [dropTargetId, setDropTargetId] = useState(null)
```

- [ ] **Step 2: Update page entry rendering**

Find the page entry `<div key={page.id} className="relative">` section (around line 142 of the original file). Add drag event handlers and a visual drop indicator to each page button:

```jsx
{pages.map(page => {
  const isDropTarget = drag !== null && dropTargetId === page.id
  const isCurrentPage = selectedPageId === page.id
  return (
    <div
      key={page.id}
      className="relative"
      onPointerEnter={() => drag && setDropTargetId(page.id)}
      onPointerLeave={() => setDropTargetId(null)}
      onDragOver={(e) => { if (drag) { e.preventDefault(); setDropTargetId(page.id) } }}
      onDragLeave={() => setDropTargetId(null)}
      onDrop={(e) => {
        e.preventDefault()
        setDropTargetId(null)
        if (!drag) return
        if (drag.type === 'images') {
          if (page.id === drag.sourcePageId) return // same page, no-op
          onDropImagesToPage?.(page.id, drag.imageRefs, drag.sourceBlockType)
        }
        // block drops are handled via onDragEnd in BlockBuilder + context
      }}
    >
      {/* existing rename input or page button */}
      {renamingId === page.id ? (
        /* ... existing rename UI unchanged ... */
      ) : (
        <button
          onClick={() => onSelectPage?.(page.id)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            isDropTarget
              ? 'bg-blue-50 ring-1 ring-blue-300 text-blue-700'
              : isCurrentPage
              ? 'bg-gray-100 text-gray-900 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex-1 truncate">{page.title}</span>
          {isDropTarget && <span className="text-[10px] text-blue-500 flex-shrink-0">Drop here</span>}
          {/* ... existing ⋯ menu button ... */}
        </button>
      )}
    </div>
  )
})}
```

- [ ] **Step 3: Add `onDropImagesToPage` and `onDropBlockToPage` props to PlatformSidebar**

Add to the props destructuring:

```js
export default function PlatformSidebar({
  siteConfig,
  saveStatus,
  onConfigChange,
  onSignOut,
  selectedPageId,
  onSelectPage,
  onShowLibrary,
  username,
  onDropImagesToPage,
  onDropBlockToPage,   // called by BlockBuilder's onDragEnd when no dnd destination
}) {
```

Also expose `dropTargetId` so `BlockBuilder` can read it via a callback. The cleanest way: store it in `DragContext` instead of local state. Update DragContext:

Actually, keep it simpler. `BlockBuilder` needs to know the drop target page ID when `@hello-pangea/dnd`'s `onDragEnd` fires with no destination. Store `dropTargetId` in `DragContext`:

In `common/dragContext.js`, add `dropTargetPageId` and `setDropTargetPageId`:

```js
export function DragProvider({ children }) {
  const [drag, setDrag] = useState(null)
  const [dropTargetPageId, setDropTargetPageId] = useState(null)
  const startDrag = useCallback((payload) => setDrag(payload), [])
  const endDrag = useCallback(() => { setDrag(null); setDropTargetPageId(null) }, [])
  return (
    <DragContext.Provider value={{ drag, startDrag, endDrag, dropTargetPageId, setDropTargetPageId }}>
      {children}
    </DragContext.Provider>
  )
}
```

Then in `PlatformSidebar`, use `setDropTargetPageId` instead of local `setDropTargetId`:

```js
const { drag, setDropTargetPageId, dropTargetPageId } = useDrag()

// In onPointerEnter: setDropTargetPageId(page.id)
// In onPointerLeave/onDragLeave: setDropTargetPageId(null)
// isDropTarget check: dropTargetPageId === page.id
```

Update `dragContext.test.js` to cover `dropTargetPageId`:

```js
test('setDropTargetPageId stores target', () => {
  function Probe2() {
    const { dropTargetPageId, setDropTargetPageId } = useDrag()
    return (
      <div>
        <span data-testid="target">{dropTargetPageId ?? 'none'}</span>
        <button onClick={() => setDropTargetPageId('p2')}>set</button>
      </div>
    )
  }
  render(<DragProvider><Probe2 /></DragProvider>)
  act(() => screen.getByText('set').click())
  expect(screen.getByTestId('target').textContent).toBe('p2')
})
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/common/dragContext.test.js --no-coverage
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add common/dragContext.js components/admin/platform/PlatformSidebar.js __tests__/common/dragContext.test.js
git commit -m "feat: page entries become drop targets for cross-page drags"
```

---

## Task 6: Cross-page block drag

**Files:**
- Modify: `components/admin/gallery-builder/BlockBuilder.js`
- Modify: `pages/admin/index.js`

When `@hello-pangea/dnd`'s `onDragStart` fires, push the block into `DragContext`. When `onDragEnd` fires with no destination, check `dropTargetPageId` and execute the cross-page move.

- [ ] **Step 1: Update `BlockBuilder` to accept and use drag context**

`BlockBuilder` needs: `sourcePageId`, `onMoveBlockToPage` prop. Add both to its props:

```js
export default function BlockBuilder({
  // ... existing props ...
  sourcePageId,
  onMoveBlockToPage,
}) {
```

Import `useDrag` at the top of `BlockBuilder.js`:

```js
import { useDrag } from '../../../common/dragContext'
```

Inside `BlockBuilder`:

```js
const { startDrag, endDrag, dropTargetPageId } = useDrag()
```

- [ ] **Step 2: Update `DragDropContext` callbacks**

Find the existing `<DragDropContext onDragEnd={handleDragEnd}>` and replace with:

```jsx
<DragDropContext
  onDragStart={(start) => {
    const block = (gallery.blocks || [])[start.source.index]
    if (block && sourcePageId) {
      startDrag({ type: 'block', block, sourcePageId })
    }
  }}
  onDragEnd={(result) => {
    const targetPageId = dropTargetPageId
    endDrag()
    if (!result.destination) {
      if (targetPageId && targetPageId !== sourcePageId && onMoveBlockToPage) {
        const block = (gallery.blocks || [])[result.source.index]
        if (block) onMoveBlockToPage(sourcePageId, result.source.index, targetPageId)
      }
      return
    }
    handleDragEnd(result)
  }}
>
```

- [ ] **Step 3: Wire `sourcePageId` and `onMoveBlockToPage` in `PageEditorSidebar`**

In `components/admin/platform/PageEditorSidebar.js`, the `BlockBuilder` call already has many props. Add:

```jsx
<BlockBuilder
  ...existing props...
  sourcePageId={page.id}
  onMoveBlockToPage={onMoveBlockToPage}
/>
```

Add `onMoveBlockToPage` to `PageEditorSidebar`'s props:

```js
export default function PageEditorSidebar({ page, siteConfig, saveStatus, onPageChange, onBack, onMoveBlockToPage }) {
```

- [ ] **Step 4: Wire in `pages/admin/index.js`**

Add `handleMoveBlockToPage`:

```js
const handleMoveBlockToPage = useCallback((sourcePageId, blockIndex, targetPageId) => {
  if (sourcePageId === targetPageId) return
  updateConfig(prev => {
    const pages = [...prev.pages]
    const sourcePage = pages.find(p => p.id === sourcePageId)
    const targetPage = pages.find(p => p.id === targetPageId)
    if (!sourcePage || !targetPage) return prev
    const sourceBlocks = [...(sourcePage.blocks || [])]
    const [movedBlock] = sourceBlocks.splice(blockIndex, 1)
    return {
      ...prev,
      pages: pages.map(p => {
        if (p.id === sourcePageId) return { ...p, blocks: sourceBlocks }
        if (p.id === targetPageId) return { ...p, blocks: [...(p.blocks || []), movedBlock] }
        return p
      }),
    }
  })
}, [updateConfig])
```

Pass it to `PageEditorSidebar` in the panel JSX:

```jsx
const panel = selectedPage ? (
  <PageEditorSidebar
    page={selectedPage}
    siteConfig={siteConfig}
    saveStatus={saveStatus}
    onPageChange={(updated) => updatePage(selectedPageId, updated)}
    onMoveBlockToPage={handleMoveBlockToPage}
    onBack={null}
  />
) : null
```

Also wire `PlatformSidebar` with `onDropBlockToPage` — but for blocks, the `onDragEnd` callback in `BlockBuilder` calls `onMoveBlockToPage` directly. `PlatformSidebar` only needs `onDropImagesToPage` (for Task 7). So no additional wiring needed in `PlatformSidebar` for blocks.

- [ ] **Step 5: Also wire in `PageEditorSidebar` for `PlatformSidebar`**

`PlatformSidebar` is rendered in `pages/admin/index.js` as the `sidebar` variable. Add `onDropImagesToPage` prop to it (will be used in Task 7):

No change needed yet — leave `onDropImagesToPage` for Task 7.

- [ ] **Step 6: Test manually**

Start dev server. Add multiple blocks to a page. Drag a block handle past the edge of the panel toward the sidebar. The source page entry in the sidebar should highlight blue. Release — block should disappear from source page and appear at the bottom of the target page.

- [ ] **Step 7: Commit**

```bash
git add components/admin/gallery-builder/BlockBuilder.js components/admin/platform/PageEditorSidebar.js pages/admin/index.js
git commit -m "feat: drag block to another page via sidebar drop target"
```

---

## Task 7: Cross-page image drag

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js`
- Modify: `components/admin/platform/PlatformSidebar.js`
- Modify: `pages/admin/index.js`

When image drag starts in `BlockCard`, set DragContext with type `'images'`. `PlatformSidebar`'s `onDrop` already handles image drops (from Task 5). Wire the handler through to `pages/admin/index.js`.

- [ ] **Step 1: Set DragContext on image drag start in `BlockCard`**

Import `useDrag`:

```js
import { useDrag } from '../../../common/dragContext'
```

Inside `BlockCard`:

```js
const { startDrag, endDrag } = useDrag()
```

In the `dragHandleProps.onDragStart`:

```js
onDragStart: (e) => {
  dragPhotoIndex.current = i
  e.dataTransfer.effectAllowed = 'move'
  e.stopPropagation()
  const dragging = selectedIndices.size > 1 && selectedIndices.has(i)
    ? blockImageRefs.filter((_, j) => selectedIndices.has(j))
    : [blockImageRefs[i]]
  const payload = {
    imageRefs: dragging,
    sourceBlockType: block.type,
    sourceBlockKey: blockKeyRef.current,
  }
  e.dataTransfer.setData('application/x-photo-drag', JSON.stringify(payload))
  e.dataTransfer.setData('text/plain', blockImageRefs[i].url)
  if (sourcePageId) {
    startDrag({ type: 'images', imageRefs: dragging, sourceBlockType: block.type, sourcePageId })
  }
},
onDragEnd: () => {
  dragPhotoIndex.current = null
  endDrag()
  setSelectedIndices(new Set())
},
```

`BlockCard` needs `sourcePageId` prop (passed from `BlockBuilder`). Add it:

In `BlockBuilder`, pass `sourcePageId` to each `BlockCard`:

```jsx
<BlockCard
  ...existing props...
  sourcePageId={sourcePageId}
/>
```

Add `sourcePageId` to `BlockCard`'s props:

```js
export default function BlockCard({
  // ...existing...
  sourcePageId,
  // ...
}) {
```

- [ ] **Step 2: Handle image drop in `pages/admin/index.js`**

```js
const handleDropImagesToPage = useCallback((targetPageId, imageRefs, sourceBlockType) => {
  if (!imageRefs?.length) return
  const isMultiBlock = sourceBlockType === 'photos' || sourceBlockType === 'stacked' || sourceBlockType === 'masonry'
  const newBlock = isMultiBlock
    ? { type: sourceBlockType, ...buildMultiImageFields(imageRefs) }
    : { type: 'photo', ...buildSingleImageFields(imageRefs[0]) }
  updateConfig(prev => ({
    ...prev,
    pages: prev.pages.map(p =>
      p.id === targetPageId
        ? { ...p, blocks: [...(p.blocks || []), newBlock] }
        : p
    ),
  }))
}, [updateConfig])
```

Import at top of `pages/admin/index.js`:

```js
import { buildMultiImageFields, buildSingleImageFields } from '../../common/assetRefs'
```

- [ ] **Step 3: Pass handler to `PlatformSidebar`**

```jsx
const sidebar = (
  <PlatformSidebar
    ...existing props...
    onDropImagesToPage={handleDropImagesToPage}
  />
)
```

- [ ] **Step 4: Verify `PlatformSidebar` calls `onDropImagesToPage`**

From Task 5, `PlatformSidebar`'s `onDrop` on page entries already calls:

```js
if (drag.type === 'images') {
  if (page.id === drag.sourcePageId) return
  onDropImagesToPage?.(page.id, drag.imageRefs, drag.sourceBlockType)
}
```

This is already wired. Confirm `PlatformSidebar` has `onDropImagesToPage` in its props destructuring (added in Task 5).

- [ ] **Step 5: Test manually**

Drag a thumbnail from a block toward a page entry in the sidebar. The page entry should highlight. On drop, a new block should appear at the bottom of that page with the image.

- Drag from `photo` block → `photo` block created on target page
- Drag from `masonry` block → `masonry` block created on target page

- [ ] **Step 6: Commit**

```bash
git add components/admin/gallery-builder/BlockCard.js components/admin/gallery-builder/BlockBuilder.js pages/admin/index.js
git commit -m "feat: drag image from block to another page"
```

---

## Task 8: Multi-image drag to page and between blocks

**Files:**
- Modify: `components/admin/gallery-builder/BlockCard.js` (verify multi-select payload flows through)

The multi-select drag payload was wired in Task 3 (selected indices → `dragging` array) and Task 7 (DragContext uses `dragging`). This task verifies the end-to-end path and handles the `photo` block edge case.

- [ ] **Step 1: Add edge-case guard: dropping multiple images into a `photo` block**

In `BlockCard`'s single-photo drop handler, when `incomingRefs` has multiple items, take only the first:

```jsx
onDrop={(e) => {
  e.preventDefault()
  const raw = e.dataTransfer.getData('application/x-photo-drag')
  let url = null
  if (raw) {
    try { url = JSON.parse(raw).imageRefs?.[0]?.url } catch {}
  }
  if (!url) url = e.dataTransfer.getData('text/plain')
  if (url) onUpdate({ ...block, imageUrl: url })
}}
```

(Already done in Task 3 — `imageRefs[0].url` takes only the first. Verify this is in place.)

- [ ] **Step 2: Add edge-case guard for `handleDropImagesToPage` with `photo` source + multiple images**

In `pages/admin/index.js`'s `handleDropImagesToPage`:

```js
const newBlock = isMultiBlock
  ? { type: sourceBlockType, ...buildMultiImageFields(imageRefs) }
  : { type: 'photo', ...buildSingleImageFields(imageRefs[0]) }
```

When dragging multiple images from a `photo` block (which shouldn't normally happen since `photo` blocks hold one image), this already takes `imageRefs[0]`. No extra guard needed.

- [ ] **Step 3: Test multi-select drag between blocks**

Manual test: on a page with two `masonry` blocks:
1. Cmd+click 3 images in block A (they get blue rings)
2. Drag one of the selected images to block B
3. All 3 should appear in block B

- [ ] **Step 4: Test multi-select drag to page**

1. Cmd+click 2 images in a `masonry` block
2. Drag to another page entry in sidebar
3. A new `masonry` block with both images should appear at the bottom of the target page

- [ ] **Step 5: Commit**

```bash
git add components/admin/gallery-builder/BlockCard.js pages/admin/index.js
git commit -m "feat: multi-image drag to page and between blocks"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Drag block within page → reorder (existing, unchanged)
- ✅ Drag block to another page → Task 6
- ✅ Drag block to same page → no-op guard in `handleMoveBlockToPage`
- ✅ Drag single image between blocks → Task 3 + 4
- ✅ photo→photo: replace (Task 3, single-photo handler takes first ref)
- ✅ *→photos/stacked/masonry: append (Task 3, grid handler appends)
- ✅ Drag image to another page → Task 7
- ✅ Block type preserved on page drop → Task 7, `sourceBlockType` used
- ✅ Multi-select cmd+click, shift+click → Task 2
- ✅ Multi-image drag → Tasks 3, 7, 8
- ✅ photo block only takes first image → Task 3, Task 8 verify
- ✅ Empty block stays with empty state → no auto-delete code; empty block renders normally
- ✅ New block type matches source → `sourceBlockType` from drag payload

**Placeholder scan:** No TBDs, no "implement later". All code blocks are complete.

**Type consistency:**
- `imageRefs` used consistently throughout (never `images` or `refs` unless explicitly `blockImageRefs`)
- `sourceBlockType` used in DragContext payload, `handleDropImagesToPage`, and `buildMultiImageFields` call
- `sourceBlockKey` introduced in Task 3, used in Task 4
- `sourcePageId` introduced in Task 6 for blocks, extended to Task 7 for images

**One gap found:** `PageEditorSidebar` also needs `sourcePageId` passed to `BlockBuilder`, and `BlockBuilder` passes it to each `BlockCard`. This is covered in Task 7 Step 1. ✅
