# Sidebar Page Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 14×14 SVG page-type icon in every sidebar page row with a 24×24 square thumbnail — photo if the page has one, sepia warm-gradient color square otherwise — matching the visual treatment already used in the page gallery block editor.

**Architecture:** Single-file change to `PlatformSidebar.js`. Two helpers already in `assetRefs.js` (`pageDisplayThumbnail`, `pageThumbGradient`) do all the fallback logic; this plan only adds their import and wires them into a new `PageThumb` display component. No data model changes.

**Tech Stack:** React (functional components, inline styles), Tailwind CSS (group-hover classes), Next.js pages router.

## Global Constraints

- Only `components/admin/platform/PlatformSidebar.js` is modified.
- Dev server runs on port 3000 via `next dev`. Do NOT run `next build` while it is running.
- All inline style values use the existing design tokens (`C.*`, `MONO`, `SERIF`) where applicable.
- No new dependencies.

---

### Task 1: Add assetRefs imports and `PageThumb` helper

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js` (imports block + after `IconDragHandle`)

**Interfaces:**
- Produces: `PageThumb({ page })` — renders a 24×24 square; photo if `pageDisplayThumbnail(page)` returns a URL, else a sepia gradient div from `pageThumbGradient(page.id)`. Link pages get a small `↗` badge on the gradient square.

- [ ] **Step 1: Add the import**

In `PlatformSidebar.js`, after the existing `import { normalizeCustomDomain, subdomainHost } from '../../../common/domainUtils'` line (currently line 9), add:

```js
import { pageDisplayThumbnail, pageThumbGradient } from '../../../common/assetRefs'
```

- [ ] **Step 2: Add the `PageThumb` component**

Add this function immediately before the `PageMenuItem` function (currently around line 149), after the `IconDragHandle` function:

```js
function PageThumb({ page }) {
  const src = pageDisplayThumbnail(page)
  const base = { width: 24, height: 24, borderRadius: 6, flexShrink: 0 }
  if (src) {
    return <img src={src} alt="" style={{ ...base, objectFit: 'cover', display: 'block' }} />
  }
  return (
    <div style={{ ...base, background: pageThumbGradient(page.id), position: 'relative' }}>
      {page.type === 'link' && (
        <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 8, color: 'rgba(255,255,255,0.75)', lineHeight: 1 }}>↗</span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify no import errors**

The dev server should already be running on port 3000. Open the browser console at `http://localhost:3000/admin`. Confirm no "cannot find module" or "is not exported" errors for `pageDisplayThumbnail` / `pageThumbGradient`.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/PlatformSidebar.js
git commit -m "feat(sidebar): add PageThumb helper + assetRefs imports"
```

---

### Task 2: Replace icon in the normal page row

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js` — `renderPageRow` function, icon/drag-handle slot (currently around lines 651–662)

**Interfaces:**
- Consumes: `PageThumb({ page })` from Task 1
- Consumes: `IconDragHandle` (already defined in the file, unchanged)

- [ ] **Step 1: Locate the icon slot in `renderPageRow`**

Find this block inside `renderPageRow` (the non-renaming branch, inside the `group relative` div):

```jsx
{/* Icon / drag handle */}
<div
  className="flex-shrink-0 flex items-center justify-center"
  style={{ width: 14, color: isSelected ? C.accent : C.textMuted }}
>
  <span className="group-hover:hidden flex items-center">
    <PageTypeIcon page={page} />
  </span>
  <span className="hidden group-hover:flex items-center cursor-grab active:cursor-grabbing">
    <IconDragHandle />
  </span>
</div>
```

- [ ] **Step 2: Replace it with the thumbnail slot**

Replace the entire block above with:

```jsx
{/* Thumbnail / drag handle */}
<div className="flex-shrink-0 flex items-center justify-center">
  <span className="group-hover:hidden flex items-center">
    <PageThumb page={page} />
  </span>
  <span className="hidden group-hover:flex items-center justify-center cursor-grab active:cursor-grabbing" style={{ width: 24, height: 24 }}>
    <IconDragHandle />
  </span>
</div>
```

Key changes:
- Removed `style={{ width: 14, color: ... }}` from container (thumbnail is self-sized at 24×24)
- `<PageTypeIcon page={page} />` → `<PageThumb page={page} />`
- Drag handle span gains `justify-center` and `style={{ width: 24, height: 24 }}` so it occupies the same footprint as the thumbnail

- [ ] **Step 3: Verify visually**

In the browser at `http://localhost:3000/admin`:
- Each page row should show a small square thumbnail (photo or gradient)
- Pages with at least one photo block should show that photo
- Pages with no photos should show a warm brownish-tan gradient square
- On hover, the thumbnail should disappear and a 6-dot drag handle should appear in its place
- Selected page row should still highlight correctly
- Rows should be slightly taller than before (~32px vs ~22px) — this is expected

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/PlatformSidebar.js
git commit -m "feat(sidebar): swap page-type icon → 24×24 thumbnail in page rows"
```

---

### Task 3: Replace icon in rename row, drag ghost, and draft row; remove dead code

**Files:**
- Modify: `components/admin/platform/PlatformSidebar.js` — rename branch in `renderPageRow`, drag ghost, `renderDraftRow`, dead icon functions

**Interfaces:**
- Consumes: `PageThumb({ page })` from Task 1

- [ ] **Step 1: Replace icon in the rename row**

Still inside `renderPageRow`, find the rename branch (the `renamingId === page.id` block). It contains:

```jsx
<div className="flex-shrink-0 flex items-center justify-center" style={{ width: 14, color: C.accent }}>
  <PageTypeIcon page={page} />
</div>
```

Replace with:

```jsx
<div className="flex-shrink-0 flex items-center">
  <PageThumb page={page} />
</div>
```

- [ ] **Step 2: Replace icon in the drag ghost**

Find the drag ghost block near the bottom of the component (inside the `pageDrag && ghostPos && (() => {` IIFE, around line 998). It contains:

```jsx
{draggedPage && (
  <span style={{ display: 'flex', alignItems: 'center', color: C.accent }}>
    <PageTypeIcon page={draggedPage} />
  </span>
)}
```

Replace with:

```jsx
{draggedPage && (
  <span style={{ display: 'flex', alignItems: 'center' }}>
    <PageThumb page={draggedPage} />
  </span>
)}
```

- [ ] **Step 3: Replace icon switch in the draft row**

In `renderDraftRow`, find:

```jsx
<div className="flex-shrink-0 flex items-center justify-center" style={{ width: 14, color: C.accent }}>
  {draftRow?.template === 'text' ? <IconText />
    : draftRow?.template === 'collection' ? <IconGrid />
    : draftRow?.template === 'blank' ? <IconDocument />
    : <IconGallery />}
</div>
```

Replace with a dashed placeholder square (no page ID or content exists yet):

```jsx
<div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, border: '1.5px dashed rgba(139,111,71,0.30)', background: 'transparent' }} />
```

- [ ] **Step 4: Remove dead functions**

`PageTypeIcon` is now unreferenced. `IconHome` is only called inside `PageTypeIcon`. `IconImages` was already dead code. Remove all three function definitions:

- Delete the `function IconHome(p) { ... }` block (currently around line 79–81)
- Delete the `function IconImages(props) { ... }` block (currently around lines 112–121)
- Delete the `function PageTypeIcon({ page }) { ... }` block (currently around lines 497–508)

**Before deleting**, confirm with grep that none of these appear outside their own definition:

```bash
grep -n "IconHome\|IconImages\|PageTypeIcon" components/admin/platform/PlatformSidebar.js
```

Expected: each name appears **only once** (its definition line). If any appear more than once, do not delete — investigate first.

Note: `IconGallery`, `IconGrid`, `IconText`, `IconDocument`, `IconLink` are still used in the "Add Page" template menus — do NOT remove them.

- [ ] **Step 5: Verify visually**

In the browser at `http://localhost:3000/admin`:
- **Rename:** double-click a page title to rename it; thumbnail should still appear to the left of the input
- **Drag ghost:** drag a page row; the floating ghost pill should show the thumbnail next to the page name
- **Add Page → new draft row:** click "Add Page", verify the draft row shows a small dashed empty square (not an icon)
- Console should be free of errors

- [ ] **Step 6: Commit**

```bash
git add components/admin/platform/PlatformSidebar.js
git commit -m "feat(sidebar): thumbnail in rename row + drag ghost + draft row; remove dead icon code"
```
