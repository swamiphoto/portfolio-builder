# Multi-Theme System — Design Spec

**Date:** 2026-07-10
**Status:** Approved design, ready for implementation planning
**Author:** Swami + Claude

## Goal

Turn the single de-facto theme ("minimal light") into a real, extensible **multi-theme
system**. Ship two structurally-different themes at launch so users can see themes switch,
and preserve every user's work when they switch back and forth.

Two themes at launch:

- **Kyoto** — the current look. Calm, warm, single-column, top-to-bottom editorial scroll.
  Renamed from "minimal light".
- **Manhattan** — new. Fixed left nav rail + a gallery-wall grid of images on the right.
  Structural departure from Kyoto. Modeled on the andrewlipovsky.com / 22slides "left nav +
  grid" pattern.

Theme names follow one family: **places a photographer dreams of shooting** (Kyoto,
Manhattan, and later Sierra, Fuji, Havana, Patagonia...). Names set an emotional register;
the theme itself defines the actual look.

## Non-goals (YAGNI for this pass)

- No third-party / marketplace theme *loading* yet. We build the theme **contract** so the
  marketplace is a later additive step, but themes ship in-repo for now.
- No authoring DSL, no runtime sandboxing, no theme package format on disk.
- No per-page theme override. Theme is site-level (one theme per site), same as today.
- No new block types. All existing block types are available in all themes.

## Core principles

1. **A theme is a self-contained module conforming to one interface.** Everything a theme
   needs to exist lives behind that interface. This interface is the future marketplace
   contract — third-party themes become a loader change, not a rewrite.
2. **Content is theme-independent; presentation forks per theme.** Image URLs, captions,
   text, video URLs are shared across themes. Only *how a block is displayed* (its variant)
   is remembered per theme.
3. **Switching themes is lossless.** Each theme remembers its own variant choices per block.
   Switching away and back restores exactly what you had.
4. **Variant vocabularies are theme-local.** Kyoto's `photo` variants and Manhattan's
   `photo` variants are independent sets. They don't have to align — that's *why* switching
   is lossless.

---

## Architecture

### 1. What a theme is

A theme is an object (in-repo module, e.g. `common/themes/kyoto.js`, `common/themes/manhattan.js`)
exposing three things:

```js
// common/themes/manhattan.js  (shape, not final code)
export default {
  id: 'manhattan',
  name: 'Manhattan',

  // (a) TOKENS — injected as CSS custom properties on a theme wrapper.
  // This is what styles/globals.css hardcodes today, made per-theme.
  tokens: {
    colors: { bg: '#fafafa', text: '#141414', textMuted: '#6b6b6b', accent: '#141414', ... },
    fonts:  { body: '...', display: '...' },        // Manhattan: tight uppercase sans for rail/nav
    space:  { gutter: '...', railWidth: '260px', ... },
  },

  // (b) SHELL — the page chrome: nav placement + content container.
  navStyle: 'left-rail',        // slots into existing resolveNavStyle() seam
  Shell: ManhattanShell,        // React component: rail + right content region

  // (c) BLOCK SPEC — per block type: variants, default, optional renderer override.
  blocks: {
    photo: {
      defaultVariant: 'full-width',
      variants: [
        { id: 'full-width', label: 'Full width' },
        { id: 'framed',     label: 'Framed' },      // white-matted, Manhattan signature
      ],
      Renderer: ManhattanPhotoBlock,   // override (hybrid): only where markup differs
    },
    photos: {
      defaultVariant: 'grid',
      variants: [
        { id: 'grid',    label: 'Grid' },
        { id: 'masonry', label: 'Masonry' },
      ],
      Renderer: ManhattanPhotosBlock,  // the tiled gallery wall — hero of this theme
    },
    text:        { defaultVariant: 'heading', variants: [...], defaultAlign: 'left' }, // shared renderer
    video:       { defaultVariant: 'full-width', variants: [...] },                    // shared renderer
    testimonial: { defaultVariant: 'photo-above', variants: [...] },                   // shared renderer
    'page-gallery': { defaultVariant: 'grid', variants: [...] },                       // shared renderer
    contact:     { defaultVariant: 'standard', variants: [...] },                      // shared renderer
  },
}
```

**Hybrid rendering:** by default a block type is drawn by a **shared** renderer that reads
the theme's tokens + resolved variant. A theme may supply a `Renderer` override for a block
type when it needs genuinely different markup. For Manhattan, only `photo` (framed variant)
and `photos` (grid tiling) need overrides. Everything else is shared renderers restyled by
tokens.

### 2. Theme registry

```js
// common/themes/index.js
import kyoto from './kyoto'
import manhattan from './manhattan'

export const THEMES = { kyoto, manhattan }
export function getTheme(id) { return THEMES[id] || THEMES.kyoto }
```

When the marketplace arrives, `THEMES` becomes a merge of in-repo + loaded/validated
external themes. Nothing else changes.

### 3. Rendering pipeline changes

The published-page path (`pages/sites/[username]/[slug].js` → `Gallery.js`) and the admin
preview both change the same way:

1. Resolve the active theme once: `const theme = getTheme(siteConfig.design.theme)`.
2. Wrap output in a **ThemeProvider** that:
   - injects `theme.tokens` as CSS custom properties on a wrapper element (`data-theme={id}`),
   - exposes `theme` via context so renderers can read the block spec.
3. Render `theme.Shell` (the chrome: Kyoto's top/cover nav+column, Manhattan's rail+region).
4. Inside the shell, the block loop resolves each block:
   - `variant = block.themeState?.[theme.id]?.variant ?? theme.blocks[block.type].defaultVariant`
   - pick the renderer: `theme.blocks[block.type].Renderer ?? SharedRenderers[block.type]`
   - render with `{ block, variant, theme }`.

`Gallery.js`'s current `switch(block.type)` is refactored into this spec-driven dispatch.
Shared renderers (text, video, testimonial, contact, page-gallery) move into
`components/image-displays/blocks/shared/` and read tokens + variant instead of hardcoded
Tailwind. Theme-specific renderers live under the theme, e.g.
`components/image-displays/themes/manhattan/`.

### 4. Token injection

Today `styles/globals.css` hardcodes `:root` variables (warm sepia palette). These become
**Kyoto's** tokens. ThemeProvider writes the active theme's tokens onto the wrapper as CSS
custom properties, so shared renderers reference `var(--color-text)` etc. and restyle for
free. `globals.css` keeps only truly global resets.

---

## Data model: per-theme variant state

### Block shape

Presentation state becomes a **theme-keyed map** on each block. Content stays flat.

```js
{
  type: 'photo',
  imageUrl: '...',        // content — shared across themes
  caption: '...',         // content — shared
  themeState: {
    kyoto:     { variant: 'full-bleed' },   // remembered for Kyoto
    manhattan: { variant: 'framed' },       // remembered for Manhattan
  },
}
```

`themeState[themeId]` is an object (not a bare value) so a theme can store more than one
presentation param later (e.g. `align`) without another migration.

### Resolution rule

```
variant = block.themeState?.[activeTheme]?.variant
          ?? theme.blocks[block.type].defaultVariant
```

- First time on a theme (no key) → theme's **defaultVariant** for that block.
- Change a variant → written under that theme's key only.
- Switch away and back → saved state restored, untouched.
- A variant that doesn't exist in the target theme is simply never referenced → target
  theme's default is used, and the origin theme's value is never touched.

### Writing state

When the user changes a block's variant in the editor, we write
`block.themeState[activeTheme] = { ...prev, variant: newVariant }`. We never mutate other
theme keys.

### Migration

Existing blocks carry `variant` (and `photos` carry `layout`). One-time normalization
(in the `siteConfig` normalizer, `common/siteConfig.js`) maps the current value into the
**Kyoto** key, so every live site keeps its exact current look as its saved Kyoto state:

- `photo`: `themeState.kyoto.variant = variant === 2 ? 'centered' : 'full-bleed'`
- `photos`: `themeState.kyoto.variant = layout` (`'stacked'` | `'masonry'`)
- `text`: `themeState.kyoto.variant = mapTextVariant(variant)` (1→heading, 2→sub, 3→body, 4→quote)
- `video`: `themeState.kyoto.variant = mapVideoVariant(variant)` (1→full-bleed, 2→centered, 3→side-by-side)
- `testimonial`: `themeState.kyoto.variant = variant === 2 ? 'quote-above' : 'photo-above'`

Legacy `variant`/`layout` fields are left in place (harmless) or stripped on next write;
resolution reads `themeState` first. Also rename the site's `design.theme`:
`minimal-light`/`minimal-dark` → `kyoto`, `editorial` → keep or fold into Kyoto (decide in
plan; `editorial` was barely differentiated).

---

## Manhattan design detail

### Shell

- **Fixed left rail**, ~260px, persistent on scroll. Top→bottom: site name / logo, vertical
  page nav, then social icons + copyright pinned to bottom.
- **Right content region**, scrollable, structured gutters. Offset by the rail (not
  edge-to-edge — that's the point of contrast with Kyoto).
- **Mobile**: rail collapses to a slim top bar + hamburger; content full width.
- **Nav**: new `left-rail` nav style, registered in `common/navStyles.js` and rendered by
  `SiteNav` (which already branches on nav style).

### Cover

Cover works exactly as today — an **optional** full-screen takeover (heading / subheading /
button / image). Clicking through **enters the site**, which then renders the Manhattan
left-rail layout. Cover off → land directly in the rail layout. Users who want a big hero
without the cover just add a full-width photo block.

### Tokens / mood

Kyoto is warm sepia + serif + soft. **Manhattan is gallery-white, cool neutral, tight
uppercase sans** for the rail/nav, near-black text, structured gutters. Reads like an
exhibition wall. Pure token values — no new markup beyond the shell + two block overrides.

### Block behavior — Kyoto vs Manhattan

| Block | Kyoto variants (default first) | Manhattan variants (default first) | Renderer |
|-------|--------------------------------|-------------------------------------|----------|
| **photos** (multi) | stacked, masonry | **grid**, masonry | Manhattan override — tiled gallery wall |
| **photo** (single) | full-bleed, centered | **full-width**, framed | Manhattan override for `framed` |
| **text** | heading/sub/body/quote (center) | same sizes, **left**-aligned default | shared, tokens + default align |
| **video** | full-bleed, centered, side-by-side | **full-width**, framed | shared, restyled |
| **testimonial** | photo-above, quote-above | same | shared, restyled |
| **page-gallery** | list | **grid of page cards** | shared, tokens |
| **contact** | standard | standard (left) | shared |

The content model never changes — a page is still a vertical sequence of blocks. Manhattan
tiles the multi-photo block, insets the column behind the rail, and swaps palette/type.

---

## Editor changes

1. **Theme switcher** — `SiteSettingsPopover` design section: replace the hardcoded
   `minimal-light / minimal-dark / editorial` dropdown with a list generated from `THEMES`
   (name + eventually a thumbnail). Selecting a theme sets `design.theme`. The preview
   re-renders under the new theme; each block resolves to that theme's saved state or
   default.
2. **Variant picker is theme-driven** — `DesignPopover` currently hardcodes `VARIANTS`/
   `LAYOUTS` per block type. It now reads the **active theme's** block spec:
   `theme.blocks[block.type].variants`. On change it writes
   `block.themeState[activeTheme].variant`. When switching themes, the picker shows the new
   theme's variant set automatically.
3. **Preview parity** — admin preview already receives `siteConfig`; it wraps in the same
   ThemeProvider + Shell so the editor matches the published site.

---

## Files touched (indicative — finalize in plan)

- `common/themes/index.js` (new) — registry + `getTheme`.
- `common/themes/kyoto.js`, `common/themes/manhattan.js` (new) — theme modules.
- `common/blocks.js` — default blocks emit `themeState` (or leave lazy; decide in plan).
- `common/siteConfig.js` — normalizer: migrate `variant`/`layout` → `themeState.kyoto`;
  rename `design.theme` values.
- `common/navStyles.js` — register `left-rail`; map new theme ids.
- `components/image-displays/ThemeProvider.js` (new) — token injection + theme context.
- `components/image-displays/blocks/shared/*` (new) — shared renderers, tokenized.
- `components/image-displays/themes/manhattan/*` (new) — ManhattanShell, ManhattanPhotoBlock,
  ManhattanPhotosBlock.
- `components/image-displays/gallery/Gallery.js` — refactor `switch` → spec-driven dispatch.
- `components/image-displays/page/SiteNav.js` — render `left-rail` style.
- `pages/sites/[username]/[slug].js` — wrap in ThemeProvider + Shell.
- `components/admin/platform/SiteSettingsPopover.js` — theme switcher from registry.
- `components/admin/gallery-builder/DesignPopover.js` — variant picker from theme spec;
  write `themeState`.
- `styles/globals.css` — move hardcoded palette into Kyoto tokens; keep global resets.

## Testing

- **Migration**: existing site config → normalizer → every block has `themeState.kyoto`
  matching its prior look; published render is pixel-equivalent to today.
- **Lossless switch**: set variants in Kyoto, switch to Manhattan (defaults appear), change
  variants in Manhattan, switch back to Kyoto → original Kyoto variants intact.
- **Default fallback**: block with no `themeState` for the active theme renders that theme's
  `defaultVariant`.
- **Shared vs override renderers**: text/video render under both themes with correct tokens;
  Manhattan photos tile into a grid; Manhattan framed photo mattes correctly.
- **Shell**: Manhattan rail is fixed, nav + social + copyright placed; mobile collapses to
  top bar; cover takeover → enter → rail layout.

## Marketplace-readiness (what this leaves clean)

- Theme = `{ id, name, tokens, navStyle, Shell, blocks }`. That object is the contract.
- Adding a theme = adding a module to the registry. No block/editor changes.
- Third-party themes later = replace the in-repo `THEMES` import with a
  loaded-and-validated registry. Block content, `themeState`, resolution rule, editor —
  all unchanged. The loader/schema/sandbox is the only net-new work, and it's additive.
