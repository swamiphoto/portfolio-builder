# Import: Structural Replication + Nesting + Reveal

**Status:** Design approved in brainstorming; pending spec review.
**Date:** 2026-08-18
**Builds on:** `docs/designs/2026-08-16-import-site-replication-markdown-text-design.md` (the opt-in rebuild + markdown text block work, shipped via PR #38/#39).

## Summary

Today, when a photographer imports a site and chooses "Build my pages for me," every page becomes a synthesized gallery of photo blocks. Captions are dropped for generic sites, testimonials and side-captions and section headings are never produced, link-card rows are ignored, and sub-pages land as flat siblings instead of nested children.

This project makes the rebuild **replicate the source page's structure** instead of synthesizing a generic one. A richly-laid-out editorial page (like `swamiphoto.com/portfolio`) comes in as the same *sequence of blocks* it had at the source — single photos with their captions, a side-caption photo, testimonials as testimonials, an essay, link cards to sub-pages, a 2-up, a titled "Recent Work" section — rendered in the user's chosen Sepia theme. A page that is genuinely just a grid of photos (like `/portfolio/landscapes`) keeps the flat treatment. Sub-pages nest under their parent.

We replicate **structure and content, not pixels.** Sepia stores theme-independent data and lets the theme render it; the imported page will be recognizably the same page, in the target theme's voice. This is consistent with the editing invariant (sidebar-only edits, theme-independent storage).

## Goals

- A designed source page rebuilds as a faithful *block structure*: photo (below/side caption), testimonial, text (heading/markdown), photos (grid/stacked), video, page-gallery — in source document order.
- Captions are captured for generic sites and attached to the right images.
- A plain image-grid page keeps the flat, capped gallery treatment.
- Imported sub-pages nest under their parent (`parentId`), mirroring the source URL hierarchy.
- Link-card rows on a parent page resolve to `page-gallery` blocks pointing at the imported children.
- The rebuild is a narrated few-second reveal with animated block "mockshots" and an honest progress bar.
- Never produce a broken page: low confidence or any failure falls back to the current deterministic gallery.

## Non-goals

- Visual/pixel replication of the source's CSS (fonts, spacing, colors). Structure only.
- In-place preview editing (still sidebar-only).
- Instagram import (still deferred; OAuth adapter).
- Re-import diffing / de-duplication of previously imported pages (still creates a fresh batch; the `-2`-suffix follow-up remains out of scope).

## What exists today (grounding)

Pipeline: `discover` (`pages/api/admin/import/discover.js`) → select (`ReviewStep`) → `fetch-batch` (`pages/api/admin/import/fetch-batch.js`) → done screen (`ImportDoneStep`, the `replicate` opt-in) → `composeSite` (`common/import/composer.js`) → `applyComposedPages` → site-config PUT. Consumers: `AdminLibrary.js`, `pages/onboarding.js`.

- **Discovery** crawls same-domain (BFS, cap 40), and per page runs `extractImageUrls`, `extractPageContent`, `extractVideoUrls`, `extractNavLinks` (`common/import/crawlerUtils.js`). `extractPageContent` **flattens** all `p/h1/h2/h3/blockquote/li` into one `text` blob and separates it from images — order and image/caption adjacency are lost.
- **`buildSiteMap`** (`common/import/siteMap.js`) classifies each page `gallery | about | contact | other` with deterministic heuristics (`classifyPage`). No in-page structure.
- **`composeSite`** emits one `defaultPage` per site-map page; `composeGalleryBlocks` synthesizes the opener/masonry/solo/stacked rhythm. `parentId` is never set (`defaultPage` defaults it to `null`).
- **Captions:** generic crawler never sets `caption` (`junkFilter` collection refs carry `caption: null`); only the SmugMug web adapter extracts them. Captions live on the **asset record** (`buildImportedAsset`), resolved at render time — photo blocks reference `assetId`/`url`.
- **Blocks** (real stored types): `photo`, `photos`, `text`, `video`, `page-gallery`, `testimonial`, `contact`. Registry in `common/themes/base.js`; defaults in `common/blocks.js`; renderer switch in `components/image-displays/gallery/Gallery.js`. Every source structure we care about is expressible (see the block-mapping table below).
- **Nesting is already supported end to end** in the data model and UI: `parentId` on pages (`common/siteConfig.js:157`), hierarchy in `common/pagesTree.js`, child-gallery resolution in `common/assetRefs.js` (`page-gallery` `source:'auto'` under `parentPageId`), sidebar tree in `AlbumSidebar.js`. The composer simply never populates `parentId`.

## Design principle

Structural replication (option A), theme-independent. The AI decides *which blocks in what order with what captions/roles*; it never touches image binaries or URLs, and it never controls presentation (the theme does).

## Architecture

```
discover.js
  └─ per page: extractImageUrls, extractVideoUrls, extractNavLinks
     + NEW extractPageOutline(html)      → ordered outline (deterministic, free)
  └─ buildSiteMap → siteMap.pages         + NEW page.outline, page.parentPath

fetch-batch.js  (unchanged: download, EXIF, GCS, dedupe → imported[] assets)

rebuild (replicate = true):
  pages/api/admin/import/compose.js  (NEW server-side route)
    for each site-map page:
      classifyLayout(outline)             → 'designed' | 'gallery'
      if 'gallery' → composeGalleryBlocks (capped; deterministic; no model)
      if 'designed' →
        mapOutlineToBlocks(outline)       → block plan
           ├─ rulesMapper   (DEFAULT — deterministic, no key, no cost)
           └─ aiMapper      (OPT-IN — Sonnet 5, only when a key is configured)
        validateBlocks(plan)              → drop/repair invalid → fallback on empty/low-conf
        bindAssets(plan, imported[])      → placeholder ids → real assetId/url
    setParentIds(pages, parentPath map)   → nesting
    resolvePageLinks(pages)               → page-gallery source URLs → new pageIds
  → composedPages
  → applyComposedPages → parent updateConfig → site-config PUT

ImportDoneStep → new ImportRebuildProgress (narrated reveal, honest bar)
```

The pure `composeSite`/`composeGalleryBlocks` stay as the fallback path with their fixture tests. The AI mapping is additive and isolated in new modules so the deterministic path never regresses.

### Component 1 — Ordered page outline (deterministic)

New `extractPageOutline(html, baseUrl)` in `common/import/crawlerUtils.js`. Walks the content scope (`main` or `body`, chrome removed as in `extractPageContent`) in document order and emits a flat, ordered list of nodes:

```js
// outline: Array<Node>
{ kind: 'image', ref: 'img-3', src, caption?, alt?, orientation? }  // ref is a stable placeholder id
{ kind: 'heading', level: 1|2|3, text }
{ kind: 'paragraph', text }
{ kind: 'quote', text, attribution? }        // <blockquote>, cite/figcaption byline if present
{ kind: 'linkcards', items: [{ href, label, thumbSrc? }] }  // repeated image+link card groups
{ kind: 'video', url }
```

Caption capture (the thing generic import drops today): for each image, prefer `<figure><figcaption>`, then an adjacent short caption element, then `title`/`alt`. `ref` is a placeholder (`img-N`) that maps to the real `src`; the AI sees `ref`, never emits URLs. Link-card detection: repeated sibling groups each containing an image + an anchor to a same-origin page (this is the `swamiphoto` "Landscapes & Cities / Portraits / Bollywood" row).

This runs during discovery, is deterministic, and adds no cost. `extractPageContent` stays for classification (`wordCount`, `hasForm`); the outline is added alongside on the site-map page (`page.outline`).

### Component 2 — Designed-vs-gallery decision

`classifyLayout(outline)` — cheap, deterministic, no model call:

- **gallery** (flat treatment) when the outline is essentially images only: no `quote`/`linkcards` nodes, no meaningful prose between images (paragraphs are absent or only a single lead-in blurb), and headings don't segment the images. `/portfolio/landscapes` matches this.
- **designed** (AI mapping) otherwise: prose interleaved with images, blockquotes, link-card groups, or section headings that break up the flow. `/portfolio` matches this.

This is the concrete form of the user's rule: "the only time we make a static gallery is when the page is just a gallery of photos." It also bounds cost to the 1–3 designed pages a typical site has.

### Component 3 — Structural mapper (rules default, AI pluggable)

New `common/import/mapper.js` exposes one interface — `mapOutlineToBlocks(outline)` → `{ blocks, confidence }` — with two interchangeable implementations selected at runtime. New route `pages/api/admin/import/compose.js` orchestrates it (server-side; the AI path reads `process.env.ANTHROPIC_API_KEY`; never in the client bundle — same boundary as the Stripe secret).

**Selection:** `aiMapper` is used only when an Anthropic key is configured; otherwise `rulesMapper` is used. A single `IMPORT_MAPPER` env var can force the choice (`rules` | `ai`). This means the feature ships and runs end to end with **no key and no cost**; the AI is a drop-in quality upgrade behind the same interface.

**`rulesMapper` (v1 default — deterministic, no key, no cost).** Walks the ordered outline and maps clear structural signals with plain code:
- image with a `<figcaption>`/adjacent caption → `photo` (caption below; `side-by-side` variant when the caption sits beside the image in the source)
- `<blockquote>` (+ byline) → `testimonial`
- heading node → `text` (variant `heading`); a paragraph run → `text` (`format:'markdown'`)
- a `linkcards` node → `page-gallery` (`source:'manual'`, `pageRefs` = source URLs)
- consecutive portrait images → `photos` (`stacked`, 2-up); other image runs → `photos` grid (capped, Component 6)
- `video` node → `video`
It returns high `confidence` when it recognized structure, low when the page was mostly unclassifiable images (which then routes to the capped gallery fallback). It nails clean, well-structured HTML; on unusual builder markup it recognizes less and falls back more — never a broken page.

**`aiMapper` (opt-in enhancement — Sonnet 5).** Same interface, higher ceiling on messy markup. Single model constant `IMPORT_MAPPER_MODEL` (default `claude-sonnet-5`, env-overridable) so swapping to `claude-haiku-4-5` is one line. Uses `@anthropic-ai/sdk`, `output_config.format` (structured outputs → schema-valid block plan), `thinking: { type: 'adaptive' }`, modest `max_tokens`. Input is the outline (`ref` placeholders, captions, headings, quotes, link labels) + the block-schema contract (Component 4) + short instructions — **no URLs, no image data**. Output is the same `{ blocks, confidence }` shape as the rules mapper.

**Shared post-processing (both mappers):**
- **`bindAssets`:** deterministically replace each `ref` with the real `{ assetId, url }` from the `imported[]` assets (matched via the same `sourceUrl` map `composeSite` already uses). Captions captured in the outline are already on the asset record from fetch-batch; prefer the asset-record caption. A `ref` with no matching imported asset is dropped from its block.
- **`validateBlocks`:** every emitted block is checked against the real registry (`common/blocks.js` `defaultBlock` + `common/themes/base.js` variants). Unknown types, invalid variants, or empty blocks are repaired to the nearest valid form or dropped. If the plan is empty, invalid past a threshold, or `confidence` is low, the page **falls back** to `composeGalleryBlocks` (Component 6). This guard applies to both mappers, so an AI response can never produce a worse result than the rules path.

### Component 4 — Block-schema contract (model-facing)

A stable, versioned description of the block vocabulary a mapper may emit (both `rulesMapper` and `aiMapper` target it), derived from the real registry so it can't drift:

| Source structure | Emitted block | Fields the model sets |
|---|---|---|
| Single photo, caption below | `photo` (variant `full-bleed`/`centered`) | `ref`, `caption?` |
| Single photo, caption to the side | `photo` (variant `side-by-side`) | `ref`, `caption` |
| Testimonial / pull quote | `testimonial` | `text`, `name?`, `ref?` (avatar) |
| Essay / paragraph run | `text` (`format:'markdown'`) | `content` |
| Section heading ("Recent Work") | `text` (variant `heading`) | `content` |
| Row / grid of photos | `photos` (variant `grid`/`square`/`stacked`/`masonry`) | `refs[]` |
| 2-up vertical photos | `photos` (variant `stacked`) | `refs[]` |
| Link cards to sub-pages | `page-gallery` (`source:'manual'`) | `pageRefs[]` (source URLs, resolved later) |
| Embedded video | `video` | `url` |

The contract lives in one module and is unit-tested to stay in sync with `base.js`/`blocks.js` (a test asserts every emitted type/variant is real). This is the guard against the model inventing blocks.

### Component 5 — Nesting + link-card resolution

Nesting is deterministic and cheap because the infrastructure already exists:

- **`parentPath`:** during `buildSiteMap`, record each page's URL path segments. After pages are composed, `setParentIds` sets `page.parentId` to the composed page whose source path is the immediate parent (`/portfolio/landscapes` → child of `/portfolio`). If the parent wasn't imported, `parentId` stays null (flat).
- **Link cards:** the model emits `page-gallery` blocks with `pageRefs` = source URLs. `resolvePageLinks` swaps each URL for the imported page's new `id`. **Decisions:** a card pointing at a page we did not import is dropped (no dead links). Where a parent clearly links to its own imported children, prefer the model's explicit cards; fall back to `page-gallery` `source:'auto'` under `parentPageId` (already supported by `common/assetRefs.js`) when the model didn't emit cards but children exist.

### Component 6 — Capped deterministic fallback

`composeGalleryBlocks` is the fallback for gallery-classified pages and for any designed page that fails mapping. Tighten it per the user's rule: no auto-generated `photos` block exceeds **~9 images**; larger sets split across multiple blocks with an occasional solo `photo` for rhythm (the existing masonry/solo/stacked rotation already approximates this — adjust `MASONRY_RUN`/`STACKED_RUN` and the cap). An intentionally large grid coming from the *designed* path (the model deliberately grouped >9) is respected; the cap applies only to the synthesized fallback.

### Component 7 — Reveal / progress screen

Replace the instant client rebuild with a narrated sequence, since the AI pass gives real, honest work to show. New `ImportRebuildProgress` (built on `ImportShowcase`/`ImportProgress` styling in `components/admin/import/` so it feels native).

- **Phases, bound to real progress:** "Reading your pages…" (outline) → "Mapping your layout… (page N of M)" (the Sonnet pass) → "Placing your blocks…" (compose + bind + resolve) → "Your site's ready."
- **Visual:** animated mockshots of the real block types sliding in (full-bleed photo, side-caption photo, testimonial card, 2-up, link-card row), populated from a handful of just-fetched thumbnails where available, tasteful placeholders otherwise. Honest progress bar tied to phase/page completion, plus a "sit tight, a few seconds" line.
- **Transport:** the `compose.js` route reports per-page progress (streamed events or client polling of a job); the bar reflects actual page N of M, not a fake timer.

## End-to-end data flow (designed page)

1. Discovery emits `page.outline` (ordered, with captions + link cards) and `page.parentPath`.
2. User picks "Build my pages for me."
3. `compose.js`: `classifyLayout` → designed → `mapOutlineToBlocks` (Sonnet 5) → `validateBlocks` → `bindAssets` (refs → real assets) → block plan.
4. After all pages: `setParentIds` (nesting) + `resolvePageLinks` (cards → pageIds).
5. `applyComposedPages` → written through the parent's `updateConfig` → site-config PUT.
6. Reveal screen animates through the phases and drops the user into the studio.

## Error handling / fallback matrix

| Condition | Behavior |
|---|---|
| Page classified `gallery` | `composeGalleryBlocks` (capped). No mapper call. |
| No key configured (v1 default) | `rulesMapper` runs — full structural replication, no cost. |
| AI selected but unavailable / no credits / network error | That page falls back to `rulesMapper`, then to capped gallery if rules is low-confidence. Import never blocks. |
| Mapper returns invalid/empty plan, or low confidence | Fall back to capped gallery for that page. |
| `ref` has no matching imported asset | Drop that image from its block. |
| Link card points at a non-imported page | Drop the card. |
| Parent page not imported | Child stays flat (`parentId` null). |

## Security

- API key server-side only (`process.env.ANTHROPIC_API_KEY`), read in `pages/api/admin/import/compose.js`. Never referenced from client code, never in the bundle.
- The model sees an outline of text + placeholder ids only — no URLs and no image bytes — so it cannot emit or leak a URL; all real URLs are bound deterministically after the model returns.

## Cost

**v1 (rules mapper): $0.** No API calls at all.

**AI enhancement (opt-in):** only designed pages call the model; galleries and low-confidence pages don't. ~6K in / ~5K out per designed page: Sonnet 5 ≈ $0.09 (≈$0.06 intro), Haiku 4.5 ≈ $0.03, Opus 4.8 ≈ $0.16. Typical import (1–3 designed pages): **Sonnet 5 ≈ $0.06–0.30**, one-time at onboarding, not per visit. Negligible next to image download/EXIF/GCS already done per import.

## Prerequisites

- **v1 needs nothing new to run** — the rules mapper is keyless and free, so the whole feature ships and is testable without any Anthropic account.
- **To turn on the AI enhancement:** `ANTHROPIC_API_KEY` **with credits**. The key is already stored in `~/.secrets/portfolio-builder-v1.env` (gitignored, symlinked to `.env.local`) and authenticates, but the account currently has **no credits** — add a prepaid balance at console.anthropic.com → Plans & Billing, then set `IMPORT_MAPPER=ai` (or leave auto-selection to detect the key). For production, add the same key to the Vercel prod env for www.sepia.photo.
- `@anthropic-ai/sdk` dependency (only needed once the AI path is enabled).

## Testing

- **Outline extraction + capped fallback:** fixture tests (extend the existing `common/import` fixture suite). Golden fixture: a captured `swamiphoto.com/portfolio` HTML → expected outline.
- **Block-schema contract:** unit test asserting every emitted type/variant exists in `base.js`/`blocks.js` (drift guard).
- **`rulesMapper`:** fixture tests — recorded outlines → expected block plans (fully deterministic, no API, the primary v1 test surface).
- **`aiMapper`:** contract tests with recorded outlines → assert `validateBlocks` yields only valid blocks and that a deliberately malformed model response degrades to fallback rather than a broken page. The model call is mocked (no live API in unit tests).
- **Nesting + link resolution:** fixture test — `/portfolio` + `/portfolio/landscapes|portraits|bollywood` → landscapes nested under portfolio, cards resolved to their pageIds.
- **Live golden case:** `swamiphoto.com/portfolio` end-to-end (intro text, side-caption Aurora shot, three testimonials, essay, sub-page cards, 2-up portraits, "Recent Work", sub-pages nested). Requires a funded key; run manually.

## Gotchas to respect (from the prior import build)

- **Echo-everything library PUT:** `mergeIncomingConfig` in `pages/api/admin/library.js` replaces `sets`/`savedViews`/`assetOrder` with whatever the client sends — don't omit fields.
- **Parent-owns-config:** `pages/admin/index.js` holds site-config state; children must write through the parent's `updateConfig` (the `onComposedPages` prop path) or the next debounced autosave erases composed pages.
- **Per-theme text branches:** any new text/markdown behavior must be checked in the Florence/Amsterdam theme columns, not just `Gallery.js`.
- **Auth pinning:** `NEXTAUTH_URL` pins auth to `lvh.me:3000`; headless-browser QA can't complete Google OAuth — live QA needs the user's own browser.

## Decisions locked in brainstorming

- Structural replication only (A); theme renders it.
- **Deterministic `rulesMapper` is the v1 default — keyless, free.** The AI (`aiMapper`) is a pluggable enhancement behind the same `mapOutlineToBlocks` interface, enabled only when a funded key is configured. Building rules-first is not throwaway: it is the permanent fallback and the pipeline (outline, schema, binding, validation, nesting, reveal) is shared.
- AI enhancement: Sonnet 5 default, one-line swap to Haiku 4.5 (`IMPORT_MAPPER_MODEL`).
- Always-safe fallback: low confidence → capped gallery; never a broken page.
- Flat-vs-designed decision is fully automatic (no user toggle in v1).
- Dead link cards dropped; parent-link cards prefer AI detection, fall back to `source:'auto'`.
- The rebuild is narrated (latency shown, not hidden), with block mockshots.

## Open follow-ups (post-v1)

- User-visible "just make it a gallery" override.
- Low-confidence page flagging on the reveal screen ("we did our best on these — take a look").
- Re-import de-duplication (avoid `-2`-suffixed duplicate pages).
