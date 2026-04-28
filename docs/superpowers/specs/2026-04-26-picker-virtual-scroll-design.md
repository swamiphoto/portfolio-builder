# Photo Picker Virtual Scroll

**Date:** 2026-04-26  
**Status:** Approved

## Problem

`LibraryTab` in `PhotoPickerModal` renders all filtered images at once using CSS `columnCount: 3` masonry. For libraries with hundreds of images this means:
- All `<img>` tags are mounted and trigger fetches (even off-screen ones)
- DOM is heavy from the start, slowing the modal open

`PhotoGrid` (admin library) solves this with viewport-aware virtualization that only mounts visible items.

## Goal

Port the same virtualization pattern from `PhotoGrid` into `LibraryTab` so the picker only renders and fetches images in the visible 600px window.

## Design

### Layout algorithm

Reuse the same 3-column masonry layout algorithm from `PhotoGrid`:
- Column width = `(containerWidth - PADDING * 2 - GAP * 2) / 3`
- Each item's height = `columnWidth / aspectRatio` (fallback aspect ratio `3/2` when dimensions unknown)
- Assign each item to the shortest column, track column heights, output `{ x, y, width, height }` per item

### Scroll tracking

Inside `LibraryTab`, on the image grid's scroll container:
- `ResizeObserver` tracks container `width` and `height`
- rAF-throttled `onScroll` handler updates `scrollTop`
- `visibleItems` = layout positions filtered to `[scrollTop - OVERSCAN, scrollTop + containerSize.height + OVERSCAN]`

### Rendering

Replace CSS `columnCount` div with:
- Outer scroll container: `overflow-y: auto`, fixed height (fills `flex-1`)
- Inner `position: relative` div with height = `totalHeight` from layout
- Each visible `PickerTile` rendered as `position: absolute` with `top`, `left`, `width`, `height` from layout

`PickerTile` keeps its current `aspectRatio` style — the outer absolute-position container sets the actual dimensions, so the tile's internal `aspectRatio` can be removed (it's now redundant).

### Constants

```
COLUMNS = 3
GAP = 6        // matches current columnGap
PADDING = 10   // matches current padding
OVERSCAN = 300 // px above/below viewport to pre-render
```

## Scope

- **Changed:** `LibraryTab` inside `PhotoPickerModal.js`
- **No change:** `PickerTile`, `PickerFilterRail`, `PhotoPickerModal` shell, all parent components

## What stays the same

- All filter/search/collection logic
- Footer (selected count / Add button)
- Rail toggle behavior
- `onError` fallback added in the bug fix
