# Block Design-Popup Variants — Final Pass

**Date:** 2026-07-16
**Status:** Approved for planning
**Scope:** Rework every block's design-popup variants to their intended final behavior, and refactor the theme system so variants are inherited from a shared base rather than re-declared per theme.

---

## 1. Background & Goals

The per-block "design popup" lets a photographer pick layout/size/alignment/style variants for each block. Today several variants are stubs (they exist in the menu but render identically), some blocks lack a popup entirely, and the theme system **duplicates** the full variant menu in each theme file (`kyoto.js`, `manhattan.js`) with divergent, theme-local IDs.

Two goals:

1. **Correctness** — make every variant actually do what it says, add the missing ones, and give every block a working popup.
2. **Portability** — the user is about to author many more themes (eventually third-party). A theme should be *data* (a palette + fonts + a few taste choices), not a re-implementation of the variant menu. Structure/behavior lives in a shared base; themes inherit it.

**Design principle (guiding constraint): a theme is data, not code.** The base owns the variant menus, the layout renderers, the empty states, alignment, and button styles. A theme supplies tokens (colors, fonts, spacing) and optional overrides (change a default, rename a label, hide/add a variant). Dropping in a new theme = supply tokens → it automatically gets the whole base menu, rendered by shared code, styled with its palette.

---

## 2. Architectural Foundation — Base Registry + Theme Contract

### 2.1 Current state (the problem)

- `common/themes/kyoto.js` and `common/themes/manhattan.js` each fully re-declare `blocks: { photo, photos, text, video, testimonial, contact, page-gallery }`.
- The *same logical option* has different IDs per theme: photo `full-bleed`/`centered` (Kyoto) vs `full-width`/`framed` (Manhattan); photos `stacked`/`masonry` vs `grid`/`masonry`.
- Adding a base variant (e.g. `grid`, `square`) means editing every theme file; each new theme re-pastes the menu.
- `common/themes/index.js` already anticipates a marketplace ("the marketplace later merges validated external themes into THEMES without touching consumers") — the base registry is the missing piece that makes that cheap.

### 2.2 Target state

Introduce **`common/themes/base.js`** — the canonical, theme-agnostic block/variant registry with **stable semantic IDs** shared by all themes:

```
baseBlocks = {
  photo:       { default: 'full-bleed',  variants: [full-bleed, centered] },
  photos:      { default: 'stacked',     variants: [stacked, masonry, grid, square] },
  text:        { default: 'heading',     variants: [heading(L), subheading(M), body(S), quote],
                 aligns: [left, center], defaultAlign: 'center',
                 fonts: [serif, display, fraunces, sans, mono], defaultFont: 'serif' },
  video:       { default: 'full-bleed',  variants: [full-bleed, centered, side-by-side] },
  testimonial: { default: 'photo-above', variants: [photo-above, quote-above] },
  contact:     { aligns: [left, center], defaultAlign: 'left',
                 buttonStyles: [solid, outline], defaultButtonStyle: 'solid' },
  cover:       { heights: [full, partial], defaultHeight: 'partial',
                 buttonStyles: [solid, outline], defaultButtonStyle: 'solid' },
  'page-gallery': { default: 'list', variants: [list] },
}
```

A **theme** becomes tokens + optional overrides:

```js
export const kyoto = {
  id: 'kyoto',
  name: 'Kyoto',
  navStyle: 'cover-embedded',
  tokens: {
    '--theme-bg': '#ffffff', '--theme-text': '#2c2416', '--theme-text-muted': '#7a6b55',
    fonts: { serif: '"Cormorant Garamond"', display: 'Muse', fraunces: '"Fraunces"', sans: 'Inter', mono: '"Geist Mono"' },
  },
  // no `blocks` re-declaration; inherits base wholesale
  overrides: {},  // optional
}
```

**Merge/resolution:**

- New helper `mergeBlockSpec(baseSpec, override)` in `base.js` (or `variants.js`) applies an override to a base spec: `default`, `labels: {id: 'New Label'}`, `hide: [ids]`, `add: [{id,label}]`.
- `getBlockSpec(themeId, blockType)` in `index.js` returns `mergeBlockSpec(baseBlocks[blockType], theme.overrides?.[blockType])`. Themes with no override get the base spec unchanged.
- Manhattan expresses its personality via overrides only, e.g. `{ photo: { labels: { 'full-bleed': 'Full width', centered: 'Framed' } }, photos: { default: 'grid' }, video: { labels: {...}, hide: ['side-by-side'] } }`. **Manhattan keeps the shared IDs** — only labels/defaults differ.

### 2.3 Fonts: shared menu, theme-specific values

The **font menu is a base concept** (slots: `serif`, `display`, `fraunces`, `sans`, `mono`); the **font family each slot maps to is theme-specific** (`theme.tokens.fonts`). A text block stores `block.font = <slot id>`. The renderer resolves slot → family via the active theme's tokens. This is exactly the user's model: "the option set transfers, the actual fonts are per-theme."

### 2.4 Per-theme selection stays lossless

Variant selections remain stored per theme in `block.themeState[themeId].variant` (and `block.align`, `block.font`, `block.buttonStyle`). Because IDs are now shared/semantic, a selection is portable across themes, but we keep the existing per-theme storage model — no behavior regression.

### 2.5 Migration (old saved IDs)

Existing configs may hold theme-local IDs that no longer exist under the shared set (notably Manhattan's `full-width`/`framed`). Add an **alias map** consulted in `resolveVariant` before falling back to default:

```
ALIASES = { photo: { 'full-width': 'full-bleed', 'framed': 'centered' },
            video: { 'full-width': 'full-bleed', 'framed': 'centered' } }
```

The existing `LEGACY` map (for pre-themeState configs) is retained. Net rule in `resolveVariant`: saved id → alias(saved) → legacy(block) → default, accepting the first that is valid for the resolved spec.

### 2.6 Contract documentation

Add a short `common/themes/README.md` documenting the theme shape (`id`, `name`, `navStyle`, `tokens`, `overrides`) and the override grammar, so a future/third-party author can produce a theme without reading core code. **Out of scope:** dynamic/plugin loading of untrusted theme packages, sandboxing, marketplace UI. The contract we define is what such a system would later load.

---

## 3. Per-Block Changes

### 3.1 Hero (page cover)

**Files:** `components/image-displays/page/PageCover.js`, `components/admin/platform/PageDesignPopover.js`, `common/assetRefs.js` (cover normalization), and the hero-content source (`GalleryCover.js` / `Gallery.js`).

**Root cause of "Full/Partial does nothing":** `PageCover` only renders title/description/buttons when `cover.variant === 'cover'`, but the normalized default is `'showcase'` (image-only). The title/description/nav-links/music-show button the user actually sees are rendered by **`GalleryCover`**, *below* the cover image. So the height toggle only stretches the background image; it never affects the content. The hero is split across two components.

**Target behavior:**
- **Partial** (new default): the current shorter cover band (~60vh) with the hero content.
- **Full**: the hero fills the viewport (100vh); title, description, nav links, and the music-show (slideshow) button are **vertically + horizontally centered**, with **action buttons centered**.
- Both must render identically in the **editor preview** (`PagePreview`) and the **published page** (`pages/sites/[username]/*`).

**Key implementation decision (flagged for review):** unify the hero so a single component renders the cover image + centered content (title, description, nav links, music-show button) at the chosen height. Recommended approach: make `PageCover` render the hero content as a centered overlay (pulling in nav links + slideshow/music-show button, which today live only in `GalleryCover`) whenever a cover image exists, driven by `cover.height`; suppress the now-duplicate `GalleryCover` text when `PageCover` owns it. Alternative: make `GalleryCover` height-aware and keep `PageCover` image-only. Implementer to pick the cleaner unification during planning; the observable target above is fixed either way.

**Button style: Solid / Outline only.**
- In `PageDesignPopover.js`, drop the `ghost` option (keep `solid`, `outline`).
- `PageCover` already supports `outline` via `BUTTON_STYLE_MAP`; remove/retire `ghost`.
- In `assetRefs.js`, migrate any stored `buttonStyle: 'ghost'` → `'outline'` during normalization; restrict `BUTTON_STYLES` to `['solid','outline']`.

**Default:** flip the cover height default from `full` → `partial` (`assetRefs.js` line ~252, `PageDesignPopover` default object, and `base.cover.defaultHeight`).

### 3.2 Photo block — no change

`full-bleed` / `centered` are correct as-is. (Under the base refactor, Manhattan's `full-width`/`framed` become label overrides on the same IDs.)

### 3.3 Photos block — add `grid` and `square`; layout-aware empty states

**Files:** `components/image-displays/gallery/Gallery.js` (render), the stacked/masonry gallery components, `components/admin/gallery-builder/BlockCard.js` (editor empty state), `base.js`.

**New variants (added once in `base.js`, inherited by all themes):**
- **`grid`** — justified rows: all images in a row share the same height; width varies by aspect ratio so verticals occupy less horizontal space (500px-/Flickr-style justified layout). Responsive; rows reflow by container width.
- **`square`** — every image hard-cropped to a square via `object-fit: cover` centered; uniform square grid (responsive column count).

**Default stays `stacked`** (Kyoto). Manhattan default stays `grid` (via override).

**Empty-state placeholders reflect the chosen layout, live** — in the editor block card the placeholder boxes must redraw immediately when the design option changes, previewing the layout:
- `stacked` → one centered horizontal box, then two vertical boxes side-by-side below it (replaces today's grid-like stacked placeholder).
- `masonry` → six mixed-aspect masonry boxes.
- `grid` → equal-height row(s) with varied widths.
- `square` → uniform square boxes.

### 3.4 Text block — Font option + resized Large

**Files:** `components/admin/gallery-builder/DesignPopover.js`, `Gallery.js` (text render), `base.js`.

- **New "Font" section, placed above "Size"** in the popup. Options (base font slots): **Serif (Cormorant, default)** · **Display (Muse)** · **Fraunces** · **Sans (Inter)** · **Mono (Geist Mono)**. Stored theme-independently as `block.font = <slot id>`; renderer resolves slot → family via active theme tokens (§2.3). Default `serif`.
- **Large (heading):** reduce the size a notch and increase line-height for balance (e.g. `md:text-5xl` → `md:text-4xl` with a looser `leading`). Exact values tuned during implementation. **Medium and Small unchanged.**
- **Quote:** unchanged for now. A dedicated quote block with a separate author field is a **future** item, not in this spec.
- **Alignment** (left/center) unchanged.

### 3.5 Video block — thumbnail fix + label rename

**File:** `components/image-displays/gallery/video-block/VideoBlock.js`, `base.js`.

- **Fix the missing thumbnail.** Currently the block shows nothing until play. A poster/thumbnail frame must appear before playback (both editor preview and published). Root-cause during implementation (likely `ReactPlayer` `light`/poster handling, or deriving the platform thumbnail URL for YouTube/Vimeo). This is a bug-fix task, so follow systematic-debugging: reproduce → root cause → fix.
- **Rename "Edge to edge" → "Full bleed"** (label only; ID stays `full-bleed`). `Centered` and `Side by side` unchanged.

### 3.6 Testimonial block — variant-aware empty state

**File:** `Gallery.js` (testimonial render + placeholder).

- The empty-state placeholder must **reflect the selected variant, live**: in `photo-above` the avatar circle sits above the text bars; in `quote-above` the avatar circle moves **below** the text bars. (This generalizes the "empty state mirrors the current design" principle from §3.3.)

### 3.7 Contact block — new design popup

**Files:** `components/admin/gallery-builder/DesignPopover.js`, `components/contact/ContactDisplay.js`, `BlockCard.js` (already lists contact under `hasDesign`), `base.js`.

Contact has no popup today (single `standard` variant → `DesignPopover` returns null). Add:
- **Title alignment:** Left / Center — applied to the heading/subheading in `ContactDisplay`. Stored as `block.align` (reuse the existing align field/pattern).
- **Button style:** Solid / Outline — applied to the submit button. Stored as `block.buttonStyle`.

`DesignPopover` must be generalized so alignment/button-style sections are driven by the block's base spec (`aligns`, `buttonStyles`) rather than the current hardcoded `block.type === 'text'` check.

---

## 4. Cross-Cutting Principle — Empty States Mirror Design

Wherever a block has an empty/placeholder state in the editor, changing a design option must update that placeholder live so the user previews the layout before adding content. Applies to photos (§3.3), testimonial (§3.6), and any future block. New blocks: the photos empty state should default to the `stacked` preview described in §3.3 (not a generic grid).

---

## 5. Data Model & Storage

Theme-independent, block-level fields (consistent with the "store theme-independent data" invariant):
- `block.align` — text + contact (`left` | `center`)
- `block.font` — text (font slot id)
- `block.buttonStyle` — contact (`solid` | `outline`)
- `block.themeState[themeId].variant` — per-theme layout/size selection (unchanged)
- Cover: `page.cover.height` (`full` | `partial`), `page.cover.buttonStyle` (`solid` | `outline`)

No breaking schema changes; new fields are additive with sensible defaults via the base spec. Old IDs handled by the alias/legacy maps (§2.5).

---

## 6. Out of Scope (explicit)

- **Contact email delivery verification** — confirming `/api/contact` actually emails the account owner's Gmail is the **next task**, tracked separately.
- Dedicated quote block with a separate author field.
- Third-party theme *infrastructure* (dynamic loading, sandboxing, marketplace UI) — only the declarative contract + docs here.
- Manhattan visual redesign beyond re-pointing it at the base with label/default overrides.

---

## 7. Verification

- **Base refactor:** every existing block popup renders the same options for Kyoto as before (minus intended changes); Manhattan renders its overridden labels/defaults; switching a block's variant then switching themes preserves each theme's stored selection; old configs (incl. Manhattan `full-width`/`framed`, cover `ghost`) resolve via aliases without console errors.
- **Per block:** manually exercise each new/changed variant in the editor preview and confirm the published page matches. Hero Full vs Partial visibly differ (full-viewport centered vs shorter); grid/square render correctly incl. vertical images; text Font switches families and Large is resized; video shows a thumbnail; testimonial + photos empty states redraw on option change; contact popup appears with alignment + button style and both affect the render.
- Run the app against the live dev server on port 3000 (do **not** `next build` over it).
