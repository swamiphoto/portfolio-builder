# Page-Gallery Thumbnail Focal Point — Design

**Date:** 2026-06-29
**Status:** Approved, ready for implementation plan

## Problem

The `page-gallery` block renders each linked page as a card. The card's thumbnail
(`pageDisplayThumbnail(p)`) is forced into a fixed-height rectangle
(`h-[400px] md:h-[500px]`) with `object-cover` (`components/image-displays/gallery/Gallery.js:255`).
When a page's thumbnail is portrait — or simply has its subject off-center — the
crop slices the subject off (e.g. a face cut out of the frame). There is no way to
control which part of the thumbnail survives the crop.

This is the only block with the problem. The single Photo block renders at the
image's natural aspect ratio and never hard-crops, so it is out of scope. The
photos/stacked/masonry galleries are also out of scope for now.

## Solution overview

Give each page's thumbnail an optional **focal point** — a single normalized point
`{ x, y }` (each `0–1`) marking "keep this part of the image in frame." It renders
as CSS `object-position`. The crop changes per layout/theme; the point does not.
Default is center, so existing galleries render unchanged.

The user sets the focal point from inside the page-gallery block editor in the
sidebar (where the cropping problem is visible), dragging a marker over the full
thumbnail while the live preview on the right re-crops in real time.

### Design principles honored

- **Editing is initiated from the sidebar**, never the preview. The preview stays
  read-only and theme-dependent; the sidebar is the stable, theme-independent edit
  surface. This mirrors the existing upload model (sidebar trigger → modal/popover).
- **The stored value is theme-independent.** A focal point is a point on the image,
  not a crop. It travels correctly across any container ratio a theme produces.
- **Single source of truth.** The focal point is a property of the page's thumbnail,
  so it lives on the page, not on the block. Every surface that shows the page as a
  card gets consistent framing for free.

## Data model

Store the focal point on the page's thumbnail config:

```js
page.thumbnail = {
  imageUrl: string,
  useCover: boolean,
  focalPoint: { x: number, y: number } | null,  // NEW; null = center
}
```

- `null` (or absent) means center — equivalent to `object-position: 50% 50%`.
- `normalizePageEntity` (`common/assetRefs.js:194`) preserves the field:
  `focalPoint: thumbnail.focalPoint || null`. No migration needed for existing pages;
  absence defaults to center.
- **Reset rule:** when the thumbnail's effective image source changes (the user picks
  a new explicit thumbnail, or toggles `useCover`), reset `focalPoint` to `null`. A
  saved point must never apply to a different image. This is handled where the
  thumbnail is changed (`components/admin/platform/PageEditorSidebar.js` thumbnail
  update path, and `useCover` toggle in `PageSettingsPopover.js`).

The focal point applies to whatever image `pageDisplayThumbnail(page)` resolves to —
explicit thumbnail, cover fallback, or first-photo fallback. It frames "the card,"
not a specific underlying field.

## Editing surface

### Entry point

The page-gallery block editor already renders a per-linked-page list in the sidebar:
draggable rows, each with a 36×36 thumbnail, title, and description
(`components/admin/gallery-builder/BlockCard.js`, page-gallery branch ~lines 975–1023).

Add a **reposition icon to each row**, revealed on hover, alongside the existing row
affordances. Clicking it opens the focal-point editor for that linked page's thumbnail.

### Focal-point editor

A popover/panel (not a full-screen modal), anchored beside the sidebar and sized so
the right-side preview remains visible. Contents:

- The **full, uncropped thumbnail image** with a draggable **focal-point marker**
  (a draggable dot/crosshair). Dragging moves the point within `[0,1] × [0,1]`.
- A **reset-to-center** action.
- **Click-away commits** (closes the popover; the value is already in state).

There is no separate in-modal crop preview. The live feedback is the actual
page-gallery card on the right-hand preview, which re-crops as the marker moves.

### Live update flow

1. Dragging the marker calls `updatePage(linkedPageId, updatedLinkedPage)` with the
   new `thumbnail.focalPoint`.
2. `updatePage` (`pages/admin/index.js:139`) updates the single in-memory `siteConfig`
   immediately, so the preview re-renders the card with the new `object-position`.
3. The existing whole-config debounced autosave (1.5s) persists it. No new save path.

Focal-point updates should reach the preview without perceptible lag while dragging;
if the preview's render is debounced, the focal-point change should update preview
state immediately (the autosave debounce is independent and unchanged).

### Plumbing

The block editor needs to write to a *different* page (the linked page) than the one
being edited. This is cheap in the current architecture:

- The `pages` array is already available in `BlockCard` (passed as a prop).
- `updatePage(pageId, updatedPage)` already exists at the top-level platform editor
  (`pages/admin/index.js`).
- Thread `updatePage` from `pages/admin/index.js` → `PageEditorSidebar` →
  `BlockBuilder` → `BlockCard` (a few prop additions). The unified autosave handles
  persistence — no per-page endpoint required.

## Rendering

Single render change. In the `page-gallery` case of `Gallery.js` (line ~255), add an
`object-position` style to the card `<img>`, derived from the linked page's
`thumbnail.focalPoint`:

```js
const fp = p.thumbnail?.focalPoint
const objectPosition = fp ? `${fp.x * 100}% ${fp.y * 100}%` : '50% 50%'
// ...
<img ... className="... object-cover ..." style={{ objectPosition }} />
```

No layout logic changes — `object-cover` already crops; we only steer which part
survives.

## Scope / YAGNI

- **In scope:** focal point for the `page-gallery` block's card thumbnails only.
- **Out of scope:** zoom, rotation, aspect-ratio cropping, per-placement overrides,
  per-theme overrides, and focal points for the photo/photos/stacked/masonry blocks or
  the single Photo block.
- **Natural future extension (not built now):** because the focal point lives on
  `page.thumbnail`, any other surface that renders a page as a card (nav cards, other
  collection layouts) can read the same field later with no data changes.

## Files touched (anticipated)

| Purpose | File |
|---|---|
| Data normalization + reset rule | `common/assetRefs.js` |
| Render `object-position` on card | `components/image-displays/gallery/Gallery.js` |
| Per-page reposition icon + focal-point editor | `components/admin/gallery-builder/BlockCard.js` |
| New focal-point editor popover component | `components/admin/gallery-builder/` (new file) |
| Reset focal point on thumbnail change | `components/admin/platform/PageEditorSidebar.js`, `components/admin/platform/PageSettingsPopover.js` |
| Thread `updatePage` to block editor | `pages/admin/index.js`, `PageEditorSidebar`, `BlockBuilder`, `BlockCard` |

## Acceptance criteria

1. Hovering a page row in the page-gallery block editor reveals a reposition icon.
2. Clicking it opens a focal-point editor showing the full thumbnail with a draggable
   marker, positioned so the right-side preview stays visible.
3. Dragging the marker re-crops the corresponding card in the live preview in real time.
4. The focal point persists (via whole-config autosave) and survives reload.
5. The same page shown in another page-gallery uses the same focal point.
6. Changing a page's thumbnail image (explicit pick or `useCover` toggle) resets its
   focal point to center.
7. Pages without a focal point render exactly as before (centered crop).
8. The published site renders the focal point identically to the admin preview.
