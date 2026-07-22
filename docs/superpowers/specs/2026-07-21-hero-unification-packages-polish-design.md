# Hero Unification & Packages Polish — Design

**Date:** 2026-07-21
**Status:** Approved for planning
**Branch:** swamiphoto/client-gallery-features
**Builds on:** `2026-07-21-packages-presentation-revamp-design.md`

## Summary

Follow-up refinements after dogfooding the Packages revamp. Five connected pieces:

1. **Hero unification** — collapse the two hero renderers (`PageCover`, `GalleryCover`) into a single `Hero` component with one button row, so "View Packages" (and every hero button) is defined once. Fixes the bug where the button only appeared on pages with a cover *image*.
2. **Configure row** — the admin Packages row uses the standard toggle-left / "Configure ▸"-right layout.
3. **Intro copy** — a short explainer at the top of the Packages Configure drill-in.
4. **Package editor card** — each package is a roomy card with one labeled field per line and a dropdown for the offer type.
5. **Drawer thumbnail** — each drawer package row shows a stacked-photo thumbnail.

Enforcement, money math, entitlements, checkout, and the webhook stay untouched.

## Terminology (agreed)

- **Site cover page** — the site-level landing splash ("View my portfolio"). Stays called "cover."
- **Hero section** — the per-page section with title, description, optional image, and buttons. Called **"hero"** now (not "cover"). A theme may or may not have a hero.
- The persisted config key stays `page.cover` (internal); everything user- and code-facing says "hero." No data migration.

## The bug this fixes

The Kyoto hero is drawn by **two** components today:
- `components/image-displays/page/PageCover.js` — the hero **with** a background image (returns null when `!cover.imageUrl`). It builds "View Music Show" and (after the revamp) "View Packages."
- `components/image-displays/gallery/gallery-cover/GalleryCover.js` — the **image-less** hero (title + buttons on a plain background), rendered by `Gallery` when `!hasCover`. It builds "View Music Show" and "Client Login" but **not** "View Packages."

`PageCover` came later (git: Apr 18, "render page cover on public site"); `GalleryCover` is the original scaffold (Apr 14). On a page with no cover image, `PageCover` returns null, `GalleryCover` renders the hero (no Packages button), and `heroPresent=hasCover=false` triggers the floating fallback. Net: "View Packages" never appears in the hero on the common (image-less) gallery page — exactly what was observed.

`PageCover` is also used for the **site cover splash** (`pages/sites/[username]/index.js` `hasCoverPage` branch, image from Site Settings → Cover page) and the admin preview (`components/admin/platform/PagePreview.js`).

## Part 1 — Hero unification

**Create one `Hero` component** (`components/image-displays/hero/Hero.js`, or rename `PageCover.js` in place to `Hero.js`) that:
- Accepts: `image` (optional URL), `title`, `description`, `navLinks`, `height` (`full`/`partial`), `buttonStyle` (`solid`/`outline`), `primaryButton` (optional `{label, href}`), `slideshowHref`, `clientFeaturesEnabled`.
- Renders **one** button row assembled in order: `primaryButton`, "View Music Show" (when `slideshowHref`), "View Packages" (when the engagement context reports purchase enabled + ≥1 package), "Client Login" (when `clientFeaturesEnabled`).
- Position-based styles: first button uses `buttonStyle`; every later button uses `secondaryButtonStyle(buttonStyle)` (the existing complement helper). Action buttons (View Packages) render as `<button onClick>`; link buttons render as `<a href>`.
- Consumes `useClientEngagement()` (null-safe) for the Packages button, exactly as `PageCover` does today.
- **Image handling:** when `image` is present, render it as the background with the overlay treatment (today's `PageCover` look). When absent, render the plain-background hero (today's `GalleryCover` look: centered title/description/nav/buttons on the theme background). One component, both looks.
- Renders nothing when there is no content at all (no image, no title, no description, no nav, no buttons) — mirroring `GalleryCover`'s `hasContent` guard.

**Replace all usages:**
- `pages/sites/[username]/[slug].js` — the per-page hero (`<PageCover>`) → `<Hero>`.
- `pages/sites/[username]/index.js` — both the **site cover splash** branch (`<PageCover>` with the site cover image + primary button) and the per-page hero branch → `<Hero>`.
- `components/image-displays/gallery/Gallery.js` — where `GalleryCover` renders the image-less hero → `<Hero>` (image-less). The `suppressCover`/`hasCover` coordination collapses: with one component, the page renders exactly one `Hero`; `Gallery` no longer renders a separate cover.
- `components/admin/platform/PagePreview.js` — admin preview `<PageCover>` → `<Hero>`.
- Delete `PageCover.js` and `GalleryCover.js` after their usages move to `Hero`.

**Where the single Hero renders (architecture):** the page owns the hero. In `[slug].js`/`index.js` the `Hero` is rendered as the first child inside `ClientEngagementProvider` (as `PageCover` is today) so it can reach `openPurchase`. `Gallery` stops rendering its own cover; the page passes the hero's data to `Hero` directly. The image-less vs image look is decided inside `Hero` by whether `image` is set.

**`heroPresent` / floating fallback:** `heroPresent` becomes "does this page render a hero with a button row" — true whenever the page renders a `Hero` that has content (which, for Kyoto, is every page). The floating `PurchasePrompt` shows only when `features.purchase && !heroPresent` — i.e. a theme/page with no hero at all. Since `Hero` now always carries "View Packages" when a hero renders, the floating button appears only in the genuine no-hero case (a future theme without a hero section). Keep it as the safety net.

**Data/props:** no change to the stored `page.cover` shape. Props and component names use "hero" language. The Design popover already says "Hero height" (`PageDesignPopover.js:16`), so this aligns.

## Part 2 — Admin Configure row

Replace the custom Packages `<div>` in `PageSettingsPopover.js` (`view === 'client'`) with the standard **`ToggleRow`** (already defined in the file, lines ~64-89): toggle on the left, label "Packages", and **"Configure" chevron on the right** (`actionLabel="Configure"`, `onDrillIn={() => setView('packages')}`). It matches the Site Settings "Enable print store" / "Include a cover page" rows.

The Packages toggle must still **auto-enable Downloads** on enable (the atomic `update()` write that sets `purchase.enabled` and `downloads.enabled` together). `ToggleRow`'s `onToggle` receives the new value; pass a handler that does the two-key `update()`. Keep the "Connect a payout account…" hint (as the row's `hint` or just below) when `purchase.enabled && !paymentsReady`.

## Part 3 — Intro copy in the Configure drill-in

At the top of the `view === 'packages'` popover, add a short intro:

> Create one or more offers your clients can buy. Set how many photos they get free in **Free downloads** above; then add packages here — a set number of extra photos, or the whole gallery.

Muted helper style, consistent with other settings intros.

## Part 4 — Package editor card

Redesign each package row in the `view === 'packages'` popover as a **card with one labeled field per line** (kill the cramped single-row layout, the wrapping "Entire gallery" checkbox, and the overflowing ×):

- **Package name** — text input, full width (placeholder "e.g. 10 more photos").
- **What's the offer?** — a **dropdown** (`<select>`) with options: "A set number of photos" (maps to numeric `credits`) and "The entire gallery" (maps to `credits: 'all'`). Extensible for future offer types. Selecting a type updates `credits` (default to `10` when switching to "set number").
- **How many photos?** — number input, shown **only** when the offer is "a set number" (hidden for "entire gallery").
- **Price** — its **own line**, currency prefix from `siteConfig.printStore.currency`, dollars↔cents via the existing `purchasePackages` helpers.
- **×** remove — top-right corner of the card.
- **+ Add a package** — full-width dashed button at the bottom.

Uses the existing `addPackage`/`updatePackage`/`removePackage`/`dollarsToCents`/`centsToDollars` helpers; the stored package shape (`{ id, label, credits, price }`) is unchanged.

## Part 5 — Drawer stacked-photo thumbnail

Each package row in `PackagesDrawer.js` gets a **stacked-photo thumbnail** on the left: a representative gallery photo shown as the top card with two more cards fanned behind it (a "pack" look). Same photo for every package is acceptable.

**Threading the photo:** the engagement context has no photo today. Add a representative photo URL to the provider:
- Compute a representative photo on the page: reuse `pageDisplayThumbnail(page)` (from `common/assetRefs.js`) — falls through explicit thumbnail → cover image → first gallery photo.
- Pass it into `ClientEngagementProvider` as a new prop `heroPhoto` (or `coverPhoto`), from both `[slug].js` and `index.js`.
- Expose it on the context (e.g. `packageThumb`) and render the stacked thumbnail in `PackagesDrawer` using `getSizedUrl(url, 'thumbnail')`. If no photo is available, render the row without a thumbnail (graceful).

The stacked effect is pure CSS (three positioned/rotated layers). No new data model.

## Non-goals

- Renaming the persisted `page.cover` key (kept for back-compat; no migration).
- Per-package or per-photo thumbnails (one representative photo per gallery is fine).
- New offer types (prints/products) — the dropdown just leaves room for them.
- Any change to enforcement, entitlement accounting, the checkout route core, or the webhook.

## Testing

- **Pure/unit:** `secondaryButtonStyle` already tested; no new pure logic beyond wiring.
- **Hero component:** renders the image hero when `image` set and the plain hero when not; builds the button row with position-based styles; shows "View Packages" (action button calling `openPurchase`) when the context reports purchase + packages; renders nothing with no content. Covers the case the old split missed (image-less hero shows View Packages).
- **Admin:** the Packages row uses `ToggleRow` (toggle-left, Configure-right) and enabling it flips Downloads on; the Configure drill-in shows the intro + labeled package cards; the offer-type dropdown toggles the "How many photos?" field; no per-page currency.
- **Drawer:** renders the stacked thumbnail from the threaded photo; still lists packages + Buy (identity-gated) with no unlocked-count header.
- **Regression:** the full suite stays green; existing hero/gallery rendering (music-show button, client login, nav links, full/partial height) is preserved through the `PageCover`+`GalleryCover` → `Hero` migration; enforcement/checkout/webhook suites untouched.
- **Manual:** on an image-less gallery, "View Packages" now appears in the hero (not floating); the floating button only appears if a page renders no hero.
