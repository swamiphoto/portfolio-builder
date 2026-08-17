# Import Site Replication + Markdown Text Block — Design

**Date:** 2026-08-16
**Status:** Approved for implementation

## Problem

Today, importing a site URL ends at "assets in the library." The user still has to
build every page by hand. The wedge we promised — paste a URL, get your site back —
requires the import to *replicate the source site*: detect its galleries, about, and
contact pages, and auto-create the equivalent Sepia pages with well-composed blocks.

Separately, long-form text (about pages especially) needs richer formatting than the
plain text block allows. Interleaving text blocks works for short captions sprinkled
between images, but is too laborious for essay-style pages. The composer also needs
a markdown-capable text block to land imported about-page prose.

## Decisions already made

- **Fully automatic replication.** No review/confirm step. Users can delete pages
  easily; a conditional onboarding tip explains what was imported.
- **Instagram import: deferred.** Will be a later OAuth-based adapter.
- **In-place editing on the preview surface: deferred entirely.** The preview stays
  read-only. All editing happens in the sidebar and the new slide-out panel.
- **No new block type.** The existing text block gains markdown capability; plain
  text remains the default and existing blocks are untouched.
- **Inline images in markdown: yes** (between paragraphs, essay-style), inserted via
  the picker; interleaved photo blocks remain the tool for the decorative case.
- **Markdown is layout-agnostic.** The block stores structure + emphasis only; the
  theme decides presentation (fonts, columns, image treatment).

## Part A — Import site replication

### A1. Adapter contract: site map

`adapter.discover(input)` currently returns `{ collections, totalAssets }`. Extend
the return to a **site map**:

```js
{
  collections,          // unchanged (asset discovery)
  totalAssets,          // unchanged
  siteMap: {
    pages: [{
      kind: 'gallery' | 'about' | 'contact' | 'other',
      title, slug,
      navOrder,          // position in source nav, null if not in nav
      textContent,       // extracted prose (about/other), markdown-ish plain text
      imageRefs,         // refs into collections (gallery pages), portrait candidates (about)
      sourceUrl,
    }]
  }
}
```

`siteMap` is optional — adapters that can't produce it (or single-page imports)
degrade to today's behavior (assets + sets only, no page creation).

**Classification heuristics (generic adapter, deterministic — no AI):**
- Nav link text / URL slug match: `about|bio|info` → about; `contact|hire|book` → contact.
- Composition: page ≥ ~8 images and low word count → gallery; ≥ ~150 words of prose
  with ≤ 2 content images → about; presence of a `<form>` or `mailto:` → contact.
- Unclassifiable pages → `other` (imported as assets only, no page created).

**SmugMug adapter:** the folder/gallery tree from the API maps directly to gallery
pages; SmugMug bio/contact pages are out of API scope in v1 (galleries only).

### A2. Original-resolution URL hunting (generic adapter)

The generic crawler already picks the largest srcset candidate. Add per-platform
derivative→original rewrites, tried with a HEAD/GET probe and falling back to the
discovered URL on failure:

- **Squarespace** (`images.squarespace-cdn.com`): append/replace `?format=original`.
- **WordPress**: strip `-{w}x{h}` suffix from filename (`photo-1024x683.jpg` → `photo.jpg`).
- **Format/Zenfolio/common CDNs**: strip known size path segments where recognized.

Import already preserves bytes unmodified and runs `extractCapture()` EXIF
extraction (`fetch-batch.js`); no changes needed there.

### A3. Layout composer

A pure function in `common/import/composer.js`:

```
composeSite(siteMap, assetsById) -> { pages: [pageConfig], sets: [setConfig] }
```

- **Gallery page recipe** (the "spice it up" logic, driven by asset width/height/
  orientation — no AI):
  1. Opener: single full-bleed `photo` block — highest-resolution landscape image
     in the collection (falls back to first image).
  2. Body: alternating runs — `photos` block (masonry layout) of 8–12, a solo
     `photo` breather (a strong horizontal), a `photos` (stacked) run, repeat.
     Verticals cluster into masonry runs; solo slots prefer landscape.
  3. Small collections (< 8 images): single masonry block, no opener ceremony.
- **About page**: title + `text` block(s) with `format: 'markdown'` containing the
  extracted prose (paragraph breaks preserved); if a likely portrait image was
  found on the source page, it is imported and placed as a `photo` block after the
  first paragraph block.
- **Contact page**: existing `contact` block, prefilled title.
- **Nav**: pages get `showInNav: true` ordered by source `navOrder`.
- Deterministic and fixture-testable: given a fixed site map + asset metadata, the
  composer output is stable.

### A4. Page creation, tagging, Sets

- Composer output is merged into `site-config.json` through the existing PUT
  `/api/admin/site-config` shape — no new storage model.
- Every composer-created page carries `source: { importBatchId, sourceUrl }` so we
  can (a) show the conditional onboarding tip, (b) support a future "start fresh"
  (bulk-remove imported pages) action. Slug collisions with existing pages get a
  numeric suffix; import never overwrites a page the user made.
- **Sets fix:** imported collections become library **Sets** (`sets` map +
  `asset.setIds[]`), replacing the current write into `galleries[slug]`
  (`importClient.js:92-96`) which contradicts the design doc. Gallery pages are
  composed from those same assets.

### A5. Onboarding tip (conditional)

On the pages step of onboarding tips, when the site has import-tagged pages:
"These pages were imported from your site. You can delete any of them and start
fresh from the profile menu." Shown only when import-tagged pages exist.

## Part B — Markdown text block

### B1. Data model

Text block gains `format: 'plain' | 'markdown'` (absent = plain; no migration).
`format` becomes `'markdown'` the first time edits are **saved from the markdown
panel**. Content is stored as markdown text; supported syntax: headings, bold,
italic, blockquote, links, unordered lists, images. Images are stored as library
references — `![caption](asset:ASSET_ID)` — resolved to `publicUrl` at render;
this keeps asset usage tracking honest and survives URL changes.

### B2. Sidebar UX

- **Plain block (default):** today's textarea, unchanged, plus an
  "Open markdown editor" link below it.
- **Markdown block:** the card's textarea is replaced by a read-only rich snippet
  preview (bold/italic rendered inline; images omitted) with a "Markdown" badge.
  Clicking the preview — or the link — opens the panel. Direct card editing is
  disabled once a block is markdown (single source of truth: the panel).

### B3. Slide-out panel editor

A panel sliding from the right (over/beside the preview), containing:
- A plain markdown textarea — essay-style, no layout controls. The center preview
  is the live themed preview (existing 1.5s debounced autosave), so no WYSIWYG.
- Minimal toolbar: bold, italic, heading, quote, image.
- Image insertion: toolbar button or typing `/` on an empty line opens the existing
  `PhotoPickerModal`; inserts `![caption](asset:ID)` at the cursor.

### B4. Rendering

Markdown renders through the theme's typography: `#` → the theme's heading style,
emphasis/quote/list → theme-consistent styles, links → theme link treatment.
Inline images render full-width within the text column with the theme's image
treatment; alt text renders as the caption where the theme shows captions. The
block-level variant/align/font preferences continue to apply as the base style.
Renderer: a small, safe markdown parser (no raw HTML passthrough) shared by the
public renderer and the sidebar snippet preview.

## Out of scope (deferred)

- Instagram import (OAuth adapter; ~1080px ceiling caveat noted).
- In-place editing on the preview surface (all forms).
- WYSIWYG/inline rich-text editing; tables, footnotes, raw HTML in markdown.
- "Start fresh" profile-menu action (tagging in A4 makes it possible later).
- Squarespace-specific Playwright rendering; AI-assisted page classification.

## Testing

- **Composer:** fixture site maps (SmugMug tree, generic multi-page, single-page,
  small collection) → snapshot the composed page/block output.
- **Classification:** HTML fixtures per heuristic (about, contact, gallery, other).
- **URL rewrites:** unit tests per platform pattern, incl. probe-failure fallback.
- **Markdown:** parser unit tests (supported syntax, `asset:` resolution, HTML
  stripped); render smoke test across at least two themes.
- **Import e2e:** discover→fetch→compose against a fixture site produces pages in
  site-config with correct tagging, sets populated, no `galleries[]` writes.
