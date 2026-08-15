# Amsterdam Theme — Design

**Date:** 2026-08-14
**Status:** Approved for implementation planning

## What

A fifth theme, **Amsterdam** (`id: 'amsterdam'`): a bold Dutch-poster editorial
theme — vermilion/cream/black palette, fat high-contrast display serif, giant
ultra-condensed gallery titles, a thin left rail, and horizontally scrolling
panel columns. Inspired by the general design language of editorial poster
sites (notably canals-amsterdam.com); **no compositions, assets, fonts, or code
are copied** — layouts render entirely from user-generated content through the
existing theme-independent block model. No WebGL; plain CSS/DOM horizontal
scroll, reusing Florence's proven interaction machinery.

## Decisions (locked with user)

1. **Cover = poster hero**: site name set enormous in the display serif (ink
   color), overlapping the top of the full-bleed cover photo; tagline small in
   the editorial serif below.
2. **Text blocks = ink panels by default**, with a per-block **Panel / Quiet**
   variant control (Quiet = modest museum-label text on cream).
3. **Gallery pages open with a condensed poster title panel**: gallery name set
   giant in Anton, white on ink, cropped off the panel edge.
4. **Fonts (all open-license Google faces)**: Abril Fatface (display), Playfair
   Display (editorial serif), Anton (condensed), Inter (sans/captions).
   Adobe Fonts was considered and rejected: its license doesn't cover a
   multi-tenant platform serving customer sites, it can't be self-hosted, and
   the reference site's commercial fonts aren't in its catalog anyway.
5. **Ink brush control** (not fixed, not free-pick): 3 curated inks —
   vermilion `#e02b20` (default), ultramarine `#1a1690`, black `#141210` —
   stored at `siteConfig.design.amsterdamInk`, surfaced as swatches in the
   theme toolbar pill (ThemeToolbarControl), Amsterdam-only section.
6. **Renderer strategy = shared interaction hook** (approach 2): extract
   Florence's horizontal-scroll physics into a shared `useWallScroll` hook,
   refactor FlorenceWall onto it (zero behavior change), then build
   AmsterdamWall's layout independently on the same hook. No generic
   configurable wall engine (YAGNI); no fork-and-duplicate.
7. **No Amsterdam XXX crosses on the rail** — that is the reference site's
   recognizable rail motif; we don't lift identifiable elements.

## Theme definition — `common/themes/amsterdam.js`

- `id: 'amsterdam'`, `name: 'Amsterdam'`, `navStyle: 'left-rail'`.
- Registered in `common/themes/index.js` (THEMES, THEME_LIST, named export).
- **Tokens**: `--theme-bg: #f6efe4` (warm cream), `--theme-text: #141210`,
  `--theme-text-muted` caption gray, `--theme-accent` = resolved ink,
  `--theme-rail-width: 96px`.
- **Fonts map**: `display` → Abril Fatface, `serif` → Playfair Display,
  `condensed` → Anton, `sans` → Inter, plus `mono`/`fraunces` fallbacks so
  blocks that stored those slot ids under another theme still resolve (same
  defensive mapping Florence uses).
- **Ink resolution**: `amsterdamInk` id → `{ ink, onInk }` hex pair; `onInk`
  is white for vermilion/ultramarine, cream for black.

### Block overrides

- `photo`: hide `full-bleed`/`centered`/`side-by-side`; add
  `full-height` ("Fill", default) and `centered`. Size (L/M/S) applies to
  Centered only.
- `photos`: hide `stacked`/`masonry`/`grid`/`square`; add `row` ("Row",
  default) and `mosaic` ("Mosaic"); `sizeVariants: ['row', 'mosaic']`.
  (Same variant *ids* Florence added — shared vocabulary; rendering is
  Amsterdam's own.)
- `text`: variants `panel` ("Panel", default) and `quiet` ("Quiet") — rides
  the existing variant system, zero new sidebar UI. Font menu (slot id →
  label): `display` → "Display" (Abril, default), `serif` → "Editorial"
  (Playfair), `condensed` → "Condensed" (Anton); ids resolve via
  `tokens.fonts`. Left-aligned.
- `testimonial`: Playfair pull-quote styling on cream.
- `contact`: quiet left-aligned Inter column.
- Theme-switch safety: `panel`/`quiet` fall back to base defaults under other
  themes via the existing legacy-resolver behavior. No migration needed.

## Renderer architecture

### Step 0 — shared hook (Florence refactor, lands first)

`components/image-displays/themes/shared/useWallScroll.js` — mechanical
extraction of FlorenceWall's interaction physics:

- vertical-wheel → horizontal conversion with deltaMode normalization and the
  3.2× pan factor; native horizontal gestures passed through untouched;
  exception for columns that still have vertical room to scroll,
- drag-to-pan with the 3px moved-guard (suppresses click-through),
- arrow paging: find the column nearest viewport center, smooth-center its
  neighbor,
- mobile flag → all handlers no-op.

API: takes `{ wallRef, columnSelector, mobile }`; returns pointer handlers +
`page(dir)`. FlorenceWall refactored to consume it with **zero behavior
change**, verified against the `florence-preview` page before any Amsterdam
code is written.

### AmsterdamWall — `components/image-displays/themes/amsterdam/`

Files: `AmsterdamWall.js`, `AmsterdamColumn.js`, `AmsterdamCaption.js`.
Same props contract as FlorenceWall (`siteConfig, name, description, blocks,
basePath, makeClickHandler, onBlockHover, onBlockClick, mobile, actions,
currentPageId, onPageClick, currentPath, photoMeta, pages`).

Integration points (identical to Florence's):

- `components/image-displays/gallery/Gallery.js` short-circuits to
  AmsterdamWall for `themeId === 'amsterdam'` (same place as the Florence
  short-circuit, ~line 351).
- `pages/sites/[username]/index.js` and `[slug].js` suppress SiteNav for
  amsterdam as they do for florence.

Wall anatomy, left → right:

1. **Rail** (thin, fixed): hamburger top, vertical wordmark (honoring
   logoType/image like Florence), small ink-colored rule at bottom.
2. **Opener column**: home page → poster hero (full-bleed cover photo, site
   name enormous in Abril in ink overlapping the photo's top edge, tagline in
   Playfair below). Gallery page → Anton condensed title panel, white on ink,
   name cropped off the panel edge.
3. **Block columns**, hairline-separated on cream; `panel` text blocks are
   full-height ink columns.
4. **Menu column** slides in at the front on hamburger, pushing the wall right
   (Florence pattern): ink background, Anton page names, Inter meta, socials.

**Captions**: `AmsterdamCaption` — small Inter caps museum label from existing
photo metadata, honoring the `photoMeta` setting (like FlorenceCaption).

**Mobile**: `data-mobile` CSS collapse to a vertical stack; hero and ink
panels become full-width bands. Same mechanism as Florence.

## Block treatments (rendering)

- `photo` Fill: image fills column height, column width follows aspect.
  Centered: L/M/S-sized, floated on cream with caption.
- `photos` Row: wide column, uniform-height photos side by side, captions
  beneath. Mosaic: 1/2/3-photo vertical groups at varied heights, side by
  side. Both scale with L/M/S.
- `text` Panel: full-height ink column, chosen font (Display default), `onInk`
  text color, L/M/S → display scale. Quiet: narrow cream column, museum-label
  styling.
- `video`: fills its column like a photo.

## Fonts loading

Abril Fatface, Playfair Display, Anton added via the same font-loading path
Florence used for Fraunces/IBM Plex Mono. Inter is already global.

## Editor behavior

Sidebar-only editing invariant holds: AmsterdamWall is read-only, passes
`onBlockHover`/`onBlockClick` through for sidebar sync. New stored data is
limited to `design.amsterdamInk` and the `panel`/`quiet` text variant ids.
Block controls surface automatically through the overrides; ink swatches live
in the theme pill. Draft/publish/autosave untouched.

## Testing & verification

1. Extend `__tests__/themes/registry.test.js`: amsterdam registered, block
   specs resolve, defaults (`full-height`, `row`, `panel`) correct, ink
   resolution.
2. New `amsterdam-preview` dev page mirroring `florence-preview`, seeded with
   blocks covering every variant (panel/quiet text, fill/centered photo,
   row/mosaic sets, video, testimonial, contact) for manual + screenshot QA.
3. Florence regression gate: after the useWallScroll refactor,
   `florence-preview` must render and behave identically (manual check +
   screenshots) before Amsterdam work starts.
4. Final QA: dev server + headless-browser screenshots of amsterdam-preview
   and a real site in Amsterdam, desktop and mobile viewports.

## Out of scope

- WebGL / scroll-linked image distortion of any kind.
- Copying compositions, the reference site's fonts, logotype, or rail motifs.
- A generic multi-theme wall engine.
- Free-pick accent colors (curated inks only).
