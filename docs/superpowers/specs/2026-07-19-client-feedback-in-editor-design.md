# Client feedback in the editor

**Date:** 2026-07-19
**Branch:** `swamiphoto/client-gallery-features`
**Status:** Approved design, ready for plan

## Problem

Clients can now heart and comment on photos on a published gallery page (built earlier this week; see `2026-07-19-client-favorites-comments-design.md`). That feedback surfaces to the photographer only in the sidebar bell — a chronological, cross-page activity feed. It never appears **on the photos** inside the gallery editor, so the photographer can't see at a glance which shots the client loved, which drew comments, and therefore can't easily cull, reorder, or build a next pass from the client's reaction.

This feature surfaces per-photo client feedback (heart count, comment count, who, and what they said) directly on the photos in the editor — on the block-card thumbnails and in the live preview — behind a photographer-controlled view toggle.

## Goals

- On each photo the photographer edits, show a small badge with the client's heart count and comment count when there is feedback.
- Let the photographer read the comments and see who favorited a photo by clicking the badge.
- Keep clean galleries clean: a photo with no feedback shows nothing.
- Make it a **view** preference (what the photographer sees while editing), fully separate from Client Features (what the client experiences on the published page).
- Surface new feedback once, unobtrusively, then get out of the way.

## Non-goals

- No "top picks" / ranking of favorites (parked, discussed separately).
- No changes to how clients heart/comment on the published page.
- No editing or deleting of client comments by the photographer in this pass.
- No real-time push; feedback is fetched when the editor opens a page (consistent with the bell).

## Key facts that shape the design

- **Exact photo matching, no normalization.** `EngagementActions` records the **raw** `imageUrl` as `photoUrl` (the `<img>` renders `getSizedUrl(imageUrl, 'display')`, but engagement gets the base URL). That base URL is exactly what the editor block stores in `block.imageUrl` / `block.images[].url` and what `getPagePhotos()` returns. Matching feedback to an editor thumbnail is therefore a **plain string lookup** on `photoUrl`.
- **Names are resolvable.** Engagement records store `deviceId`; the per-page `people` map resolves `deviceId → { name, email }`. So per-photo we can show "Favorited by Priya, Raj" and attribute each comment.
- **The editor container already knows the page.** `BlockPageEditor({ page, siteConfig, ... })` (`components/admin/platform/BlockPageEditor.js`) has `page.id` and renders both `BlockBuilder` (block cards) and `GalleryPreview`. This is the single place to fetch feedback and thread it into both surfaces.
- **The preview already has an overlay slot.** Every public gallery layout (`PhotoBlock`, `MasonryGallery`, `GridGallery`, `StackedGallery`, `SquareGallery`, `PhotoLightbox`) renders an `engagementOverlay` containing `<EngagementActions imageUrl={...} />`, which self-gates on `useClientEngagement()` (absent in the editor preview today, so it renders nothing). We can reuse this slot for preview badges by supplying a read-only "review-mode" context, with **no changes to the shared layout files**.
- **Per-page engagement JSON:** `users/{userId}/client-data/{pageId}.json`, shape `{ people, favorites, comments, submissions }` (see `common/clientEngagement.js`).

## Design

### 1. Data: per-photo aggregation

Add a pure reducer to `common/clientEngagement.js`, testable without I/O:

```js
// Aggregate one page's engagement into a per-photoUrl map, resolving names.
export function aggregateByPhoto(data) {
  // returns {
  //   [photoUrl]: {
  //     favBy: string[],                       // names, dedup by deviceId, order by ts
  //     favCount: number,                      // favBy.length
  //     comments: { id, name, text, ts }[],    // chronological
  //     commentCount: number,
  //   }
  // }
}
```

Also expose `lastActivityTs(data)` → max `ts` across favorites/comments/submissions (used by the one-time banner), and `hasFeedback(data)` → boolean.

### 2. API: extend `/api/admin/engagement`

`GET /api/admin/engagement?pageId=<id>` returns a single-page, per-photo view instead of the cross-page event list:

```json
{
  "pageId": "abc",
  "byPhoto": { "<photoUrl>": { "favBy": ["Priya"], "favCount": 1, "comments": [{ "id": "c_..", "name": "Priya", "text": "mom loves this", "ts": 0 }], "commentCount": 1 } },
  "lastActivityTs": 0,
  "hasFeedback": true
}
```

- When `pageId` is absent, behavior is unchanged (existing `{ events, pages }` feed for the bell).
- Reads only that one page's file via `readEngagement(user.id, pageId)`; resolves names from `people`. Still `withAuth`, so client emails never reach the wire beyond the authed photographer (and we send **names only**, never emails, matching the bell).
- Returns `{ hasFeedback: false, byPhoto: {} }` gracefully when the file is missing.

### 3. Editor data hook

`useClientFeedback(pageId, enabled)` (new, `components/admin/platform/useClientFeedback.js`):
- Fetches `/api/admin/engagement?pageId=` once when `enabled` and `pageId` are set. `enabled` = `page.clientFeatures?.enabled` (no point fetching for pages without client features).
- Returns `{ byPhoto, lastActivityTs, hasFeedback, loading }`.
- Called in `BlockPageEditor`; result threaded to `BlockBuilder` and `GalleryPreview`.

### 4. View toggle (outside Client Features)

A photographer view preference, **not** stored in siteConfig:
- Rendered in the block editor header row (in `BlockBuilder`, alongside the existing expand control), as a small toggle labeled "Client feedback" with a heart glyph.
- **Only appears when `hasFeedback` is true** (relevant-only).
- State persists in `localStorage` under `sepia:show-feedback` (global photographer preference; a single toggle governs both surfaces).
- When on, badges render on block cards and in the preview; when off, neither surface shows badges.

### 5. One-time discovery banner

`ClientFeedbackBanner` at the top of the editor canvas (in `BlockPageEditor`, above the editor):
- Shows only when `lastActivityTs > lastSeen`, where `lastSeen` is `localStorage['sepia:feedback-seen:<pageId>']` (per page, so each gallery's new feedback surfaces once).
- Copy: `❤ Priya favorited 14 photos · 💬 Raj left 2 comments` with actions **Show on photos** and ✕.
  - **Show on photos** → sets `sepia:show-feedback` on and writes `lastSeen = lastActivityTs`.
  - ✕ → writes `lastSeen = lastActivityTs` without enabling.
- Separate key from the bell's `sepia:notif-last-seen`, so the bell and the editor banner track "seen" independently.

### 6. Badge component

`PhotoFeedbackBadge({ feedback, onOpen })` (new, shared):
- Renders a compact corner pill: `❤ N` (filled red) and/or `💬 N`, showing only the non-zero icons; renders nothing if both are zero.
- Non-interactive visual by default; the whole badge is a button that calls `onOpen()` (opens the read popover).
- Positioned **bottom-left** on thumbnails to avoid the existing top-right thumbnail menu in `BlockCard`/`PhotoThumb`.

### 7. Block-card badges (primary surface)

- `BlockBuilder` receives `feedbackByPhoto` and `showFeedback`; threads both to each `BlockCard`.
- `BlockCard` renders `PhotoFeedbackBadge` for:
  - the single-photo preview image (`block.imageUrl`), and
  - each `PhotoThumb` in multi-photo grids (`block.images[].url`), looking up `feedbackByPhoto[url]`.
- Clicking a badge opens the **read popover** (section 9) for that photo.
- Guard: badges render only when `showFeedback` is on and `feedbackByPhoto[url]` exists.

### 8. Preview badges (reuse the existing overlay slot)

- `GalleryPreview` receives `feedbackByPhoto` and `showFeedback`. When `showFeedback` is on, it wraps its rendered gallery in a **review-mode engagement context** that implements the same interface `EngagementActions` already consumes (`isFavorited`, `favoriteCount`, `commentCount`, `features`, plus a new `mode: 'review'`).
- `EngagementActions` gains a `mode` branch: in `'review'` mode it renders a **static, non-interactive** feedback badge (identical look to `PhotoFeedbackBadge`) instead of the client's interactive heart/comment buttons; clicking the comment glyph opens the read popover (section 9) rather than the client comment composer. In normal (client) mode it is unchanged.
- This lights up feedback badges across **all** preview layouts (photo/masonry/grid/stacked/square/lightbox) without editing any shared layout file.

### 9. Read popover (how the photographer reads comments)

`PhotoFeedbackPopover({ photoUrl, feedback, onClose })` (new, shared between block cards and preview):
- Opens on badge click. Shows:
  - "Favorited by Priya, Raj" (names from `favBy`), and
  - each comment as `Name · timeAgo` + text, chronological.
- Read-only in this pass (no reply/delete). Mirrors the client's per-photo comment panel so the model is consistent on both sides.

## Data flow

```
BlockPageEditor(page, siteConfig)
  └─ useClientFeedback(page.id, page.clientFeatures.enabled)
        → GET /api/admin/engagement?pageId=  → aggregateByPhoto()
        → { byPhoto, lastActivityTs, hasFeedback }
  ├─ ClientFeedbackBanner (one-time, per-page seen)
  ├─ BlockBuilder(feedbackByPhoto=byPhoto, showFeedback)
  │     ├─ header: Client-feedback view toggle (visible iff hasFeedback)
  │     └─ BlockCard → PhotoFeedbackBadge → PhotoFeedbackPopover
  └─ GalleryPreview(feedbackByPhoto=byPhoto, showFeedback)
        └─ review-mode engagement context
              └─ (shared layouts') EngagementActions[mode=review] → PhotoFeedbackPopover
```

## Error handling

- Missing/empty engagement file → `hasFeedback: false`, no toggle, no banner, no badges. Never blocks the editor.
- Fetch failure → treated as no feedback (log server-side, silent client-side), consistent with the bell's `.catch(() => {})`.
- A `photoUrl` in engagement that no longer maps to any block (photo removed) simply never renders — it's harmless orphaned data, already possible in the current model.
- `localStorage` unavailable → toggle defaults off, banner may re-show; wrapped in try/catch like existing code.

## Testing

- **`aggregateByPhoto` / `lastActivityTs` / `hasFeedback`** — pure-function unit tests: dedup favorites by device, name resolution (including missing person → "Someone"), chronological comment order, empty input, `MAX_*` scale.
- **`/api/admin/engagement?pageId=`** — returns per-photo map for a page; omits emails; graceful empty; unchanged shape without `pageId`; auth required.
- **`PhotoFeedbackBadge`** — renders nothing at zero/zero; shows only non-zero icons; calls `onOpen`.
- **`EngagementActions` review mode** — renders static badge, no favorite toggle side effect on click, comment click opens read popover; normal mode unchanged.
- **Toggle + banner** — toggle hidden when `hasFeedback` false; banner shows once then respects per-page `lastSeen`; "Show on photos" enables + marks seen; ✕ marks seen without enabling.

## Build order

1. **Core loop:** `aggregateByPhoto` + API `pageId` mode + `useClientFeedback` + block-card badges + view toggle + banner + read popover. Delivers the photographer's stated workflow (spot liked shots, cull/reorder in the block cards).
2. **Preview parity:** review-mode engagement context in `GalleryPreview` + `EngagementActions` mode branch, reusing the badge and popover from step 1.

## Files

- `common/clientEngagement.js` — add `aggregateByPhoto`, `lastActivityTs`, `hasFeedback` (+ tests).
- `pages/api/admin/engagement.js` — add `pageId` per-photo mode.
- `components/admin/platform/useClientFeedback.js` — new hook.
- `components/admin/platform/BlockPageEditor.js` — fetch + thread + banner.
- `components/admin/platform/ClientFeedbackBanner.js` — new.
- `components/admin/gallery-builder/BlockBuilder.js` — view toggle + prop threading.
- `components/admin/gallery-builder/BlockCard.js` — badges on single + grid thumbs.
- `components/admin/gallery-builder/PhotoFeedbackBadge.js` — new (shared).
- `components/admin/gallery-builder/PhotoFeedbackPopover.js` — new (shared read popover).
- `components/admin/gallery-builder/GalleryPreview.js` — review-mode context (step 2).
- `components/image-displays/engagement/EngagementActions.js` — `mode: 'review'` branch (step 2).
- `components/image-displays/engagement/ClientEngagementContext.js` — allow a read-only review provider (step 2).
