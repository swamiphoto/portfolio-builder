# Web Import + Onboarding — Design Spec

**Date:** 2026-07-08
**Status:** Approved for planning
**Author:** Swami (with Claude)

## 1. Summary

Photographers arriving at Sepia almost always already have their photos somewhere
online — a SmugMug account, a Squarespace/Wix/Weebly site, a custom HTML portfolio.
Today Sepia gives them an empty admin and asks them to upload one photo at a time.
This is the single biggest gap before shipping to real users.

This work builds a **web import system**: point Sepia at the URL of an existing site
(or a SmugMug account), and it pulls in *all* the photos, mirrors the way they were
already organized (their galleries become our Sets), tags everything by source, and
drops it into the Library — during onboarding as the "magic moment," or any time
afterward as a deliberate, standalone migration.

It also polishes the **entire onboarding sequence** (sign-in → claim URL → import →
reveal) into one tasteful, on-brand experience, and removes a low-value sign-in
interstitial.

## 2. Goals

- Import a photographer's existing photos from the web into the Sepia Library, for free.
- Handle **any website** via a universal DOM/image extractor — not just named platforms.
- Add a first-class, sanctioned **SmugMug** adapter (free API) for clean gallery structure.
- Mirror the source's organization: each remote gallery/album → one Sepia **Set**.
- Tag every imported asset with its **source** (already supported by the data model).
- Surface a new **Source** filter in the Library sidebar.
- Make import a natural, skippable step in onboarding, and re-invokable later as a
  standalone act (not a per-photo action).
- Design an **adapter architecture** so new sources are cheap to add later (Instagram, etc.).
- Polish the full onboarding sequence to match the Sepia look and feel.

## 3. Non-goals (explicitly out of scope for this work)

- **Auto-building pages/site** from imported images. This is the next phase. This work
  ends with a populated, well-organized, source-tagged Library — not a generated site.
- **Instagram import.** Deferred (see §9). The official free path was gutted (Basic
  Display API sunset Dec 2024) and unofficial scraping risks the user's own account and
  is fragile. We register a disabled Instagram adapter slot so the UI anticipates it, but
  build nothing behind it now.
- **SmugMug OAuth for private galleries.** v1 reads *public* SmugMug galleries by URL via
  the free API key. OAuth-for-private is a fast-follow that extends the same adapter (§4.1).
- Background job queue / worker infrastructure (Inngest, QStash, etc.). The batched
  client-orchestrated model (§4.3) intentionally avoids this.

## 4. Architecture

### 4.1 Source adapters

A single contract so every source looks the same to the rest of the system and new
sources are cheap to add:

```
SourceAdapter {
  id           // "smugmug" | "generic" | "instagram"(disabled)
  label        // "SmugMug" | "Website" | "Instagram"
  icon
  enabled      // false for Instagram in v1

  detect(input) -> boolean
    // Does this URL/handle belong to me? SmugMug domains -> smugmug adapter.
    // Everything else falls through to the generic crawler.

  discover(input) -> {
    site: { title, url },
    collections: [
      { id, name, remoteUrl, assetRefs: [ { remoteUrl, width?, height?, caption? } ] }
    ]
  }
    // Metadata only. NO image downloads happen here. Fast.
}
```

**v1 adapters:**

- **`generic` — universal any-site extractor (headline adapter).** Point it at *any*
  site (Wix, Weebly, Format, hand-rolled HTML, Squarespace, …) and it reads the DOM and
  pulls images. This is the default; there is no "unsupported site." Behavior detailed in §4.4.
- **`smugmug` — enhancement adapter.** When we detect a SmugMug domain, we use the free
  SmugMug API v2 (API key, no user OAuth) to read *public* galleries with clean structure,
  instead of crawling. OAuth-for-private galleries is a later extension of this same adapter.
- **`instagram` — registered but `enabled: false`.** Occupies a UI slot; no implementation.

Named adapters are **optional enhancements** layered on recognized platforms; the generic
crawler is the always-available fallback.

### 4.2 Auto-detect (the "just paste a URL" experience)

The primary interaction is a single URL input. On submit we run each enabled adapter's
`detect()` in priority order (specific → generic). SmugMug URLs route to the SmugMug
adapter; everything else routes to the generic crawler. The user does not have to pick a
source manually. Recognizable source logos are shown for reassurance, not as required
choices.

### 4.3 Execution model — serverless-safe, no new infra for the import loop

Importing hundreds of photos (download remote → re-upload to R2 → thumbnail → EXIF)
cannot run inside a single Vercel serverless request. Instead the **client orchestrates
the import in small batches**:

1. `POST /api/admin/import/discover { provider?, input }`
   → runs the matched adapter's `discover()`, returns the collection tree + remote asset
     refs (metadata only). Fast. Supports a pagination cursor for very large sources.
2. Client shows the **Review** screen from the discovery result.
3. On "Import," the client walks the selected asset refs in batches of ~8:
   `POST /api/admin/import/fetch-batch { importBatchId, provider, assetRefs[] }`
   → server downloads each remote image, re-uploads to R2, generates the thumbnail, and
     extracts EXIF, **reusing the existing `upload-file` pipeline** (`common`/`sharp`).
     Returns asset records. Per-asset failures are caught and returned as failures, not
     thrown — the import continues.
4. Client accumulates results, drives the live progress bar (X / total), creates one Set
   per discovered collection, and writes the Library config (incrementally or once at end).

This sidesteps serverless timeout limits entirely — no queue, no worker.

**Exception:** the generic crawler's headless-render path (§4.4) is the one piece of new
infrastructure, and it runs during **discovery**, not the import loop.

### 4.4 Generic crawler behavior & safety

- **Static-fetch-first:** fetch the page over HTTP, parse with a DOM parser, extract from
  `<img>` / `srcset` (prefer largest candidate), `og:image`, and CSS background images;
  follow links to full-res originals where available. Fast and free; covers static HTML
  and `og:image` on most sites.
- **Headless-render fallback:** many modern builders (Squarespace, Wix, Weebly) render
  galleries with JavaScript, so static HTML is empty. When static extraction yields
  little/nothing, load the page in **self-hosted headless Chromium**, let its JS run, and
  read the fully-rendered DOM. Free (compute only — no paid scraping service). This is what
  makes "works on any site" real. *(This is the one meaningful new infra dependency.)*
- **Bounded crawl:** same-domain only; page-count cap and depth cap so we never wander off-site.
- **Junk filtering (before the Review screen):** drop images below a min dimension; drop
  images that repeat across many pages (logos/nav/site chrome); skip sprites, icons, and
  data-URIs.
- **Gallery inference:** infer collections from URL path / page structure; anything
  unclassified lands in a single "yoursite.com" Set.
- **Honest failure states:** unreachable site, zero images found, or a site we still
  couldn't read → friendly message with "try a different link" / "upload manually instead."

### 4.5 Data model (no schema changes needed)

The Library asset model already carries everything required:

- `source` — populated on import: `type: "import"`, `provider` (`"smugmug"` | `"generic"`),
  `label` (e.g. site title), `sourceUrl`, `externalCollectionId`, `importBatchId`,
  `lastSyncedAt`.
- **Sets** — one Set created per discovered collection, named after the source gallery,
  mirroring the photographer's existing organization.
- **`importBatchId`** — groups one import run.
- **Re-import safety / dedupe:** before importing an asset ref, de-dupe by
  `source.sourceUrl` (and exact content hash once fetched). Running import twice does not
  create duplicates — it tops up with anything new.

## 5. API routes (new)

- `POST /api/admin/import/discover` — `{ provider?, input }` → `{ site, collections[] }`.
  Runs adapter `discover()`. May invoke headless render for generic sites.
- `POST /api/admin/import/fetch-batch` — `{ importBatchId, provider, assetRefs[] }` →
  `{ imported: [assetRecord], failed: [{ remoteUrl, reason }] }`. Reuses `upload-file` logic.

Library persistence continues through the existing `/api/admin/library` PUT.

## 6. UI

### 6.1 Onboarding sequence (redesigned as one experience)

All steps share the Sepia system: parchment surfaces (`--desk`/`--panel`/`--popover`),
Fraunces/Cormorant display type, quiet mono labels, `#8b6f47` accents, dark primary
buttons (`#2c2416` / `#f5ecd6`), pane/popover shadows.

1. **Sign-in — remove the white interstitial.** Google is the only provider, so the
   landing "Sign in," "Get started," and "Import your existing site" buttons each call
   `signIn('google', …)` directly, jumping straight to Google OAuth. NextAuth still needs a
   route for the rare error/callback case; keep a minimal, on-brand version of it that
   users effectively never see (replacing the current bare white page).
2. **Claim URL** (existing `/onboarding`) — polished to match the system.
3. **Import** — the shared Import flow (§6.2), full-screen, with a co-equal "Skip for now."
   The landing "Import your existing site" button deep-links here with import pre-selected;
   plain "Get started" lands here with Skip equally prominent.
4. **Reveal** — land in admin with a populated, organized Library.

### 6.2 Import flow (shared component)

One component, used full-screen in onboarding and as a modal from the Library. Steps:

1. **Source** — a single warm input: *"Paste a link to your photos — your website,
   SmugMug, Squarespace, and more."* Muted source logos below (SmugMug, Squarespace,
   Format… Instagram greyed "soon") as reassurance, not required choices. In onboarding, a
   co-equal **"Skip for now."**
2. **Discovering** — animated state: *"Looking through yoursite.com…"* with a live tally
   ("found 340 photos across 9 galleries…").
3. **Review** — primary **"Import all N photos"** button at top (the default, one-click
   path); below it, a grid of discovered galleries as cards (thumbnail stack + name +
   count), all selected, each toggleable. Generic-crawl junk is already filtered out (§4.4),
   so the screen looks clean. (This screen intentionally *is* the review experience — the
   "import all" button gives one-click speed without hiding what was found.)
4. **Importing** — progress bar (`#8b6f47` fill), live "412 / 782," current gallery name,
   thumbnails popping in using the Library's existing highlight animation. Per-photo
   failures are caught silently and counted.
5. **Done** — *"Imported 782 photos into 14 sets from smugmug.com."* If any failed:
   *"23 couldn't be brought in — you can add those manually."* CTA → onboarding: "See your
   photos" (→ admin); Library modal: closes and refreshes, filtered to this import's source.

### 6.3 Library changes

- **New "Source" filter section** in the existing sidebar (alongside Orientation, Usage,
  etc.): *Uploaded · SmugMug · Website · …* with counts, driven by `source.provider`.
- **Standalone "Import from the web" entry**, homed with the Source concept (sources belong
  together) — a deliberate migration action, **not** sandwiched next to the per-set add
  buttons. Opens the shared Import flow as a modal.
- **Empty-library hero invitation** ("Bring in your existing photos") for anyone who
  skipped import during onboarding.
- Imported Sets are named after their source galleries; a subtle source tag shows on tiles/Sets.

### 6.4 Explicitly NOT in the per-photo picker

The `PhotoPickerModal` used *inside* page/block editing stays "Upload" + "choose from
Library." Import-from-web is **not** added there. Two reasons: (1) migrating a whole site
is a separate, deliberate act, not the same gesture as placing one photo on a page; and
(2) once a photographer has imported, they should not keep seeing an "import from web"
option every time they add a photo from the Library — it's a one-time migration, not a
repeated action.

## 7. Error handling

- **Discovery:** bad/unreachable URL, private SmugMug needing OAuth (not yet supported →
  clear message), zero images found, JS-only site we couldn't read → friendly messages with
  retry / "try a different link" / "upload manually instead."
- **Per-asset fetch:** caught, counted, reported in the Done summary; import continues.
- **Partial import:** re-running is safe (dedupe by `source.sourceUrl` + hash). No resume
  state needed in v1.
- **Rate/robustness (generic crawler):** bounded crawl caps; graceful degradation from
  headless to a clear failure message if rendering fails.

## 8. Testing

- **Adapter unit tests:** `detect()` routing (SmugMug vs generic); `discover()` output shape.
- **Generic crawler:** static extraction from a fixture HTML page; junk-filter rules
  (min-dimension, cross-page repeats, sprites/data-URIs); gallery inference from URL paths.
- **Headless fallback:** triggers only when static yields little; verify against a
  JS-rendered fixture.
- **Import loop:** batch fetch reuses upload pipeline; per-asset failure is isolated;
  dedupe prevents duplicates on re-import.
- **Data:** Sets created per collection; `source` fields populated; Source filter counts
  correct.
- **UI:** onboarding step flow incl. Skip; deep-link pre-selection; Library modal entry;
  empty-state hero; PhotoPickerModal has no import entry.

## 9. Future / deferred

- **Instagram** adapter (official OAuth for pro accounts, or best-effort public scrape).
- **SmugMug OAuth** for private galleries.
- **Auto-build site/pages** from imported images (next phase — the "one-click site" vision).
- Additional named adapters (Flickr, Pixieset, etc.) as demand appears.
- Source **sync** (`type: "sync"`, `syncMode`, `lastSyncedAt` already in the model) —
  periodic re-pull of new photos from a connected source.

## 10. Design principles reminder

Everything must feel tasteful and native to Sepia — warm, editorial, quiet. No generic
SaaS-wizard feel. Progress and empty states should feel like part of the same crafted
product as the admin and the published sites. Copy avoids AI-tell patterns (no
fragment-stacks, "Not X. Just Y.", tricolons, theatrical em-dashes) — it reads like real,
warm prose.
