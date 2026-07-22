# Packages Presentation & Config Revamp — Design

**Date:** 2026-07-21
**Status:** Approved for planning
**Branch:** swamiphoto/client-gallery-features
**Builds on:** `2026-07-20-client-digital-purchase-design.md` (the digital purchase/upsell feature this revises)

## Summary

The digital-purchase (upsell) feature shipped with a centered modal (`PurchaseSheet`) and a
bottom-right floating entry button (`PurchasePrompt`). This revamp changes how packages are
**presented** to clients and **configured** by photographers, and unifies the naming to
**"Packages"** end to end. Enforcement, money math, entitlements, checkout, and the webhook
are unchanged.

Four connected pieces:
1. **Client Packages drawer** — replace the centered modal with a right-side drawer (Print Store pattern).
2. **Hero "View Packages" button** — an auto-generated hero button that opens the drawer; floating button becomes the fallback for pages without a hero.
3. **Admin hero panel rename** — "Page Design" → "Design"; single Button Style control with an auto-computed secondary style.
4. **Admin Packages config** — a "Configure" drill-in, auto-enable Downloads, cleaner package editor, and currency moved to Site Settings.

## Context (what exists today)

- `components/image-displays/engagement/PurchaseSheet.js` — centered modal, title "Download more photos", header "You've unlocked X of Y", lists packages, calls `ctx.startCheckout(id)`.
- `components/image-displays/engagement/PurchasePrompt.js` — fixed bottom-right button "Get the full set", calls `ctx.openPurchase()`; hidden when the client owns everything.
- `components/image-displays/engagement/ClientEngagementContext.js` — provides `features.purchase`, `packages`, `purchaseCurrency`, `purchaseState`, `openPurchase()`, `startCheckout()`. Mounted in `pages/sites/[username]/[slug].js` wrapping **only** the `Gallery` (not the hero).
- `components/image-displays/print/PrintConfigurator.js` + `PrintStoreContext.js` — the right-side drawer pattern to mirror: `<aside>` fixed right, `translateX(100%)`→`translateX(0)`, scrim, Escape-to-close, `PANEL_WIDTH = 460`, mounted app-wide by `PrintStoreProvider`, opened via `openConfigurator()`.
- `components/image-displays/page/PageCover.js` — hero renderer. Builds buttons in order: `primaryButton`, then auto **"View Music Show"** (when `slideshowHref` present), then **"Client Login"** (when `clientFeaturesEnabled`). All buttons share one `buttonStyle` via `BUTTON_STYLE_MAP` (`solid` | `outline`). Both themes (Kyoto, Manhattan) use this same component.
- `components/admin/platform/PageDesignPopover.js` — popover titled **"Page Design"**, with Hero height + a single Button Style control (`solid`/`outline`), shown when slideshow or clientFeatures are enabled.
- `components/admin/platform/PageSettingsPopover.js` — Client Features drill-in with a **"Purchase"** `FeatureBlock` (toggle disabled until Downloads on; inline free-allowance + packages editor + per-page currency selector).
- `components/admin/platform/SiteSettingsPopover.js` — `PrintView` drill-in (`setView('print')`) with Enable print store + markup; **no currency selector today** (`printStore.currency` exists in the model, default USD, unexposed).
- `common/print/publicPrint.js` — `publicPrintStore()` returns `{ enabled, markup, currency, showPriceOnImage, paymentsReady }` to the client (currency already public-safe).
- `common/assetRefs.js` `normalizePageEntity` — normalizes `cover` (`{ imageUrl, height, overlayText, variant, buttons, buttonStyle }`) and `clientFeatures.purchase` (`{ enabled, freeAllowance, currency, packages }`).

## 1. Client "Packages" drawer

Replace the centered `PurchaseSheet` modal with a **right-side drawer** modeled on `PrintConfigurator`:
- `<aside>` fixed to the right, `width` ~460px / `maxWidth: 92vw`, slide via `transform: translateX(100%|0)` with the same easing, a scrim behind it, Escape-to-close, close button.
- **Title: "Packages"** (not "Download more photos").
- **No "You've unlocked X of Y" header** — the drawer just lists packages.
- Each package row: label; a plain grant line (`credits === 'all'` → "Everything in this gallery", else "{n} more photo{s}"); the price formatted with `Intl.NumberFormat` in the store currency; a Buy affordance.
- **Buy is identity-gated:** clicking Buy when the client has no email on file first runs the identity prompt (reuse the engagement `runOrPrompt`/`IdentityPrompt` path used by downloads), then proceeds to `startCheckout(id)`. This closes a gap in the current flow where `startCheckout` could post an undefined email.
- Keep the existing "Redirecting…" loading state and the error surfaced when checkout returns no `url` (from the prior fix).
- Deferred: photo-stack thumbnails and non-download product types (mugs/prints/tees).

The drawer + its open/close state live in the engagement provider (as `openPurchase()` does today); the file is renamed conceptually to a drawer but stays wired to the same context API. `PurchaseSheet.js` is replaced by `PackagesDrawer.js` (or repurposed in place) — one component, one responsibility.

## 2. Hero "View Packages" button

`PageCover` gains an auto-generated **"View Packages"** button:
- **When shown:** Packages enabled (`clientFeatures.purchase.enabled`), payments ready, and ≥1 configured package — analogous to how "View Music Show" appears only when the slideshow is enabled.
- **Action, not link:** clicking it opens the Packages drawer via the engagement context (`ctx.openPurchase()`), rather than navigating to an href. `PageCover` renders it as a `<button onClick>` instead of an `<a href>`.
- **Wiring:** lift `ClientEngagementProvider` in `pages/sites/[username]/[slug].js` so it wraps **both** the hero (`PageCover`) and the `Gallery`. `PageCover` consumes `useClientEngagement()` (null-safe) and self-gates the button. When the context is absent (non-client pages), no button renders.

**Placement / fallback:**
- Page **has a hero** → "View Packages" renders in the hero button row. The floating fallback is suppressed.
- Page has **no hero** → the floating button (today's `PurchasePrompt`, relabeled **"View Packages"**) shows instead. Never both.
- `[slug].js` knows whether a hero renders (`hasCover`); pass that to the provider so the floating fallback shows only when there is no hero.

**Button style (position-based, auto-complement):**
- Keep the single `cover.buttonStyle` control. The **first** hero button uses that style; **every later button** (View Music Show, View Packages, Client Login — whichever are present after the first) renders the **complement** (`solid` → `outline`, `outline` → `solid`). No new data field; the complement is computed in `PageCover`.
- The floating fallback button uses the secondary (outline-ish) treatment it has today.

**Per-client visibility:** the "View Packages" button (hero or floating) shows whenever packages are configured; it is **not** hidden for clients who already own everything (keeps the hero static). This changes the current `PurchasePrompt` behavior, which hid when `purchaseState.all` — that per-client hide is removed.

## 3. Admin hero panel (`PageDesignPopover`)

- Rename the popover title **"Page Design" → "Design"** to match every other block's design popover.
- Keep a **single Button Style control** (secondary is auto-derived in `PageCover`, so no primary/secondary split in the UI).
- Ensure the Button Style control shows whenever **any** hero button will exist — extend the current condition (slideshow or clientFeatures) to also include Packages enabled.

## 4. Admin Packages config

**Client Features row → "Packages" drill-in.** In `PageSettingsPopover.js`, the "Purchase" `FeatureBlock` becomes a **"Packages"** row: a toggle plus a **"Configure" chevron** (Print Store's `setView`/chevron pattern) that opens a nested **"Packages"** popover. The inline free-allowance/packages editor moves into that popover.

**Auto-enable Downloads.** Toggling Packages on also sets `clientFeatures.downloads.enabled = true` (via the existing `updateCf`), since delivery depends on it. Toggling Packages off leaves Downloads as-is. The "enable downloads first" disabled-gate and hint are removed.

**Packages popover contents:**
- Free-allowance integer input.
- Cleaner per-package editor rows: label, count-or-"Entire gallery" (the ∞ toggle), price (dollars ↔ cents via the existing `purchasePackages` helpers), add/remove. No per-package currency.

**Currency → Site Settings.** Add a **currency selector** to the Print Store `PrintView` in `SiteSettingsPopover.js`, writing the existing `printStore.currency` (options e.g. USD/EUR/GBP/CAD/AUD). Remove the per-page currency picker from the Packages editor. Both prints and packages read `printStore.currency`.

## Data model & wiring changes

- **No new `cover` field.** Secondary button style is computed from `cover.buttonStyle`.
- **`purchase.currency` removed** from the per-page config: `normalizePurchaseConfig` drops `currency`; `siteConfig` default and `normalizePageEntity` stop emitting it.
- **Client currency source changes:** the drawer's displayed currency comes from `printStore.currency`. `publicPrintStore()` already exposes `currency` publicly, but the `ClientEngagementProvider` currently receives only `paymentsReady` — the plan must **also thread `printStore.currency`** into the provider (a new `currency` prop) so the drawer displays it, replacing the removed `clientFeatures.purchase.currency`.
- **Checkout route:** `pages/api/client/purchase/checkout.js` already computes `currency: purchase.currency || ps.currency`; with `purchase.currency` gone it resolves to `ps.currency` — behavior preserved, one branch simplified.
- **Internal keys unchanged:** stored data stays under `clientFeatures.purchase.*`. Only user-facing **labels** become "Packages" — no migration of stored config.

## Non-goals

- Photo-stack thumbnails in the drawer.
- Non-download product types (mugs, prints, tees) — the Pixieset-style catalog.
- Per-theme hero button placement logic (both themes share `PageCover`; placement is by page-has-hero).
- Any change to enforcement (402 gate), entitlement accounting, the checkout route's core, or the webhook.

## Testing

- **Pure:** complement-style helper (`solid`↔`outline`); `normalizePurchaseConfig` no longer emits `currency` (and tolerates legacy configs that still have it).
- **Client components:**
  - `PackagesDrawer` renders as a right-side drawer titled "Packages", lists packages with grant lines + prices, no unlocked-count header; Buy triggers the identity prompt when email is missing, then `startCheckout`.
  - `PageCover` renders "View Packages" (as a button that calls `openPurchase`) when packages are configured + payments ready; the later-button style is the complement of `cover.buttonStyle`.
  - Floating fallback shows only when the page has no hero; hero + floating never both.
- **Admin:**
  - Client Features shows a "Packages" row with a Configure chevron opening the Packages popover; toggling Packages on sets `downloads.enabled`.
  - `PageDesignPopover` title is "Design".
  - Site Settings Print Store currency selector writes `printStore.currency`; the per-page currency picker is gone.
- **Regression:** existing engagement/download/checkout/webhook suites stay green (enforcement, money, entitlements untouched).
