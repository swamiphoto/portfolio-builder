# Unified Page Model & Navigation — Design Spec

**Date:** 2026-04-18
**Status:** Draft
**Related:** `docs/designs/photohub-platform-design.md`

## Problem

The product model currently blurs the line between "pages" and "galleries" — pages hold photos, galleries hold text — and a type picker at creation would be friction the product is trying to kill. Separately, several structural gaps block further work:

- **No nav hierarchy.** There's no way to express Portfolio → Landscapes / Portraits, or to mark a page as unlisted without deleting it.
- **No page-level hero.** Cover imagery is a real visual need with no home in the current model.
- **Slideshow lives apart.** It exists as its own editor, disconnected from the page it describes.
- **Client features and commerce are coming.** They must layer onto this foundation without requiring a rewrite.

This spec unifies these concerns under a single page concept with page-level settings and a nav model that matches the sidebar tree.

## Approach

**One page type.** Every page is a block container with page-level settings. Page *content* (photo-heavy, text-heavy, cover-like) is a block composition. Page *behavior* (slideshow, password, client features) is a setting toggle.

**Nav is position in the sidebar.** Two sections — "Main Nav" and "Other Pages" — and drag is the only verb. Nesting is expressed by parent-child relationships within the sidebar and mirrors the published nav.

**Cover is a page-level design setting, not a block.** Edited in a design popup opened from a paintbrush icon on Page Settings, matching the design-popup pattern already used on blocks.

**Slideshow is a page-level toggle.** It plays the page's images. Independent "reel" slideshows are just pages with slideshow enabled and `showInNav: false` — no new primitive.

**Client features layer onto the page.** A page toggle enables password, watermarking, voting, download. Per-block `clientOnly` flag hides blocks from public viewers; the editor shows a visual divider.

**Commerce splits into two independent systems.** Library-level `forSale` flag + optional Store page for public print sales. Page-level client delivery workflow for shoot-specific upsell. They share only checkout.

## Page Data Model

```ts
type Page = {
  id: string
  title: string
  description?: string
  slug: string              // auto from title, editable in Advanced

  parentId: string | null   // null = top-level
  showInNav: boolean        // determines sidebar section
  sortOrder: number

  password?: string         // optional; if set, viewers must enter password

  cover?: {
    imageUrl: string
    height: 'full' | 'partial'
    overlayText?: string
  }

  thumbnail?: {
    imageUrl: string        // explicit thumbnail, overrides cover
    useCover: boolean       // true = auto-sync with cover image
  }

  slideshow?: {
    enabled: boolean
    layout: 'ken-burns' | 'stack' | string  // matches existing slideshow impl
    musicUrl?: string
  }

  clientFeatures?: {        // reserved; no UI in v1
    enabled: boolean
    passwordHash?: string
    watermarkEnabled: boolean
    votingEnabled: boolean
    downloadEnabled: boolean
  }

  blocks: Block[]
}

type Block = {
  id: string
  type: 'photo' | 'photos' | 'text' | 'video' | ...
  clientOnly?: boolean      // reserved; no UI in v1
  ...
}
```

## Navigation

### Sidebar structure

Two sections. Drag pages between them to change nav status. Nesting is expressed by dragging a page under another.

```
[ Main Nav ]
  - Cover
  - Portfolio
    - Landscapes
    - Portraits
    - Bollywood
  - About
  - Contact

[ Other Pages ]
  - Behind the scenes
  - Old shoot 2023
```

- `showInNav: true` → Main Nav section
- `showInNav: false` → Other Pages section
- **Nesting is only expressive in Main Nav.** `parentId` controls both sidebar nesting and published nav nesting. In Other Pages, the list is flat; `parentId` is ignored for sidebar placement (and those pages aren't in the published nav anyway).
- Cross-linking between sections is normal. A page in Other Pages may be linked from a page in Main Nav (e.g., blog post from a Blog hub). That doesn't promote it into the main nav.
- Dragging a page from Main Nav to Other Pages flips `showInNav` and clears `parentId` (since nesting no longer applies). Dragging a parent to Other Pages does not force its children to follow; children remain where they are and lose their parent reference if the parent left the nav.

### Published nav

Rendered from pages where `showInNav: true`, ordered by `sortOrder`, nested by `parentId`. Rendering style is a site-level design setting (see below), not per-page.

### Nav Style (theme-owned)

Nav rendering style is a theme-variant option, not a separate setting. Two styles are offered:

- **Cover-embedded** — nav links appear on the cover page (the current swamiphoto.com approach)
- **Header dropdown** — nav links render in a top-right header dropdown across all pages

A theme exposes nav style as one of its variant options (alongside typography, colors, layout defaults). Picking a theme picks the nav rendering. If a single theme needs both, it ships two variants. No top-level `navStyle` setting on the site — the theme owns it.

### Naming rationale

"Unlisted" was considered but carries YouTube baggage ("hidden, only findable by URL"), which is not the meaning here. "Other Pages" is neutral and accurate — the pages exist, are editable, and may be linked from elsewhere. Actually-hidden pages are protected via the optional `password` field.

## Page Settings Panel

Replaces the current "Page Info" section. A paintbrush icon at the top of the panel opens a design popup — same pattern as blocks — containing cover settings. The main panel holds identity, behavior, and admin fields.

```
Page Settings                       [🎨]  ← paintbrush opens design popup
├─ Title
├─ Description (optional)
├─ Thumbnail
│   └─ Use cover image (default on)
├─ Password (optional)
├─ Slideshow
│   ├─ Enabled (toggle)
│   ├─ Layout: ken-burns | stack | [third]
│   └─ Music
├─ Client features (toggle)  [reserved; no UI in v1]
└─ Advanced
    └─ Slug

Design popup (🎨):
├─ Cover image
│   ├─ Height: full | partial
│   └─ Overlay text (optional)
```

"Page Settings" is chosen over "Page Info" because it covers identity, behavior, and design in one word. Matches the dominant pattern in Squarespace, Webflow, and WordPress.

## Cover / Hero

A cover is a page-level design setting, edited in the design popup accessed via the paintbrush icon on Page Settings (matching the design-popup pattern on blocks).

When present, it renders above the first block at full or partial viewport height. Optional overlay text defaults to empty, with a "Use page title" affordance.

When no cover is set, the current title-only treatment is the default.

**Interaction with thumbnail:** `thumbnail.useCover = true` is the default. Setting an explicit thumbnail unsets `useCover` and lets the user pick separately. This keeps the common case one-step while allowing divergence.

## Slideshow

Page-level setting. Uses the existing slideshow implementation — no rebuild.

- Enabled via toggle in Page Settings
- Plays the page's images in block order
- **Own shareable URL:** `/{username}/{slug}/slideshow` — can be shared independently of the page it belongs to
- **Own cover page** with a Start button (existing behavior)
- **Three layout options:** Ken Burns, Stack, and a third layout (name to confirm during implementation)
- Music via page-level `musicUrl`

The page shows a "View slideshow" affordance that links to the slideshow URL.

### Ad-hoc slideshow ("reel") support

Independent reels remain possible by creating a page with:

1. Title "Best of 2024"
2. Place in Other Pages (`showInNav: false`)
3. Enable slideshow, pick layout and music
4. Add photos via photo/photos blocks
5. Share the `/slideshow` URL directly

No new primitive. If usage demonstrates demand for named, reusable slideshows referenced from multiple pages, a library-level slideshow object can be introduced in v2. Not v1.

## Client Features (reserved for v1, implemented later)

### Data model

Reserved in the page schema:
- `clientFeatures.enabled`
- `clientFeatures.passwordHash`
- `clientFeatures.watermarkEnabled`
- `clientFeatures.votingEnabled`
- `clientFeatures.downloadEnabled`

Each block reserves `clientOnly: boolean`.

### Editor pattern (when built)

A visual divider in the block editor reads "Everything below is client-only." Dragging a block across the divider flips its `clientOnly` flag. The public renderer hides client-only blocks; the client renderer (after password auth) shows them all. Photographer sees both audiences on one page.

### V1

No UI for client features. The toggle exists in Page Settings but is disabled with "Coming soon" copy. The data model reservation prevents a rewrite when the feature ships.

### V2+ (deferred)

- Proofing stages (`proofing` | `delivery` | `archived`)
- Purchase packs (unlock additional images)
- Selection limits ("pick 10")
- Watermarking delivery pipeline

## Commerce (forward-looking, not v1)

Two independent systems. They share only Stripe checkout and Buy button visual design.

### Public print sales

- Library asset flagged `forSale: true` with pricing
- Buy button appears wherever the image renders
- Optional Store page auto-filters library to for-sale images
- Fulfilled via print-on-demand API (Printful, Prodigi)

### Client delivery

- Page-level workflow inside a page with client features enabled
- Per-page pricing and packages
- Delivery state lives on the page, not the library asset

**Why separate:** the library is universal (any page can use any image), while client delivery is shoot-specific (pricing and packages are per-client). Entangling them complicates the library for no user benefit.

## V1 Scope

1. Confirm and document the unified page model — one `Page` type, no gallery/page distinction in the data model, data-access code, or admin UI. If any residual type-branching exists (e.g., `type: 'gallery' | 'single'` fields, type-specific renderers), collapse it.
2. Rename "Page Info" panel → "Page Settings" with the structure above, including a paintbrush icon that opens a design popup
3. Add `cover` field; cover editing lives in the design popup (image picker, height, overlay text)
4. Add `thumbnail.useCover` behavior (default on)
5. Integrate the existing slideshow implementation as a page-level setting: enable toggle, layout selector (ken-burns / stack / third), music, and shareable `/slideshow` URL
6. Restructure sidebar into "Main Nav" and "Other Pages" sections; drag between to flip `showInNav`
7. Add `parentId` for nesting in sidebar and published nav — nesting applies only to Main Nav
8. Add optional `password` field; when set, the page requires the password to view
9. Move `slug` into Advanced disclosure, auto-generate from title
10. Reserve `clientFeatures` in the page schema and `clientOnly` on blocks; no UI (toggle shows "Coming soon")
11. Reserve `forSale` in the library asset schema; no UI
12. Published nav rendering respects the active theme's nav-style variant (cover-embedded vs. header-dropdown). No top-level `navStyle` setting; the theme owns it.

## Out of Scope for V1

- Any client features UI beyond the disabled toggle
- Any commerce UI (Store page, Buy button, pricing)
- Proofing workflow stages
- Purchase packs
- Independent slideshow library primitive
- Auto-curation of reels
- "↗ linked from X" badge in sidebar
- Custom slideshow image ordering (beyond block order)

## Open Questions

1. Confirm the third slideshow layout name (known: Ken Burns, Stack; third to identify in code during implementation).
2. When a page has a cover but no blocks, is the intended experience a full-viewport cover-only page? Revisit during implementation.

## Migration / Compatibility

The existing data model already uses a single `pages[]` array and block composition, so the structural change is additive. Fields being added to `Page`: `parentId`, `showInNav` (existing pages default to `true`), `cover`, `thumbnail.useCover`, `slideshow.*` (align with existing slideshow impl fields), `password` (optional), `clientFeatures` (reserved, empty), `clientOnly` on blocks (reserved). Nav rendering style is owned by the theme, not a top-level site field. No breaking rename of existing fields. Sidebar refactor is UI-only and does not migrate data.
