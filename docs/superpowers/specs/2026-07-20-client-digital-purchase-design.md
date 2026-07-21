# Client Digital Purchase (Upsell) — v1 Design

**Date:** 2026-07-20
**Status:** Approved for planning
**Branch:** swamiphoto/client-gallery-features

## Summary

Give clients the ability to pay, on-platform, to download more photos from a
delivered gallery. The service fee for the shoot is typically settled off-platform
(Venmo, invoice, etc.); this feature is the **upsell**: the first *N distinct photos*
are free, and beyond that the client buys **download credits** (a count of additional
distinct photos) or an **"entire gallery"** unlock.

This is not a from-scratch subsystem. It is a **paywall layer on top of the existing
downloads feature**, plus a **digital checkout that reuses the print store's Stripe
Connect rails**.

## Context: what already exists

**Downloads (reused, extended):**
- `pages/api/client/download.js` — proxy route that serves photos with
  `Content-Disposition: attachment`, gated behind `clientFeatures.downloads.enabled`
  and an identity with an email on file. Already logs every download to per-page
  engagement JSON: `downloads: [{ photoUrl, deviceId, quality, ts }]`.
- `common/clientEngagement.js` — pure reducer (`applyEngagementAction`) + R2
  read/write for per-page client-data JSON at `users/{userId}/client-data/{pageId}.json`.
  Holds `people{}` (deviceId → { name, email, firstSeen }), `favorites`, `comments`,
  `submissions`, `downloads`.
- `components/image-displays/engagement/ClientEngagementContext.js` — client provider
  exposing identity + feature actions; `DownloadSheet.js` — quality picker
  (Web ~2000px / Full resolution). `EngagementActions.js` — the frosted-glass pill.
- Identity is stored per-site in localStorage (`common/clientIdentity.js`):
  `{ deviceId, name, email }`. Downloads always require email.

**Payments (reused):**
- `common/stripe/client.js`, `common/stripe/checkout.js` — Stripe client +
  `buildCheckoutSessionParams()` (accepts arbitrary line items).
- Print checkouts are **direct charges on the photographer's connected account**
  with `application_fee_amount` for the platform commission.
- `pages/api/stripe/webhook.js` — **CONNECT-scoped** `checkout.session.completed`
  handler; loads order by `metadata.orderId`, marks paid, runs fulfillment. Idempotent.
- `common/orders.js` — per-user order persistence at `users/{userId}/orders/{orderId}.json`.
- `siteConfig.printStore` — `{ enabled, stripeConnectAccountId, chargesEnabled,
  platformFeePct, currency, ... }`. The **same connected account** is used for digital sales.

## Core model

- **Unit sold:** distinct-photo download entitlement. Counting is by *distinct photo*,
  not by download action. Re-downloading an already-unlocked photo is always free and
  forever. Grabbing both Web and Full-resolution of one photo counts as one photo.
- **Free allowance:** the first `freeAllowance` distinct photos a person unlocks are free.
- **Packages (the "B" model):** each adds either `+credits` distinct-photo unlocks, or
  `all` (unlimited for this gallery). Credits stack; any `all` purchase overrides.
- **Quality is free (model "A"):** the paywall is purely about *how many photos*. Once a
  photo is unlocked, it's available at any quality. Quality-tier pricing is out of scope.
- **Entitlement owner:** the **email** (normalized lowercase), not the deviceId. A client
  who pays on their laptop can download on their phone. This is identity-lite, not a
  security boundary — a shared email/link could split a purchase; acceptable given the
  shoot fee is already collected off-platform.

## 1. Config — `clientFeatures.purchase` (per page)

Extend the already-stubbed shape in `common/siteConfig.js`:

```js
purchase: {
  enabled: false,
  freeAllowance: 0,          // # of free distinct-photo unlocks (0 = everything paid)
  currency: 'USD',           // inherited from site / printStore currency
  packages: [
    { id: 'pkg_...', label: '10 more photos', credits: 10,    price: 4000 },  // price in cents
    { id: 'pkg_...', label: 'Entire gallery', credits: 'all', price: 15000 },
  ],
}
```

Normalization (in the same place `siteConfig` normalizes other feature flags): coerce
`freeAllowance` to a non-negative integer, ensure each package has a stable `id`,
`credits` is either a positive integer or the string `'all'`, and `price` is a
non-negative integer number of cents. Drop malformed packages.

**Preconditions to actually sell** (checked server- and client-side):
- `clientFeatures.downloads.enabled === true` (purchase is a paywall *on* downloads).
- `printStore.stripeConnectAccountId` set **and** `printStore.chargesEnabled === true`
  (same Connect account as prints).

## 2. Entitlement accounting (pure function, unit-tested)

New ledger stored in the per-page client-data JSON, alongside `downloads`:

```js
entitlements: {
  [emailLower]: { credits: number, all: boolean, orders: [orderId], updatedAt }
}
```

Pure function (new, in `common/clientEngagement.js` or a sibling `common/clientPurchase.js`):

```
resolveDownloadAccess({ data, email, photoUrl, freeAllowance }) -> { allowed, reason }
```

Logic:
1. `emailLower = email.trim().toLowerCase()`.
2. `unlocked` = set of distinct `photoUrl`s in `data.downloads` whose `deviceId` maps
   (via `data.people`) to `emailLower`. (Aggregate across all deviceIds sharing that email.)
3. If `photoUrl ∈ unlocked` → `{ allowed: true, reason: 'already-unlocked' }`.
4. Else (new photo):
   - `ent = data.entitlements[emailLower]`.
   - If `ent?.all` → `{ allowed: true, reason: 'entitled-all' }`.
   - `ceiling = freeAllowance + (ent?.credits || 0)`.
   - If `unlocked.size < ceiling` → `{ allowed: true, reason: 'within-ceiling' }`
     (serving this download grows `unlocked`, consuming a slot).
   - Else → `{ allowed: false, reason: 'paywall' }`.

Grant function (applied by the webhook):

```
grantEntitlement(data, { email, credits, orderId }) -> data'
```

- `all` credits set `ent.all = true`; numeric credits do `ent.credits += credits`.
- Append `orderId` to `ent.orders` (used for idempotency — skip if already present).
- Update `ent.updatedAt`.

Both functions are pure over the client-data object; persistence stays in
`readEngagement`/`writeEngagement`.

## 3. Enforcement — `pages/api/client/download.js`

After resolving identity/email and before serving, when `clientFeatures.purchase.enabled`:
- Call `resolveDownloadAccess({ data, email, photoUrl, freeAllowance })`.
- If `!allowed` → respond **402** with a small JSON body (`{ error: 'payment_required' }`)
  and do **not** stream the file or log a download.
- If allowed → serve as today (existing quality resolution, best-effort download log).

When `purchase.enabled` is false, behavior is unchanged (downloads are unlimited/free).

## 4. Checkout + fulfillment (reuses print rails)

**New route: `POST /api/client/purchase/checkout`** (public)
Body: `{ username, pageId, packageId, buyer: { email, name }, deviceId }`.
1. Resolve username → userId → page; validate `purchase.enabled`, `downloads.enabled`,
   `printStore.chargesEnabled`, and that `packageId` exists.
2. Compute a **digital amounts split** (new pure helper, e.g. `common/purchase/digitalAmounts.js`):
   ```
   retail        = package.price
   platformFee   = round(retail * platformFeePct / 100)
   applicationFee = platformFee            // no printCost / shipping
   total         = retail
   profit        = retail - platformFee
   currency      = purchase.currency
   ```
3. Create a `type: 'digital'` order via existing `saveOrder()`:
   ```js
   {
     id, userId, type: 'digital', status: 'pending',
     pageId, packageId, credits: package.credits, label: package.label,
     buyer: { email, name },
     amounts: { retail, platformFee, applicationFee, total, profit, currency },
     stripe: { sessionId, paymentIntentId: null, connectedAccountId },
     createdAt,
   }
   ```
4. Create a Stripe Checkout session **on the connected account** (`{ stripeAccount }`):
   single line item (label = package.label, unit_amount = retail),
   `payment_intent_data.application_fee_amount = platformFee`,
   `customer_email = buyer.email`,
   `metadata = { orderId, userId, pageId, email, type: 'digital' }`,
   `success_url` = gallery page `?purchase=success`, `cancel_url` = gallery page.
   No address collection.
5. Save `sessionId` on the order; return `{ url: session.url }`.

**Webhook: extend `pages/api/stripe/webhook.js`.**
On `checkout.session.completed`, branch on `metadata.type`:
- `digital`: load order; if already `paid` → 200 (idempotent). Else mark `status = 'paid'`,
  store `paymentIntentId`, then read the page's client-data, call
  `grantEntitlement(data, { email: metadata.email, credits: order.credits, orderId })`
  (no-op if `orderId` already in `ent.orders`), write it back. Optional photographer
  sale email. Return 200.
- otherwise: existing print fulfillment path unchanged.

## 5. Client surfaces (build 1 + 2; dedicated block deferred)

**`ClientEngagementContext` additions:**
- Expose `features.purchase`, the current viewer's entitlement summary
  (`unlockedCount`, `ceiling`, `all`, `remaining`), and the `packages` list.
- `isUnlocked(photoUrl)` and `canUnlockMore()` derived client-side from the same
  data the GET returns (see privacy note below).
- `openPurchase()` opens the `PurchaseSheet`.
- Modify `openDownload(photoUrl)`: if `isUnlocked(url)` or `canUnlockMore()` → proceed to
  the quality `DownloadSheet` as today; else → `openPurchase()` (the contextual wall).
- On mount / on `?purchase=success`: refetch entitlement and briefly poll (a few
  attempts over ~10s) to absorb webhook lag, then show a success toast.

**`PurchaseSheet` (new, mirrors `DownloadSheet`):**
- Lists packages: label, price (formatted in `currency`), and a plain-language grant
  ("10 more photos" / "Everything in this gallery").
- Header line: "You've unlocked X of Y" (or "You have the full gallery").
- Selecting a package → `POST /api/client/purchase/checkout` → redirect to `session.url`.
- Hidden entirely if Stripe isn't ready (buttons unavailable).

**Persistent entry point (surface 2):**
- A "Get the full set" section rendered in/near `EngagementActions` (the pill), shown only
  when `purchase.enabled` and Stripe is ready. Opens `PurchaseSheet`. This is also the
  "download all" affordance — it routes a "just give me everything" client straight to the
  `all` package rather than downloading one-by-one.

**Privacy:** the `/api/client/engagement` GET must return only the requesting viewer's
entitlement/unlocked count (resolved from their deviceId → email), never other people's.

## 6. Admin config UI

Build the **Purchase** view in the existing ClientFeatures drill-in
(`components/admin/platform/PageSettingsPopover.js` — the Purchase tab already exists):
- Enable toggle, **disabled with a hint** ("Enable downloads first") until
  `downloads.enabled`.
- If no Stripe connected (`!stripeConnectAccountId || !chargesEnabled`): show a prompt +
  link to the payout connect flow in site settings (same account as prints).
- Free-allowance number input (integer ≥ 0).
- Packages editor: rows of `{ label, credits, price }`, add/remove. `credits` entered as a
  number or toggled to "Entire gallery" (= `'all'`). Price in the site currency; currency
  shown, not per-package. Autosaved via the existing debounced `updateCf('purchase', …)`.
- Use the shared `ToggleSwitch` / `FeatureBlock` primitives for visual consistency.

## 7. Edge cases & non-goals

- Purchase enabled but Stripe not ready → buy affordances hidden client-side; admin config
  warns.
- `freeAllowance ≥ gallery photo count` → effectively free; the wall never fires.
- Buying "10 more" twice stacks to 20; any `all` purchase overrides the numeric count.
- Email always present (downloads require it), so entitlement key is always available.
- Webhook lag on the success page handled by short client-side polling.
- **Out of scope for v1:**
  - ZIP-all bulk download for entitled clients (one-by-one is the v1 experience; the
    "download all" button is a purchase entry point, not a bulk archiver).
  - Quality-tier pricing (web free / hi-res paid).
  - Named fixed-set packages (the "C" model — e.g. "3 retouched headshots"); the design
    leaves room to add these later as a package variant without reworking the ledger.
  - Refund / dispute automation.

## 8. Testing

- **Pure functions (primary coverage):**
  - `resolveDownloadAccess` — in-allowance allow, beyond-ceiling paywall, re-download
    always allowed, cross-device same email aggregation, `all` entitlement, stacked credits.
  - `grantEntitlement` — numeric add, `all` override, idempotent re-grant by orderId.
  - digital amounts split — fee/total/profit math in integer cents.
- **Routes:**
  - `download.js` — 402 beyond ceiling (no file served, no log), serves within ceiling and
    for re-downloads.
  - `purchase/checkout.js` — validates flags, creates order, builds session with correct
    `application_fee_amount` + metadata.
  - `webhook.js` — digital branch grants credits idempotently; print branch unchanged.
