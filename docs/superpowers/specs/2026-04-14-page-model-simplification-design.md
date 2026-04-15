# Page Model Simplification Design

**Status:** APPROVED  
**Date:** 2026-04-14

## Problem

The current model has three page types (cover, gallery, single) plus a nested albums concept inside gallery pages. This adds complexity without adding value. All pages ultimately need the same thing: blocks. The "gallery" type was a container for albums, which were themselves just pages with blocks.

## Solution

One page type. All pages are `{ id, title, showInNav, thumbnailUrl, blocks }`. A new `page-gallery` block type handles the "grid of links to other pages" use case, replacing the albums concept entirely.

Block types also get a small cleanup: `stacked` and `masonry` are layout options within a single `photos` block type, not separate types. Legacy data with `type: "stacked"` or `type: "masonry"` is handled gracefully by the renderer (no migration needed).

---

## Data Model

### Page shape (simplified)

```json
{
  "id": "landscapes",
  "title": "Landscapes",
  "showInNav": true,
  "thumbnailUrl": "https://...",
  "blocks": [...]
}
```

No `type` field. Every page is the same shape.

### Default site config

```json
{
  "userId": "...",
  "siteName": "My Portfolio",
  "slug": "",
  "theme": "minimal-light",
  "customDomain": null,
  "publishedAt": null,
  "pages": [
    {
      "id": "home",
      "title": "Home",
      "showInNav": false,
      "thumbnailUrl": "",
      "blocks": []
    }
  ]
}
```

### Block types

| Type | Data shape | Notes |
|------|-----------|-------|
| `photo` | `{ type, imageUrl, caption, variant }` | Single photo, unchanged |
| `photos` | `{ type, imageUrls, layout: "stacked"\|"masonry" }` | Replaces separate `stacked`/`masonry` types |
| `text` | `{ type, content, variant }` | Unchanged |
| `video` | `{ type, url, caption, variant }` | Unchanged |
| `page-gallery` | `{ type, pageIds: string[] }` | New — renders thumbnail grid linking to other pages |

**Legacy compatibility:** renderer handles `type: "stacked"` and `type: "masonry"` as aliases for `photos` with the matching layout. No data migration needed.

---

## Component Changes

### `common/siteConfig.js`
- `createDefaultSiteConfig`: replace cover page `{ id: "cover", type: "cover", ... }` with `{ id: "home", title: "Home", showInNav: false, thumbnailUrl: "", blocks: [] }`

### `components/admin/gallery-builder/BlockTypeMenu.js`
- Add `{ type: "page-gallery", label: "Page Gallery", desc: "Thumbnail links to other pages" }` to `BLOCK_TYPES`
- Fix `defaultBlock("photos")` to produce `{ type: "photos", imageUrls: [], layout: "stacked" }` (currently produces `{ type: "stacked", ... }`)
- Add `defaultBlock("page-gallery")` returning `{ type: "page-gallery", pageIds: [] }`

### `components/admin/gallery-builder/BlockCard.js`
- Accept new `pages` prop (array of `{ id, title, thumbnailUrl }`) for page-gallery editing
- Update `isPhotoBlock` check: `block.type === "photos" || block.type === "stacked" || block.type === "masonry"` (legacy compat)
- Add `"photos": "Photos"` to `TYPE_LABELS`; add `"page-gallery": "Page Gallery"`
- Add `photos` body: same as current `isPhotoBlock` body (imageUrls grid + add photos)
- Add `page-gallery` body: checklist of all pages — checkbox per page, checked if `pageIds` includes that page's id

### `components/admin/gallery-builder/BlockBuilder.js`
- Accept `pages` prop; pass it to each `<BlockCard>`

### `components/image-displays/gallery/Gallery.js`
- Accept `pages` prop (array of `{ id, title, thumbnailUrl }`)
- Add `photos` case: if `block.layout === "masonry"` render `MasonryGallery`, else render `StackedGallery` (on small screen, always masonry — same as current behavior)
- Keep `stacked`/`masonry` cases as legacy fallback (same behavior as now)
- Add `page-gallery` case: render a 2-column grid of thumbnail cards. Each card: thumbnail image (or gray placeholder) + page title. Links use page id (href to be defined when routing is built — for now render as non-clickable cards or `href="#"`).

### `components/admin/gallery-builder/GalleryPreview.js`
- Accept `pages` prop; pass to `<Gallery>`

### `components/admin/platform/BlockPageEditor.js`
- Accept `siteConfig` prop (already receives it from PageEditor via admin/index.js)
- Fix `pageToGallery`: map `thumbnailUrl: page.thumbnailUrl || ''` (currently hardcodes `''`)
- Fix `galleryToPage`: preserve `thumbnailUrl: gallery.thumbnailUrl || page.thumbnailUrl`
- Pass `pages={siteConfig.pages}` to `<BlockBuilder>` and `<GalleryPreview>`

### `components/admin/platform/PageEditor.js`
- Remove `GalleryPageEditor` import
- Remove `page.type === 'gallery'` branch
- Always render `<BlockPageEditor>`

### `components/admin/platform/GalleryPageEditor.js`
- **Delete this file**

### `components/admin/platform/PlatformSidebar.js`
- Remove `PAGE_TYPE_ICONS` and `PAGE_TYPE_LABELS` constants
- Remove type icon span from page rows
- Remove type label span from page rows
- Remove type picker from "Add Page" flow — clicking "Add Page" immediately adds a new page (no gallery/single choice)
- New page shape: `{ id, type: undefined (omit), title: "New Page", showInNav: true, thumbnailUrl: "", blocks: [] }`

### `pages/admin/index.js`
- Pass `siteConfig` to `<PageEditor>` (already passed — verify it flows through)

---

## Page Gallery Block — Editor UI

In BlockCard, `page-gallery` body:

```
[ ] Home
[x] Landscapes
[x] Portraits
[ ] About
```

Simple checkbox list. Checking a page adds its id to `pageIds`; unchecking removes it. Pages shown in sidebar order. The home page (or any page with `showInNav: false`) is shown in the list but unchecked by default. No reordering within the block — order follows sidebar page order.

## Page Gallery Block — Rendered UI

In Gallery.js, `page-gallery` renders a 2-column responsive grid:

```
[ Landscapes thumbnail ]  [ Portraits thumbnail ]
     Landscapes                  Portraits
```

Each card: full-width thumbnail image (aspect-ratio 4:3, object-cover), page title below. If `thumbnailUrl` is empty, show a gray placeholder. Link destination: `/[pageId]` (will be wired when routing is built; use `href="#"` for now).

---

## Out of Scope

- BlockBuilder "Gallery Info" cleanup (slug, description, unlisted, slideshow fields still visible for platform pages — tolerable for now, cleanup in a later pass)
- Actual page routing / published site URLs (separate spec)
- Migrating existing stored data from `type: "stacked"` to `type: "photos"` (legacy handling in renderer is sufficient)
