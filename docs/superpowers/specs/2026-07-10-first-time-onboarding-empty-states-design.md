# First-Time Onboarding Tips & Welcoming Empty States

**Date:** 2026-07-10
**Status:** Approved design, ready for implementation plan

## Problem

When a photographer finishes onboarding (importing photos or starting fresh) and lands in their portfolio for the first time, the admin gives them almost no guidance:

- The main canvas says a flat "Select a page to edit."
- The sidebar's "Pages" and "Hidden" sections render nothing when empty, so a new user has no idea what they're for.
- The import flow ends on a receipt-like "Imported N photos into M sets" screen rather than a warm doorway into the product.
- There is no first-run guidance pointing people at the few things they need to know: add a page, where pages live, where the Library is, and where Settings (cover page, custom domain, print store) lives.

The goal: a warm, friendly, tasteful first-run experience that welcomes the user, teaches the handful of core concepts, and never nags on return visits.

## Copy rule (applies everywhere)

**No em-dashes in any user-facing copy.** The user reads them as an AI tell. Use commas, periods, or parentheses. This spec's copy already follows the rule, and a cleanup sweep of existing site copy is in scope (see Section 6).

## Scope

Five pieces, plus a copy-cleanup sweep:

1. Welcoming empty state on the main editor canvas.
2. Explanatory hint blocks under the sidebar's "Pages" and "Hidden" sections when empty.
3. Reframe the import "done" screen from a receipt into a doorway.
4. A first-time welcome card + opt-in guided spotlight tour (Add a page → Pages → Library → Settings), plus an independent blocks tip.
5. Persistence and first-time detection via the GCS user profile.
6. Sweep existing user-facing copy to remove em-dashes.

## Design

### 1. Welcoming empty-state canvas

**Where:** `pages/admin/index.js`, the main content area currently rendering "Select a page to edit" when no page is selected.

**What:** Replace with a centered, warm moment in the house style (Fraunces serif heading, muted mono/serif subtext, one primary action). Copy:

> **Your portfolio is ready to shape.**
> Every part of your site is a page. Add your first one to get started.
> `[ + Add a page ]`

The primary button reuses the existing add-page action so behavior stays consistent with the sidebar's "Add page" button. Shown when no page is selected. The same warmth applies for a genuinely fresh site (only the auto-created cover exists).

### 2. Explanatory blocks under Pages & Hidden

**Where:** The `SidebarSection` rendering inside `components/admin/platform/PlatformSidebar.js`. Today an empty section renders no rows.

**What:** When a section has zero page rows, render a small in-style hint card (soft sepia background, short line in the sidebar's type treatment) instead of nothing:

- **Pages (empty):** "No pages yet. What you add here becomes your site's navigation."
- **Hidden (empty):** "Nothing hidden. Pages here work by direct link but stay out of your navigation, good for unlisted or private work."

These teach passively, so they help even for users who skip the tour. They disappear as soon as the section has content.

### 3. Import doorway (reframed done screen)

**Where:** `components/admin/import/ImportFlow.js`, the `done` step (currently "Imported N photos into M sets from {hostname}. See my photos.").

**What:** Reframe as a warm doorway, not a receipt:

> **You're all set, your photos are in.**
> *(small)* {N} photos, ready to use.
> `[ Enter my portfolio → ]`   ·   *Import from another site*

- Primary action drops the user into `/admin`, which triggers the first-time welcome (Section 4).
- One low-key secondary link, "Import from another site," restarts the import source step. Uploads are intentionally not surfaced here; they live in the Library.
- If some photos failed, keep a soft note ("A few couldn't be brought in, you can add those manually.") without turning the screen back into a report.

### 4. First-time welcome + guided tour

**New primitive:** a lightweight `GuidedTour` built from the existing `PopoverShell` (for the anchored card) plus a dim/spotlight overlay that cuts a highlight around the anchored element's bounding rect. No third-party tour library.

**Trigger:** On first landing in `/admin` for a user whose profile has `onboarding.tourDone !== true`.

**Step 0, soft welcome card (opt-in):**
> **You're in.** Want a quick tour? It takes about 20 seconds.
> `[ Show me ]`   `[ I'll explore ]`

- "I'll explore" marks the tour done (no nagging). The passive empty-state hints from Sections 1 and 2 still teach.
- "Show me" runs the spotlight walk.

**Spotlight walk (one step at a time, Next / Skip):**
1. **Add a page** (anchor: the sidebar "Add page" button): "Start here. Every part of your site is a page."
2. **Pages** (anchor: the Pages section): "Your pages live here and become your site's navigation."
3. **Library** (anchor: the Library button): "All your photos live here. The ones you just imported are ready to drop in." (The "just imported" clause appears only if the user arrived from an import; otherwise "All your photos live here, ready to drop in.")
4. **Settings** (anchor: the Settings button): "Set your cover page, custom domain, and print store here."

Completing the last step or hitting Skip marks `onboarding.tourDone = true`.

**Blocks tip (independent, fires later):** The first time the user opens a freshly created page in the editor (and `onboarding.blocksTipSeen !== true`), show a single coachmark anchored to the block-add area: "This is where you build the page. Add photo, text, and video blocks." Dismissing sets `blocksTipSeen = true`. This is deliberately not part of the linear tour because it only makes sense once a page exists.

**Anchoring:** `PlatformSidebar` exposes refs (or a small ref registry) for the Add-page button, Pages section, Library button, and Settings button so the tour can position against real elements. The tour reads these to place each spotlight and card.

### 5. Persistence & first-time detection

**Where:** The existing GCS user profile (read/written via the user-profile path helpers in `common/gcsUser.js`).

**Schema addition:**
```
onboarding: {
  welcomed: boolean,      // saw the welcome card
  tourDone: boolean,      // completed or skipped the guided tour
  blocksTipSeen: boolean  // saw the blocks coachmark
}
```

**API:** A small profile-patch endpoint (or extend an existing profile-write route) that merges partial `onboarding` flags. Each flag is written the moment its step completes (skip counts as done). All writes are best-effort: if a write fails, the UI still advances and simply may re-show on a later visit rather than blocking.

**Detection:** Admin reads the profile on load. First-timer = `onboarding.tourDone` falsy. The "just imported" context for the Library step comes from the import flow (e.g. a transient query param or client flag set by the doorway), not persisted.

### 6. Em-dash cleanup sweep

Grep user-facing copy (JSX text, string literals rendered to users, placeholder/label/aria strings) for em-dash (—) characters and rewrite each to comma / period / parentheses per the copy rule. Scope to user-facing strings; leave code comments and docs alone. This is a focused pass, not a general copy rewrite.

## Components & boundaries

- **`GuidedTour`** (new): owns the overlay, spotlight geometry, step sequencing, and the welcome card. Input: an ordered list of steps (anchor ref + copy), plus callbacks for "done"/"skip". Depends on `PopoverShell` and the anchor refs. Testable in isolation with mock anchors.
- **`Coachmark`** (new, or a thin mode of `GuidedTour`): single anchored hint used by the blocks tip. If `GuidedTour` cleanly supports a one-step invocation, reuse it rather than adding a second primitive.
- **Empty-state hint block** (new, small): presentational card used by both the sidebar sections and, in a larger variant, the canvas empty state. Pure presentational, no state.
- **`onboarding` profile flags**: a single source of truth for first-run state, read once on admin load, patched on each step.
- **`ImportFlow` done step**: content-only change, same callback contract (`onComplete`).

## Error handling & edge cases

- Profile read fails on admin load: treat as first-timer is acceptable, but prefer failing closed (skip the tour) so we never trap a returning user in a spotlight. Decision: if the profile read errors, do not launch the tour.
- Profile write fails when marking a flag done: advance the UI anyway; worst case the welcome re-shows next visit.
- Anchor element not mounted (e.g. Library button hidden at a breakpoint): skip that step gracefully rather than pointing the spotlight at nothing.
- User resizes or scrolls mid-tour: reposition the spotlight/card against the current bounding rect.
- Very fast users who click Add page before/without the tour: the tour and the empty-state CTA must not fight. If a page gets created mid-tour, advance or end gracefully.

## Testing

- `GuidedTour`: step advance, skip, and done callbacks fire correctly; overlay mounts/unmounts; missing anchor is skipped.
- Empty-state hint blocks: render only when the section/site is empty; disappear when content exists.
- `ImportFlow` done step: renders the new copy, primary routes to `/admin`, secondary restarts import, failure note appears only on partial failure.
- Profile flags: first-timer launches welcome; returning user (tourDone true) does not; blocks tip fires once and never again; write failure does not block UI.
- Em-dash sweep: a grep for — in user-facing strings returns clean after the pass.

## Out of scope

- A re-runnable tour / "show me the tour again" affordance (can add later from Settings).
- Analytics on tour completion.
- Localization of tour copy.
- Any broader copy rewrite beyond removing em-dashes.
