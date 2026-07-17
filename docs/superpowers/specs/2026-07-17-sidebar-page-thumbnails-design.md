# Sidebar Page Thumbnails

**Date:** 2026-07-17
**Branch:** swamiphoto/sidebar-nav-status-fixes

## Goal

Replace the 14×14 SVG page-type icon in every sidebar page row with a 24×24 square thumbnail — same visual treatment as the page gallery block editor (square, gently rounded corners, real photo or sepia warm-gradient fallback). This also prepares for a future change that swaps abstract template types ("Gallery", "Collection") for concrete named page templates ("Photo Gallery", "About", "Contact").

## Changes

### Only file touched: `components/admin/platform/PlatformSidebar.js`

#### Imports
Add `pageDisplayThumbnail` and `pageThumbGradient` to the import from `../../../common/assetRefs`. Both already exist; they're just not imported in the sidebar today.

#### New helper: `PageThumb`
A small inline component that renders the 24×24 thumbnail. It is not exported.

```
function PageThumb({ page }) {
  const src = pageDisplayThumbnail(page)
  const isLink = page.type === 'link'
  const style = {
    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
    objectFit: 'cover',
  }
  if (src) {
    return <img src={src} alt="" style={style} />
  }
  // Color-square fallback (matches page gallery block editor)
  return (
    <div style={{ ...style, background: pageThumbGradient(page.id), position: 'relative' }}>
      {isLink && (
        <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 8, color: 'rgba(255,255,255,0.75)', lineHeight: 1 }}>↗</span>
      )}
    </div>
  )
}
```

For link pages specifically: no blocks exist so the gradient square is shown; a small `↗` badge in the bottom-right corner preserves the external-link signal that the `IconLink` icon provided.

#### Three icon-slot replacements

| Location | Current | New |
|---|---|---|
| Normal page row (`renderPageRow`) | `<PageTypeIcon page={page} />` inside a `width:14` div | `<PageThumb page={page} />`, container removed (thumb is already `width:24`) |
| Rename row | same icon | same `<PageThumb page={page} />` |
| Drag ghost | same icon in `width:14` span | `<PageThumb page={page} />` |

#### Hover / drag-handle swap — unchanged behavior

The existing Tailwind `group-hover:hidden` / `group-hover:flex` classes already handle swapping the left-slot content on hover. The same classes wrap `PageThumb` replacing the icon. No logic change needed.

Current markup:
```jsx
<span className="group-hover:hidden flex items-center"><PageTypeIcon page={page} /></span>
<span className="hidden group-hover:flex items-center cursor-grab"><IconDragHandle /></span>
```

New markup:
```jsx
<span className="group-hover:hidden flex items-center"><PageThumb page={page} /></span>
<span className="hidden group-hover:flex items-center cursor-grab"><IconDragHandle /></span>
```

#### Draft row (new page being named)

No page exists yet so there is no ID or thumbnail. Replace the icon in `renderDraftRow` with a 24×24 square that matches the thumbnail shape but has a dashed border and transparent fill:

```jsx
<div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, border: '1.5px dashed rgba(139,111,71,0.30)', background: 'transparent' }} />
```

#### `PageTypeIcon` function

Keep it in the file (the home-page case is used in `PageSettingsPopover` context via `siteConfig.homePageId`); just remove its usage from `renderPageRow`, the rename row, and the drag ghost. Delete `IconHome`, `IconText`, `IconGallery`, `IconDocument`, `IconGrid` only if confirmed unused elsewhere in this file after the swap — do a grep first.

## What does NOT change

- `PageTypeIcon` is NOT used to drive any data — removing it from the display doesn't affect page `kind` or `template` fields.
- The `addMenuOpen` / `navAddMenuOpen` template menus ("Gallery", "Collection", "Text", "Blank", "Link") are NOT changed in this PR. Template menu redesign is a separate follow-up.
- `pageDisplayThumbnail` and `pageThumbGradient` are unchanged — they already handle all fallback logic correctly.

## Visual spec summary

| Condition | What shows |
|---|---|
| Page has explicit thumbnail or cover | Photo, `object-fit: cover`, 24×24, `border-radius: 6px` |
| Page has photos in blocks but no explicit thumb | First block photo, same treatment |
| Page has no images | Sepia warm-gradient square, same dimensions |
| External link page | Gradient square + small `↗` badge |
| Draft row (new page being named) | Empty square, dashed warm-sepia border |
| Any row on hover | Drag handle replaces thumbnail (existing behavior) |
