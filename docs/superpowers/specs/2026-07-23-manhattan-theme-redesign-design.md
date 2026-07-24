# Manhattan Theme Redesign — Design Spec

**Date:** 2026-07-23
**Status:** Approved for planning

## Goal

Rework the Manhattan theme into a clean editorial **split-pane** layout: a fixed serif left rail beside a left-anchored content column, with whitespace pushed to the right on widescreens. The reference is a Squarespace-style photography site (fixed left menu, masonry that scrolls, sharp-cornered images, readable-width text with right margin).

## Organizing Principle

**Everything sits on a single left spine.** The left rail and the content column share the same left edge (where the divider currently is). Air lives on the *right*. No centered content anywhere. This asymmetry — content weighted left, whitespace right — is what makes the split pane feel deliberate rather than "a sidebar next to centered content." Every decision below serves it.

## Scope

Manhattan theme only. Kyoto and any other theme are untouched. All changes are gated on `themeId === 'manhattan'` (or `data-theme="manhattan"` CSS) so no other theme regresses.

---

## 1. Left Rail (menu)

**Files:** `components/image-displays/page/SiteNav.js` (desktop rail ~lines 395–449, mobile overlay ~343–392), `common/themes/manhattan.js`, `styles/globals.css`, `components/wiggle-line/WiggleLine.js`.

- **Font → Fraunces**, small (~14px), **sentence-case**, normal letter-spacing. Remove the current `uppercase tracking-[0.12em]` treatment on Manhattan menu items. (Non-Manhattan nav styling stays as-is.)
- **Logo** ("Swami Photography" — stacked serif) → **Fraunces**, slightly larger than menu items, restrained. Push it **down** with ample top margin so it sits lower than the top strip on the right — the counterweight that balances the top-pinned buttons.
- **Divider removed:** drop `border-r border-black/10` on the Manhattan rail.
- **Active link accent:** active menu item uses a **muted terracotta** accent instead of the current black underline. Add a theme token `--theme-accent` (default `#b5502e`) in `manhattan.js` so it's trivial to retune. Inactive items are muted; hover nudges toward full text color.
- **Subpages collapse:** a parent page with children shows a small **caret**. Children are **hidden by default** and toggle on caret click. If the current route is a subpage, its parent **auto-expands** on load so the active item is visible. Caret rotates on expand.
- **Squiggle relocated:** render **one** subtle `WiggleLine` on the **left, below the menu list** (left-aligned, not centered). Remove all between-section squiggles from the body for Manhattan (see §5).
- **Fixed on scroll:** rail is already `sticky top-0 h-screen` — keep. Verify the squiggle-below-menu placement works with the sticky rail (rail is a flex column with `justify-between`; menu group top, social/squiggle bottom).

**Mobile:** the rail collapses to the existing hamburger overlay. Apply the same font/case/accent treatment there; carets work in the overlay too.

---

## 2. Hero → Top Strip

**Files:** `components/image-displays/page/PageCover.js`, `components/image-displays/gallery/gallery-cover/GalleryCover.js`, plus a Manhattan branch in whichever renders the page hero.

The hero for Manhattan is **always** a thin strip across the top of the content column — an "announcement/utility bar." It resolves the About/Contact tension: the strip always carries the action buttons, and title/description are optional. A "real" hero on an About page is just its title/description in the strip plus normal blocks below.

- **Position:** top of the content column, **~10px from the top**.
- **Title** (top-left): small, **sans-serif (Inter)**.
- **Description** (below title): small, sans-serif, **subdued** (`--theme-text-muted`).
- **Buttons** (top-right of the strip): **View Music** and **Packages** only. Small, minimal outline style. **Client Login is removed** — the password-gate-before-entry system replaced it.
- **Empty title/description → strip is just the buttons** (clean utility bar).
- **Cover image is NOT rendered as a full hero** in Manhattan (a split pane can't do a full-bleed hero). It is ignored for this theme. Flag for any current site relying on a Manhattan cover image.
- **Balance:** the strip pinned to the top + logo pushed down in the rail = the intended top-heavy-right / lower-left equilibrium.

---

## 3. Images (all block types)

**Files:** `components/image-displays/gallery/photo-block/PhotoBlock.js`, `FramedPhoto.js`, `components/image-displays/themes/manhattan/ManhattanGrid.js`, `components/image-displays/gallery/grid-gallery/GridGallery.js`, masonry/stacked renderers in `gallery/`, `Gallery.js` block dispatch, `common/themes/manhattan.js` overrides, `common/themes/variants.js`, `styles/globals.css`.

- **Sharp corners everywhere:** remove every `rounded-*` (rounded-3xl, rounded-2xl, etc.) for Manhattan-rendered images.
- **Captions move inside:** no captions rendered *below/outside* images. On hover, a **small sans-serif caption fades in at the bottom of the image** over a subtle dark gradient scrim for legibility. Applies to single photos, grid, and masonry tiles.
- **No full-bleed option** in the editor for Manhattan. Remove the full-bleed variant/label from Manhattan's photo/video overrides.
- **Single photo — no layout options at all** for Manhattan. The full-bleed / centered / framed / side-by-side pickers all disappear. One rendering only:
  - Left-aligned, **capped width ≈ two-thirds of the content column**, clear right air.
  - Sharp corners, hover caption inside.
  - The white-mat `FramedPhoto` treatment is **dropped** for Manhattan (soft/traditional, fights the sharp-corner editorial look).
  - Any carried-over variant (full-bleed/centered/framed/side-by-side) **collapses to this single rendering** via `variants.js` resolution.
- **Grids / masonry:** **fill the content width** (left edge to the content's right padding), sharp corners, hover captions inside. Masonry scrolls; rail stays fixed.
- **Width model (CSS on `.theme-content` for Manhattan):**
  - Consistent left padding aligning content to the rail's right edge.
  - Right padding that leaves **air on widescreens**.
  - Grids/masonry fill the content box.
  - Single photos and text are further capped (see §4) so the right side stays open.

---

## 4. Text, Contact, Testimonials, Forms

**Files:** text block renderer, testimonials block, contact block/form, `common/themes/manhattan.js` (`text.defaultAlign` already `left`).

Same spine — all **left-aligned**, no center option:

- **Text blocks:** capped at a **readable measure** (~60–70ch) so lines don't run edge-to-edge on widescreens; right side open. Remove/ignore center alignment for Manhattan.
- **Testimonials:** stop being centered; left-aligned, capped width, quiet Fraunces label where a heading is needed.
- **Contact + forms:** left-aligned fields/details, capped width, right air.
- **No between-section squiggles** (moved to the rail, §1).

---

## 5. Removed / Relocated Decorations

- `WiggleLine` between body sections → **removed** for Manhattan.
- One `WiggleLine` → **left rail, below the menu**, left-aligned.

---

## Theme Token Changes (`common/themes/manhattan.js`)

- Add `--theme-accent: '#b5502e'` (muted terracotta) for active menu items.
- Menu font family resolves to Fraunces (via existing `fonts.fraunces` token / Tailwind `font-fraunces`).
- Update `overrides`:
  - `photo`: remove full-bleed; collapse to single no-option rendering.
  - `photos`: keep `defaultVariant: 'grid'`; ensure grid fills width.
  - `video`: remove full-bleed.
  - `text`: `defaultAlign: 'left'` (already set); no center option surfaced.

---

## Editor Implications

- **Single photo:** hide the layout/variant picker entirely for Manhattan (no full-bleed/centered/framed/side-by-side).
- **Photos:** keep layout choices that make sense (grid/masonry); no full-bleed.
- **Text/testimonials/contact:** hide center-align option for Manhattan.
- Editing stays sidebar-initiated; preview remains read-only (per existing editing invariant). Store theme-independent data — the collapse of variants happens at **render/resolution** time in `variants.js`, not by mutating stored block data, so switching a site back to another theme is lossless.

---

## Non-Goals

- No changes to Kyoto or other themes.
- No new block types.
- No change to the underlying data model beyond adding a theme token and adjusting variant *resolution* (stored data stays theme-independent and lossless).
- No mobile redesign beyond applying the same rail treatment to the existing hamburger overlay.

## Success Criteria

- Manhattan renders a fixed serif left rail (Fraunces, sentence-case, terracotta active, collapsible subpages, squiggle below menu, no divider).
- Hero is a top strip: optional small sans title + subdued description left, View Music/Packages buttons right, ~10px from top; no Client Login; cover image not shown as a hero.
- All images sharp-cornered with inside hover captions; no outside captions.
- Single photos: one left-anchored capped rendering, no layout picker; carried-over variants collapse cleanly.
- Grids/masonry fill content width and scroll under the fixed rail.
- Text/contact/testimonials/forms left-aligned, readable-width, right air on widescreens.
- Kyoto and other themes visually unchanged (regression check).
