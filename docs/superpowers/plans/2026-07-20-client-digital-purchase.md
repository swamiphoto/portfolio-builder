# Client Digital Purchase (Upsell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a client pay on-platform to download more photos from a delivered gallery — a metered paywall on top of the existing downloads feature, with checkout reusing the print store's Stripe Connect rails.

**Architecture:** The first `freeAllowance` *distinct* photos a client unlocks are free; beyond that they buy **credits** (a count of additional distinct photos) or an **`all`** unlock. Entitlements are keyed by **email**, stored in the per-page client-data JSON alongside downloads. Enforcement lives in the download proxy route (returns 402 past the ceiling). Checkout creates a `type: 'digital'` order and a Stripe Checkout session on the photographer's connected account; the existing CONNECT-scoped webhook grants credits on payment. All money math and accounting are pure, unit-tested functions.

**Tech Stack:** Next.js (pages router), React, Stripe (Connect direct charges), Cloudflare R2 (JSON config), Jest + jsdom.

## Global Constraints

- All monetary amounts are **integer cents**. Never store or compute money as floats.
- Purchase reuses the **same** Stripe connected account as the print store (`siteConfig.printStore.stripeConnectAccountId` / `chargesEnabled`). No separate onboarding.
- Platform commission percent resolves as: `Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PCT ?? process.env.PLATFORM_FEE_PCT ?? printStore.platformFeePct ?? 0) || 0`.
- Entitlements are keyed by **normalized email** (`email.trim().toLowerCase()`), never deviceId.
- Counting unit is **distinct photo URL**, not download action. Re-downloading an already-unlocked photo is always free.
- Never return client **emails** from any public (unauthenticated) endpoint.
- Client-side gating is UX only; the download route (server) is the real gate.
- Run tests with `npm test -- <path>`. Never run `next build` over the live dev server (port 3000).
- Copy must read like real prose — no fragment-stacks, no "Not X. Just Y.", no tricolons.

---

## File Structure

**Create:**
- `common/clientPurchase.js` — pure entitlement logic: config normalization, access resolution, credit grants, viewer state.
- `common/purchase/digitalAmounts.js` — pure money split for a digital sale.
- `pages/api/client/purchase/checkout.js` — public route: create digital order + Stripe session.
- `components/image-displays/engagement/PurchaseSheet.js` — client paywall / package picker.
- `components/image-displays/engagement/PurchasePrompt.js` — persistent "Get the full set" entry point.
- Test files under `__tests__/` mirroring each of the above.

**Modify:**
- `common/siteConfig.js` — replace the `purchase` default shape (line 165).
- `common/assetRefs.js` — replace `purchase` normalization in `normalizePageEntity` (lines 311–316).
- `common/clientEngagement.js` — carry an `entitlements` map through `emptyEngagement`/`readEngagement`.
- `common/stripe/checkout.js` — add `buildDigitalCheckoutSessionParams`.
- `common/print/publicPrint.js` — add `paymentsReady` to `publicPrintStore`.
- `pages/api/client/download.js` — enforce the paywall (402).
- `pages/api/client/engagement.js` — GET returns the viewer's purchase state.
- `pages/api/stripe/webhook.js` — branch digital orders to grant credits.
- `pages/sites/[username]/[slug].js` — thread `paymentsReady` to the provider.
- `components/image-displays/engagement/ClientEngagementContext.js` — purchase state + gated `openDownload`.
- `components/admin/platform/PageSettingsPopover.js` — packages editor.

---

## Task 1: Purchase config shape + normalization

**Files:**
- Create: `common/clientPurchase.js`
- Modify: `common/siteConfig.js:165`, `common/assetRefs.js:311-316`
- Test: `__tests__/common/clientPurchase.normalize.test.js`

**Interfaces:**
- Produces: `normalizePurchaseConfig(purchase) -> { enabled: boolean, freeAllowance: number, currency: string, packages: Array<{ id: string, label: string, credits: number|'all', price: number }> }`

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/clientPurchase.normalize.test.js
import { normalizePurchaseConfig } from '@/common/clientPurchase'

describe('normalizePurchaseConfig', () => {
  it('fills defaults from empty/undefined', () => {
    expect(normalizePurchaseConfig(undefined)).toEqual({
      enabled: false, freeAllowance: 0, currency: 'USD', packages: [],
    })
  })

  it('coerces freeAllowance to a non-negative integer', () => {
    expect(normalizePurchaseConfig({ freeAllowance: 3.9 }).freeAllowance).toBe(3)
    expect(normalizePurchaseConfig({ freeAllowance: -5 }).freeAllowance).toBe(0)
    expect(normalizePurchaseConfig({ freeAllowance: 'x' }).freeAllowance).toBe(0)
  })

  it('keeps well-formed packages and preserves ids', () => {
    const p = normalizePurchaseConfig({
      enabled: true, currency: 'EUR',
      packages: [
        { id: 'pkg_a', label: '10 more', credits: 10, price: 4000 },
        { id: 'pkg_b', label: 'Everything', credits: 'all', price: 15000 },
      ],
    })
    expect(p.enabled).toBe(true)
    expect(p.currency).toBe('EUR')
    expect(p.packages).toEqual([
      { id: 'pkg_a', label: '10 more', credits: 10, price: 4000 },
      { id: 'pkg_b', label: 'Everything', credits: 'all', price: 15000 },
    ])
  })

  it('drops malformed packages and coerces types', () => {
    const p = normalizePurchaseConfig({
      packages: [
        { id: 'ok', label: 'Ten', credits: '10', price: '4000' }, // stringy -> coerced
        { label: 'no id', credits: 5, price: 100 },                // missing id -> pkg_1 fallback
        { id: 'bad1', label: 'zero credits', credits: 0, price: 100 },   // invalid
        { id: 'bad2', label: 'neg price', credits: 2, price: -1 },       // invalid
        { id: 'bad3', label: 'weird credits', credits: 'lots', price: 100 }, // invalid
      ],
    })
    expect(p.packages).toEqual([
      { id: 'ok', label: 'Ten', credits: 10, price: 4000 },
      { id: 'pkg_1', label: 'no id', credits: 5, price: 100 },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/clientPurchase.normalize.test.js`
Expected: FAIL — `normalizePurchaseConfig is not a function` / module not found.

- [ ] **Step 3: Create `common/clientPurchase.js` with the normalizer**

```js
// common/clientPurchase.js
// Pure entitlement logic for the client digital-purchase (upsell) feature.
// Counting unit is the distinct photo URL; entitlements are keyed by
// normalized email. No I/O here so every rule is unit-testable.

function toInt(v, min = 0) {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= min ? n : min
}

function normalizePackage(pkg, index) {
  if (!pkg || typeof pkg !== 'object') return null
  const label = String(pkg.label || '').trim()
  const price = toInt(pkg.price, 0)
  let credits
  if (pkg.credits === 'all') credits = 'all'
  else {
    const n = Math.floor(Number(pkg.credits))
    if (!Number.isFinite(n) || n < 1) return null
    credits = n
  }
  if (!label) return null
  const id = String(pkg.id || `pkg_${index}`)
  return { id, label, credits, price }
}

export function normalizePurchaseConfig(purchase) {
  const p = purchase || {}
  const packages = (Array.isArray(p.packages) ? p.packages : [])
    .map((pkg, i) => normalizePackage(pkg, i))
    .filter(Boolean)
  return {
    enabled: p.enabled ?? false,
    freeAllowance: toInt(p.freeAllowance, 0),
    currency: p.currency || 'USD',
    packages,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/clientPurchase.normalize.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire the normalizer into `siteConfig` default + `normalizePageEntity`**

In `common/siteConfig.js`, replace line 165:

```js
      purchase: { enabled: false, freeAllowance: 0, currency: 'USD', packages: [] },
```

In `common/assetRefs.js`, add the import at the top of the file (near the other imports):

```js
import { normalizePurchaseConfig } from './clientPurchase'
```

Then replace the `purchase:` block inside `normalizePageEntity` (lines 311–316) with:

```js
        purchase: normalizePurchaseConfig(cf.purchase),
```

- [ ] **Step 6: Run the broader config/normalization tests to confirm nothing regressed**

Run: `npm test -- __tests__/common __tests__/client-engagement`
Expected: PASS (no regressions).

- [ ] **Step 7: Commit**

```bash
git add common/clientPurchase.js common/siteConfig.js common/assetRefs.js __tests__/common/clientPurchase.normalize.test.js
git commit -m "feat(purchase): normalize per-page purchase config (freeAllowance + packages)"
```

---

## Task 2: Carry entitlements through engagement storage

**Files:**
- Modify: `common/clientEngagement.js:13-15` (`emptyEngagement`), `common/clientEngagement.js:91-104` (`readEngagement`)
- Test: `__tests__/client-engagement/entitlementsStorage.test.js`

**Interfaces:**
- Produces: engagement data objects now include `entitlements: { [emailLower]: { credits, all, orders, updatedAt } }`, defaulting to `{}`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/client-engagement/entitlementsStorage.test.js
import { emptyEngagement } from '@/common/clientEngagement'

describe('engagement storage carries entitlements', () => {
  it('emptyEngagement includes an empty entitlements map', () => {
    expect(emptyEngagement().entitlements).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/client-engagement/entitlementsStorage.test.js`
Expected: FAIL — `entitlements` is `undefined`.

- [ ] **Step 3: Add `entitlements` to `emptyEngagement` and `readEngagement`**

In `common/clientEngagement.js`, replace `emptyEngagement` (lines 13–15):

```js
export function emptyEngagement() {
  return { people: {}, favorites: [], comments: [], submissions: [], downloads: [], entitlements: {} }
}
```

In `readEngagement` (lines 91–104), add an `entitlements` line to the returned object, right after `downloads`:

```js
      downloads: Array.isArray(data?.downloads) ? data.downloads : [],
      entitlements: data?.entitlements && typeof data.entitlements === 'object' && !Array.isArray(data.entitlements) ? data.entitlements : {},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/client-engagement/entitlementsStorage.test.js`
Expected: PASS.

- [ ] **Step 5: Run the existing engagement suite to confirm no regression**

Run: `npm test -- __tests__/client-engagement/clientEngagement.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add common/clientEngagement.js __tests__/client-engagement/entitlementsStorage.test.js
git commit -m "feat(purchase): carry entitlements map through engagement storage"
```

---

## Task 3: Pure entitlement accounting (access, grant, viewer state)

**Files:**
- Modify: `common/clientPurchase.js`
- Test: `__tests__/common/clientPurchase.accounting.test.js`

**Interfaces:**
- Consumes: engagement data (`{ people, downloads, entitlements }`) from Task 2.
- Produces:
  - `resolveDownloadAccess({ data, email, photoUrl, freeAllowance }) -> { allowed: boolean, reason: 'already-unlocked'|'entitled-all'|'within-ceiling'|'paywall'|'no-email' }`
  - `grantEntitlement(data, { email, credits, orderId }) -> data'` (idempotent by orderId)
  - `viewerPurchaseState({ data, email, freeAllowance }) -> { unlockedUrls: string[], unlockedCount: number, ceiling: number, all: boolean, remaining: number }`

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/clientPurchase.accounting.test.js
import { resolveDownloadAccess, grantEntitlement, viewerPurchaseState } from '@/common/clientPurchase'

// Two devices belong to the same person (same email, different case).
const baseData = () => ({
  people: {
    d1: { name: 'Mia', email: 'Mia@x.com' },
    d2: { name: 'Mia', email: 'mia@x.com' },
    dz: { name: 'Other', email: 'z@x.com' },
  },
  downloads: [
    { photoUrl: 'a.jpg', deviceId: 'd1', quality: 'display', ts: 1 },
    { photoUrl: 'a.jpg', deviceId: 'd1', quality: 'original', ts: 2 }, // same photo, other quality
    { photoUrl: 'b.jpg', deviceId: 'd2', quality: 'display', ts: 3 },  // cross-device, same email
    { photoUrl: 'q.jpg', deviceId: 'dz', quality: 'display', ts: 4 },  // someone else
  ],
  entitlements: {},
})

describe('resolveDownloadAccess', () => {
  it('re-download of an already-unlocked photo is always allowed', () => {
    const r = resolveDownloadAccess({ data: baseData(), email: 'mia@x.com', photoUrl: 'a.jpg', freeAllowance: 0 })
    expect(r).toEqual({ allowed: true, reason: 'already-unlocked' })
  })

  it('counts distinct photos across devices sharing an email (a.jpg + b.jpg = 2 used)', () => {
    // freeAllowance 2, both already used -> a NEW photo is blocked
    const r = resolveDownloadAccess({ data: baseData(), email: 'mia@x.com', photoUrl: 'c.jpg', freeAllowance: 2 })
    expect(r).toEqual({ allowed: false, reason: 'paywall' })
  })

  it('allows a new photo while under the ceiling', () => {
    const r = resolveDownloadAccess({ data: baseData(), email: 'mia@x.com', photoUrl: 'c.jpg', freeAllowance: 3 })
    expect(r).toEqual({ allowed: true, reason: 'within-ceiling' })
  })

  it('purchased credits raise the ceiling', () => {
    const data = baseData()
    data.entitlements['mia@x.com'] = { credits: 5, all: false, orders: ['o1'], updatedAt: 1 }
    const r = resolveDownloadAccess({ data, email: 'mia@x.com', photoUrl: 'c.jpg', freeAllowance: 0 })
    expect(r.allowed).toBe(true) // ceiling 5, 2 used
  })

  it('an "all" entitlement unlocks any new photo', () => {
    const data = baseData()
    data.entitlements['mia@x.com'] = { credits: 0, all: true, orders: ['o1'], updatedAt: 1 }
    const r = resolveDownloadAccess({ data, email: 'mia@x.com', photoUrl: 'zzz.jpg', freeAllowance: 0 })
    expect(r).toEqual({ allowed: true, reason: 'entitled-all' })
  })

  it('blocks when there is no email', () => {
    const r = resolveDownloadAccess({ data: baseData(), email: '', photoUrl: 'c.jpg', freeAllowance: 5 })
    expect(r).toEqual({ allowed: false, reason: 'no-email' })
  })
})

describe('grantEntitlement', () => {
  it('adds numeric credits and records the order', () => {
    const d = grantEntitlement(baseData(), { email: 'Mia@x.com', credits: 10, orderId: 'o1' })
    expect(d.entitlements['mia@x.com']).toMatchObject({ credits: 10, all: false, orders: ['o1'] })
  })

  it('stacks credits across purchases', () => {
    let d = grantEntitlement(baseData(), { email: 'mia@x.com', credits: 10, orderId: 'o1' })
    d = grantEntitlement(d, { email: 'mia@x.com', credits: 10, orderId: 'o2' })
    expect(d.entitlements['mia@x.com'].credits).toBe(20)
  })

  it('an "all" grant overrides the numeric count', () => {
    const d = grantEntitlement(baseData(), { email: 'mia@x.com', credits: 'all', orderId: 'o1' })
    expect(d.entitlements['mia@x.com'].all).toBe(true)
  })

  it('is idempotent by orderId', () => {
    let d = grantEntitlement(baseData(), { email: 'mia@x.com', credits: 10, orderId: 'o1' })
    d = grantEntitlement(d, { email: 'mia@x.com', credits: 10, orderId: 'o1' }) // replay
    expect(d.entitlements['mia@x.com'].credits).toBe(10)
    expect(d.entitlements['mia@x.com'].orders).toEqual(['o1'])
  })
})

describe('viewerPurchaseState', () => {
  it('summarizes unlocked photos + remaining for the viewer', () => {
    const data = baseData()
    data.entitlements['mia@x.com'] = { credits: 5, all: false, orders: ['o1'], updatedAt: 1 }
    const s = viewerPurchaseState({ data, email: 'mia@x.com', freeAllowance: 0 })
    expect(s.unlockedUrls.sort()).toEqual(['a.jpg', 'b.jpg'])
    expect(s.unlockedCount).toBe(2)
    expect(s.ceiling).toBe(5)
    expect(s.all).toBe(false)
    expect(s.remaining).toBe(3)
  })

  it('reports remaining Infinity-like via all=true', () => {
    const data = baseData()
    data.entitlements['mia@x.com'] = { credits: 0, all: true, orders: ['o1'], updatedAt: 1 }
    const s = viewerPurchaseState({ data, email: 'mia@x.com', freeAllowance: 2 })
    expect(s.all).toBe(true)
    expect(s.remaining).toBe(null) // null == unlimited
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/clientPurchase.accounting.test.js`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Add the accounting functions to `common/clientPurchase.js`**

Append to `common/clientPurchase.js`:

```js
function norm(email) {
  return String(email || '').trim().toLowerCase()
}

function deviceIdsForEmail(data, emailLower) {
  const ids = []
  for (const [deviceId, person] of Object.entries(data.people || {})) {
    if (norm(person?.email) === emailLower) ids.push(deviceId)
  }
  return new Set(ids)
}

// Distinct photo URLs this person (all devices sharing the email) has downloaded.
function unlockedUrlSet(data, emailLower) {
  const ids = deviceIdsForEmail(data, emailLower)
  const set = new Set()
  for (const d of (data.downloads || [])) {
    if (ids.has(d.deviceId)) set.add(d.photoUrl)
  }
  return set
}

export function resolveDownloadAccess({ data, email, photoUrl, freeAllowance }) {
  const emailLower = norm(email)
  if (!emailLower) return { allowed: false, reason: 'no-email' }
  const unlocked = unlockedUrlSet(data, emailLower)
  if (unlocked.has(photoUrl)) return { allowed: true, reason: 'already-unlocked' }
  const ent = (data.entitlements || {})[emailLower]
  if (ent?.all) return { allowed: true, reason: 'entitled-all' }
  const ceiling = Math.max(0, Math.floor(freeAllowance || 0)) + (ent?.credits || 0)
  if (unlocked.size < ceiling) return { allowed: true, reason: 'within-ceiling' }
  return { allowed: false, reason: 'paywall' }
}

export function grantEntitlement(data, { email, credits, orderId }) {
  const emailLower = norm(email)
  if (!emailLower) return data
  const entitlements = { ...(data.entitlements || {}) }
  const prev = entitlements[emailLower] || { credits: 0, all: false, orders: [], updatedAt: 0 }
  if (orderId && prev.orders.includes(orderId)) return data // idempotent replay
  const next = {
    credits: prev.credits + (credits === 'all' ? 0 : Math.max(0, Math.floor(credits || 0))),
    all: prev.all || credits === 'all',
    orders: orderId ? [...prev.orders, orderId] : prev.orders,
    updatedAt: Date.now(),
  }
  entitlements[emailLower] = next
  return { ...data, entitlements }
}

export function viewerPurchaseState({ data, email, freeAllowance }) {
  const emailLower = norm(email)
  const unlocked = emailLower ? unlockedUrlSet(data, emailLower) : new Set()
  const ent = emailLower ? (data.entitlements || {})[emailLower] : null
  const all = !!ent?.all
  const ceiling = Math.max(0, Math.floor(freeAllowance || 0)) + (ent?.credits || 0)
  return {
    unlockedUrls: [...unlocked],
    unlockedCount: unlocked.size,
    ceiling,
    all,
    remaining: all ? null : Math.max(0, ceiling - unlocked.size),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/clientPurchase.accounting.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add common/clientPurchase.js __tests__/common/clientPurchase.accounting.test.js
git commit -m "feat(purchase): pure entitlement accounting (access, grant, viewer state)"
```

---

## Task 4: Pure digital money split

**Files:**
- Create: `common/purchase/digitalAmounts.js`
- Test: `__tests__/common/digitalAmounts.test.js`

**Interfaces:**
- Produces: `buildDigitalAmounts({ price, platformFeePct, currency }) -> { retail, platformFee, applicationFee, total, profit, currency }` (all integer cents).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/digitalAmounts.test.js
import { buildDigitalAmounts } from '@/common/purchase/digitalAmounts'

describe('buildDigitalAmounts', () => {
  it('splits a digital sale with no printCost/shipping', () => {
    expect(buildDigitalAmounts({ price: 15000, platformFeePct: 10, currency: 'USD' })).toEqual({
      retail: 15000,
      platformFee: 1500,     // 10% of 15000
      applicationFee: 1500,  // == platformFee (no lab cost)
      total: 15000,          // == retail (no shipping)
      profit: 13500,         // retail - platformFee
      currency: 'USD',
    })
  })

  it('defaults platformFee to 0 and rounds to whole cents', () => {
    const a = buildDigitalAmounts({ price: 4001, platformFeePct: 15 })
    expect(a.platformFee).toBe(600) // round(4001 * 0.15) = round(600.15) = 600
    expect(a.applicationFee).toBe(600)
    expect(a.total).toBe(4001)
    expect(a.profit).toBe(3401)
    expect(a.currency).toBe('USD')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/digitalAmounts.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `common/purchase/digitalAmounts.js`**

```js
// common/purchase/digitalAmounts.js
// Pure: split a digital (download) sale into Stripe amounts. Unlike a print,
// there is no lab cost and no shipping, so applicationFee == platformFee and
// total == retail. All values are integer cents.
export function buildDigitalAmounts({ price, platformFeePct = 0, currency = 'USD' }) {
  const retail = Math.max(0, Math.round(price))
  const platformFee = Math.round(retail * (Number(platformFeePct) || 0) / 100)
  return {
    retail,
    platformFee,
    applicationFee: platformFee,
    total: retail,
    profit: retail - platformFee,
    currency,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/digitalAmounts.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/purchase/digitalAmounts.js __tests__/common/digitalAmounts.test.js
git commit -m "feat(purchase): pure digital money split (buildDigitalAmounts)"
```

---

## Task 5: Digital Stripe Checkout session params

**Files:**
- Modify: `common/stripe/checkout.js`
- Test: `__tests__/common/digitalCheckout.test.js`

**Interfaces:**
- Consumes: a digital order `{ id, userId, pageId, label, amounts: { retail, applicationFee, currency }, buyer: { email } }`.
- Produces: `buildDigitalCheckoutSessionParams({ order, successUrl, cancelUrl }) -> stripeSessionParams`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/digitalCheckout.test.js
import { buildDigitalCheckoutSessionParams } from '@/common/stripe/checkout'

const order = {
  id: 'ord_1', userId: 'u1', pageId: 'p1', label: 'Entire gallery',
  amounts: { retail: 15000, applicationFee: 1500, currency: 'USD' },
  buyer: { email: 'mia@x.com' },
}

it('builds a single-line-item digital session with the platform fee + metadata', () => {
  const params = buildDigitalCheckoutSessionParams({
    order, successUrl: 'https://site/gallery?purchase=success', cancelUrl: 'https://site/gallery',
  })
  expect(params.mode).toBe('payment')
  expect(params.line_items).toEqual([
    { price_data: { currency: 'usd', unit_amount: 15000, product_data: { name: 'Entire gallery' } }, quantity: 1 },
  ])
  expect(params.payment_intent_data).toEqual({ application_fee_amount: 1500 })
  expect(params.customer_email).toBe('mia@x.com')
  expect(params.metadata).toEqual({ orderId: 'ord_1', userId: 'u1', pageId: 'p1', email: 'mia@x.com', type: 'digital' })
  expect(params.success_url).toBe('https://site/gallery?purchase=success')
  expect(params.cancel_url).toBe('https://site/gallery')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/digitalCheckout.test.js`
Expected: FAIL — `buildDigitalCheckoutSessionParams` not exported.

- [ ] **Step 3: Add the function to `common/stripe/checkout.js`**

Append to `common/stripe/checkout.js`:

```js
// Pure: build the Stripe Checkout Session params for a digital (download)
// purchase. One line item, no shipping. The connected account id is passed by
// the route as a request option, not here. success/cancel URLs are fully
// formed by the route (they already carry any query the return handler needs).
export function buildDigitalCheckoutSessionParams({ order, successUrl, cancelUrl }) {
  const { amounts, id, userId, pageId, label, buyer } = order
  const currency = (amounts.currency || 'USD').toLowerCase()
  return {
    mode: 'payment',
    line_items: [
      { price_data: { currency, unit_amount: amounts.retail, product_data: { name: label } }, quantity: 1 },
    ],
    payment_intent_data: { application_fee_amount: amounts.applicationFee },
    customer_email: buyer?.email,
    metadata: { orderId: id, userId, pageId, email: buyer?.email, type: 'digital' },
    success_url: successUrl,
    cancel_url: cancelUrl,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/digitalCheckout.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/stripe/checkout.js __tests__/common/digitalCheckout.test.js
git commit -m "feat(purchase): digital Stripe Checkout session params"
```

---

## Task 6: Enforce the paywall in the download route

**Files:**
- Modify: `pages/api/client/download.js`
- Test: `__tests__/api/download.paywall.test.js`

**Interfaces:**
- Consumes: `resolveDownloadAccess` (Task 3), `page.clientFeatures.purchase` (Task 1).
- Behavior: when `purchase.enabled`, a request for a new photo past the ceiling returns **402** and streams nothing; otherwise unchanged.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/api/download.paywall.test.js
jest.mock('../../common/userProfile', () => ({ lookupUserByUsername: jest.fn(async () => ({ userId: 'u1' })) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn() }))
jest.mock('../../common/clientEngagement', () => ({
  readEngagement: jest.fn(),
  writeEngagement: jest.fn(async () => {}),
  applyEngagementAction: jest.fn((d) => d),
}))
jest.mock('../../common/adminConfig', () => ({ readLibraryConfig: jest.fn(async () => ({ assets: {} })) }))
jest.mock('../../common/imageUtils', () => ({ getSizedUrl: (u) => u }))

import { readSiteConfig } from '../../common/siteConfig'
import { readEngagement } from '../../common/clientEngagement'
import handler from '../../pages/api/client/download'

const PHOTO = 'https://cdn.example.com/photos/new.jpg'
function res() {
  return { statusCode: 200, body: null, headers: {}, status(c){this.statusCode=c;return this}, json(b){this.body=b;return this}, setHeader(k,v){this.headers[k]=v}, send(b){this.body=b;return this} }
}
function req() {
  return { method: 'GET', query: { username: 'ada', pageId: 'p1', photoUrl: PHOTO, quality: 'display', deviceId: 'd1' } }
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.R2_PUBLIC_URL = 'https://cdn.example.com'
})

it('returns 402 for a new photo past the ceiling when purchase is enabled', async () => {
  readSiteConfig.mockResolvedValue({ pages: [{ id: 'p1', slug: 'p1', clientFeatures: {
    enabled: true, downloads: { enabled: true }, purchase: { enabled: true, freeAllowance: 0, packages: [] },
  } }] })
  readEngagement.mockResolvedValue({ people: { d1: { name: 'Mia', email: 'mia@x.com' } }, downloads: [], entitlements: {} })
  const r = res()
  await handler(req(), r)
  expect(r.statusCode).toBe(402)
})

it('serves a re-download of an already-unlocked photo even past the ceiling', async () => {
  readSiteConfig.mockResolvedValue({ pages: [{ id: 'p1', slug: 'p1', clientFeatures: {
    enabled: true, downloads: { enabled: true }, purchase: { enabled: true, freeAllowance: 0, packages: [] },
  } }] })
  readEngagement.mockResolvedValue({
    people: { d1: { name: 'Mia', email: 'mia@x.com' } },
    downloads: [{ photoUrl: PHOTO, deviceId: 'd1', quality: 'display', ts: 1 }],
    entitlements: {},
  })
  global.fetch = jest.fn(async () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => new ArrayBuffer(3) }))
  const r = res()
  await handler(req(), r)
  expect(r.statusCode).toBe(200)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/api/download.paywall.test.js`
Expected: FAIL — first test gets 200 (no gate yet).

- [ ] **Step 3: Add the gate to `pages/api/client/download.js`**

Add the import near the other imports (after the `clientEngagement` import on line 5):

```js
import { resolveDownloadAccess } from '../../../common/clientPurchase'
```

Then, in the handler, immediately **after** the email check (after line 39, `if (!person?.email) return res.status(403)...`) and **before** the "Log download" block, insert:

```js
    // Paywall: when purchase is enabled, a NEW photo past the ceiling is blocked.
    const purchase = page.clientFeatures.purchase
    if (purchase?.enabled) {
      const access = resolveDownloadAccess({
        data,
        email: person.email,
        photoUrl: rawPhotoUrl,
        freeAllowance: purchase.freeAllowance || 0,
      })
      if (!access.allowed) {
        return res.status(402).json({ error: 'payment_required', reason: access.reason })
      }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/api/download.paywall.test.js`
Expected: PASS (both tests).

- [ ] **Step 5: Confirm the existing download behavior still holds**

Run: `npm test -- __tests__/api`
Expected: PASS (no regression in other download/api tests).

- [ ] **Step 6: Commit**

```bash
git add pages/api/client/download.js __tests__/api/download.paywall.test.js
git commit -m "feat(purchase): enforce download paywall (402 past the ceiling)"
```

---

## Task 7: Digital checkout route

**Files:**
- Create: `pages/api/client/purchase/checkout.js`
- Test: `__tests__/api/purchaseCheckout.test.js`

**Interfaces:**
- Consumes: `buildDigitalAmounts` (Task 4), `buildDigitalCheckoutSessionParams` (Task 5), `normalizePrintStore` + `saveOrder` + `getStripe`.
- Request body: `{ username, pageId, packageId, buyer: { email, name }, returnPath }`.
- Produces order shape: `{ id, userId, type: 'digital', status: 'pending', pageId, packageId, credits, label, buyer, amounts, stripe: { sessionId, paymentIntentId: null, connectedAccountId }, createdAt }`.
- Response: `{ url }`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/api/purchaseCheckout.test.js
jest.mock('../../common/userProfile', () => ({ lookupUserByUsername: jest.fn(async () => ({ userId: 'u1' })) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(), normalizePrintStore: (c) => c }))
jest.mock('../../common/orders', () => ({ newOrderId: () => 'ord_test', saveOrder: jest.fn(async (_u, o) => o) }))
const create = jest.fn(async () => ({ id: 'cs_1', url: 'https://stripe/checkout/cs_1' }))
jest.mock('../../common/stripe/client', () => ({ getStripe: () => ({ checkout: { sessions: { create } } }) }))

import { readSiteConfig } from '../../common/siteConfig'
import { saveOrder } from '../../common/orders'
import handler from '../../pages/api/client/purchase/checkout'

function res() {
  return { statusCode: 200, body: null, status(c){this.statusCode=c;return this}, json(b){this.body=b;return this} }
}
function req(body) {
  return { method: 'POST', headers: { origin: 'https://ada.sepia.photo' }, body }
}

const STORE = {
  printStore: { enabled: true, chargesEnabled: true, stripeConnectAccountId: 'acct_1', platformFeePct: 10, currency: 'USD' },
  pages: [{ id: 'p1', slug: 'gallery', clientFeatures: { enabled: true, downloads: { enabled: true }, purchase: {
    enabled: true, freeAllowance: 2, currency: 'USD',
    packages: [{ id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 }],
  } } }],
}

beforeEach(() => { jest.clearAllMocks(); delete process.env.NEXT_PUBLIC_PLATFORM_FEE_PCT; delete process.env.PLATFORM_FEE_PCT })

it('creates a pending digital order and a Stripe session on the connected account', async () => {
  readSiteConfig.mockResolvedValue(STORE)
  const r = res()
  await handler(req({ username: 'ada', pageId: 'p1', packageId: 'pkg_all', buyer: { email: 'mia@x.com', name: 'Mia' }, returnPath: '/gallery' }), r)
  expect(r.statusCode).toBe(200)
  expect(r.body).toEqual({ url: 'https://stripe/checkout/cs_1' })
  // Session created with the connected account option
  expect(create).toHaveBeenCalledWith(expect.any(Object), { stripeAccount: 'acct_1' })
  // Order saved as a pending digital order with the right credits + fee
  const saved = saveOrder.mock.calls[0][1]
  expect(saved).toMatchObject({
    type: 'digital', status: 'pending', pageId: 'p1', packageId: 'pkg_all',
    credits: 'all', label: 'Entire gallery',
    amounts: { retail: 15000, platformFee: 1500, applicationFee: 1500, total: 15000, currency: 'USD' },
  })
})

it('rejects when the store is not ready for checkout', async () => {
  readSiteConfig.mockResolvedValue({ ...STORE, printStore: { ...STORE.printStore, chargesEnabled: false } })
  const r = res()
  await handler(req({ username: 'ada', pageId: 'p1', packageId: 'pkg_all', buyer: { email: 'mia@x.com' }, returnPath: '/gallery' }), r)
  expect(r.statusCode).toBe(403)
})

it('rejects an unknown package', async () => {
  readSiteConfig.mockResolvedValue(STORE)
  const r = res()
  await handler(req({ username: 'ada', pageId: 'p1', packageId: 'nope', buyer: { email: 'mia@x.com' }, returnPath: '/gallery' }), r)
  expect(r.statusCode).toBe(400)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/api/purchaseCheckout.test.js`
Expected: FAIL — route module not found.

- [ ] **Step 3: Create `pages/api/client/purchase/checkout.js`**

```js
// pages/api/client/purchase/checkout.js
import { lookupUserByUsername } from '../../../../common/userProfile'
import { readSiteConfig, normalizePrintStore } from '../../../../common/siteConfig'
import { newOrderId, saveOrder } from '../../../../common/orders'
import { getStripe } from '../../../../common/stripe/client'
import { buildDigitalAmounts } from '../../../../common/purchase/digitalAmounts'
import { buildDigitalCheckoutSessionParams } from '../../../../common/stripe/checkout'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { username, pageId, packageId, buyer, returnPath } = req.body || {}
    if (!username || !pageId || !packageId || !buyer?.email) {
      return res.status(400).json({ error: 'username, pageId, packageId, buyer.email required' })
    }
    const lookup = await lookupUserByUsername(username)
    if (!lookup) return res.status(404).json({ error: 'not found' })

    const config = normalizePrintStore((await readSiteConfig(lookup.userId)) || {})
    const ps = config.printStore
    if (!ps.enabled || !ps.chargesEnabled || !ps.stripeConnectAccountId) {
      return res.status(403).json({ error: 'store not ready for checkout' })
    }

    const page = (config.pages || []).find(p => p.id === pageId || p.slug === pageId)
    const purchase = page?.clientFeatures?.purchase
    if (!page?.clientFeatures?.enabled || !page?.clientFeatures?.downloads?.enabled || !purchase?.enabled) {
      return res.status(403).json({ error: 'purchase not enabled' })
    }
    const pkg = (purchase.packages || []).find(p => p.id === packageId)
    if (!pkg) return res.status(400).json({ error: 'unknown package' })

    const platformFeePct = Number(
      process.env.NEXT_PUBLIC_PLATFORM_FEE_PCT ?? process.env.PLATFORM_FEE_PCT ?? ps.platformFeePct ?? 0
    ) || 0
    const amounts = buildDigitalAmounts({ price: pkg.price, platformFeePct, currency: purchase.currency || ps.currency })

    const order = {
      id: newOrderId(),
      userId: lookup.userId,
      type: 'digital',
      status: 'pending',
      pageId: page.id,
      packageId: pkg.id,
      credits: pkg.credits,
      label: pkg.label,
      buyer: { email: String(buyer.email).trim(), name: buyer.name || '' },
      amounts,
      stripe: { sessionId: null, paymentIntentId: null, connectedAccountId: ps.stripeConnectAccountId },
      createdAt: new Date().toISOString(),
    }

    // Return the buyer to the gallery they were on. returnPath is a same-site
    // path supplied by the client; only accept a leading-slash path.
    const base = req.headers.origin || ''
    const safePath = typeof returnPath === 'string' && returnPath.startsWith('/') ? returnPath.split('?')[0] : '/'
    const session = await getStripe().checkout.sessions.create(
      buildDigitalCheckoutSessionParams({
        order,
        successUrl: `${base}${safePath}?purchase=success`,
        cancelUrl: `${base}${safePath}`,
      }),
      { stripeAccount: ps.stripeConnectAccountId },
    )

    order.stripe.sessionId = session.id
    await saveOrder(lookup.userId, order)
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[client/purchase/checkout]', err)
    return res.status(500).json({ error: 'Checkout failed' })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/api/purchaseCheckout.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add pages/api/client/purchase/checkout.js __tests__/api/purchaseCheckout.test.js
git commit -m "feat(purchase): digital checkout route (order + Stripe session)"
```

---

## Task 8: Grant credits from the webhook

**Files:**
- Modify: `pages/api/stripe/webhook.js`
- Test: `__tests__/api/stripe-webhook-digital.test.js`

**Interfaces:**
- Consumes: `readEngagement`/`writeEngagement` + `grantEntitlement` (Task 3).
- Behavior: a paid `type: 'digital'` order marks paid, then grants `order.credits` to `order.buyer.email` in the page's client-data. Idempotent. Print orders are unchanged.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/api/stripe-webhook-digital.test.js
const constructEvent = jest.fn()
jest.mock('../../common/stripe/client', () => ({ getStripe: () => ({ webhooks: { constructEvent } }) }))
jest.mock('../../common/orders', () => ({ getOrder: jest.fn(), saveOrder: jest.fn(async (_u, o) => o) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(async () => ({ siteName: 'Ada' })) }))
jest.mock('../../common/userProfile', () => ({ readUserProfile: jest.fn(async () => ({ email: 'p@x.com' })) }))
jest.mock('../../common/fulfillment/placeOrderForPaidOrder', () => ({ placeOrderForPaidOrder: jest.fn() }))
const readEngagement = jest.fn()
const writeEngagement = jest.fn(async () => {})
jest.mock('../../common/clientEngagement', () => ({ readEngagement: (...a) => readEngagement(...a), writeEngagement: (...a) => writeEngagement(...a) }))

import { getOrder } from '../../common/orders'
import { placeOrderForPaidOrder } from '../../common/fulfillment/placeOrderForPaidOrder'
import handler from '../../pages/api/stripe/webhook'

function res() { return { statusCode: 200, body: null, status(c){this.statusCode=c;return this}, json(b){this.body=b;return this} } }
async function reqObj() { const r = { method: 'POST', headers: { 'stripe-signature': 'sig' } }; r[Symbol.asyncIterator] = async function*(){ yield Buffer.from('{}') }; return r }

const OLD = process.env
beforeEach(() => { jest.clearAllMocks(); process.env = { ...OLD, STRIPE_WEBHOOK_SECRET: 'whsec' } })
afterEach(() => { process.env = OLD })

it('grants credits for a paid digital order and does not place a lab order', async () => {
  constructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: {
    metadata: { orderId: 'ord_d', userId: 'u1', type: 'digital' }, payment_intent: 'pi_9',
  } } })
  getOrder.mockResolvedValue({
    id: 'ord_d', userId: 'u1', type: 'digital', status: 'pending', pageId: 'p1',
    credits: 10, buyer: { email: 'Mia@x.com' },
  })
  readEngagement.mockResolvedValue({ people: {}, downloads: [], entitlements: {} })
  const r = res()
  await handler(await reqObj(), r)
  expect(r.statusCode).toBe(200)
  expect(placeOrderForPaidOrder).not.toHaveBeenCalled()
  const written = writeEngagement.mock.calls[0]
  expect(written[0]).toBe('u1')
  expect(written[1]).toBe('p1')
  expect(written[2].entitlements['mia@x.com']).toMatchObject({ credits: 10, orders: ['ord_d'] })
})

it('ignores an already-paid digital order (idempotent)', async () => {
  constructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: {
    metadata: { orderId: 'ord_d', userId: 'u1', type: 'digital' },
  } } })
  getOrder.mockResolvedValue({ id: 'ord_d', userId: 'u1', type: 'digital', status: 'paid', pageId: 'p1', credits: 10, buyer: { email: 'mia@x.com' } })
  const r = res()
  await handler(await reqObj(), r)
  expect(r.statusCode).toBe(200)
  expect(writeEngagement).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/api/stripe-webhook-digital.test.js`
Expected: FAIL — no digital branch; `writeEngagement` never called.

- [ ] **Step 3: Add the digital branch to `pages/api/stripe/webhook.js`**

Add these imports after the existing imports (after line 6):

```js
import { readEngagement, writeEngagement } from '../../../common/clientEngagement'
import { grantEntitlement } from '../../../common/clientPurchase'
```

Replace the body of the `if (order && order.status === 'pending')` block (lines 44–62) so it branches on order type. The full replacement for that block:

```js
        if (order && order.status === 'pending') {
          order.status = 'paid'
          if (!order.stripe) order.stripe = {}
          order.stripe.paymentIntentId = session.payment_intent || null
          await saveOrder(userId, order)

          if (order.type === 'digital') {
            // Digital fulfillment = grant download credits to the buyer's email.
            const data = await readEngagement(userId, order.pageId)
            const next = grantEntitlement(data, {
              email: order.buyer?.email,
              credits: order.credits,
              orderId: order.id,
            })
            await writeEngagement(userId, order.pageId, next)
          } else {
            // Print fulfillment: notify the photographer, then place the lab order.
            const [config, profile] = await Promise.all([
              readSiteConfig(userId).catch(() => null),
              readUserProfile(userId).catch(() => null),
            ])
            const photographerEmail =
              config?.clientDefaults?.notificationEmail ||
              config?.contact?.email ||
              profile?.email ||
              null
            const siteName = config?.siteName || 'your portfolio'
            await placeOrderForPaidOrder(order, { photographerEmail, siteName })
          }
        }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/api/stripe-webhook-digital.test.js`
Expected: PASS (both tests).

- [ ] **Step 5: Confirm the print webhook path still passes**

Run: `npm test -- __tests__/api/stripe-webhook.test.js`
Expected: PASS (print fulfillment unchanged).

- [ ] **Step 6: Commit**

```bash
git add pages/api/stripe/webhook.js __tests__/api/stripe-webhook-digital.test.js
git commit -m "feat(purchase): grant download credits from the Stripe webhook"
```

---

## Task 9: Viewer purchase state on the engagement GET

**Files:**
- Modify: `pages/api/client/engagement.js`
- Test: `__tests__/client-engagement/engagementPurchaseState.route.test.js`

**Interfaces:**
- Consumes: `viewerPurchaseState` (Task 3).
- Behavior: `GET /api/client/engagement?...&deviceId=D` includes a `purchase` object when the page has purchase enabled and the device resolves to an email: `{ unlockedUrls, unlockedCount, ceiling, all, remaining, freeAllowance }`. Emails are never returned.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/client-engagement/engagementPurchaseState.route.test.js
jest.mock('../../common/userProfile', () => ({ lookupUserByUsername: jest.fn(async () => ({ userId: 'u1' })) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn() }))
const readEngagement = jest.fn()
jest.mock('../../common/clientEngagement', () => ({
  readEngagement: (...a) => readEngagement(...a),
  writeEngagement: jest.fn(),
  applyEngagementAction: jest.fn(),
}))
jest.mock('../../common/email/mailer', () => ({ sendMail: jest.fn() }))

import { readSiteConfig } from '../../common/siteConfig'
import handler from '../../pages/api/client/engagement'

function res() { return { statusCode: 200, body: null, status(c){this.statusCode=c;return this}, json(b){this.body=b;return this} } }

it('returns the viewer purchase state and never leaks emails', async () => {
  readSiteConfig.mockResolvedValue({ pages: [{ id: 'p1', slug: 'p1', clientFeatures: {
    enabled: true, downloads: { enabled: true }, purchase: { enabled: true, freeAllowance: 2, packages: [] },
  } }] })
  readEngagement.mockResolvedValue({
    people: { d1: { name: 'Mia', email: 'mia@x.com' } },
    favorites: [], comments: [], submissions: [],
    downloads: [{ photoUrl: 'a.jpg', deviceId: 'd1', quality: 'display', ts: 1 }],
    entitlements: { 'mia@x.com': { credits: 3, all: false, orders: ['o1'], updatedAt: 1 } },
  })
  const r = res()
  await handler({ method: 'GET', query: { username: 'ada', pageId: 'p1', deviceId: 'd1' } }, r)
  expect(r.statusCode).toBe(200)
  expect(r.body.purchase).toMatchObject({ unlockedCount: 1, ceiling: 5, all: false, remaining: 4, freeAllowance: 2 })
  expect(r.body.purchase.unlockedUrls).toEqual(['a.jpg'])
  // no email anywhere in the people payload
  expect(JSON.stringify(r.body.people)).not.toContain('mia@x.com')
})

it('omits purchase state when the feature is off', async () => {
  readSiteConfig.mockResolvedValue({ pages: [{ id: 'p1', slug: 'p1', clientFeatures: { enabled: true, favorites: { enabled: true } } }] })
  readEngagement.mockResolvedValue({ people: {}, favorites: [], comments: [], submissions: [], downloads: [], entitlements: {} })
  const r = res()
  await handler({ method: 'GET', query: { username: 'ada', pageId: 'p1', deviceId: 'd1' } }, r)
  expect(r.body.purchase).toBeUndefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/client-engagement/engagementPurchaseState.route.test.js`
Expected: FAIL — `purchase` missing from the GET response.

- [ ] **Step 3: Extend the GET handler in `pages/api/client/engagement.js`**

Add the import near the top (after the `clientEngagement` import on line 7):

```js
import { viewerPurchaseState } from '../../../common/clientPurchase'
```

In the `GET` branch, replace the return (line 46) with a version that appends purchase state when enabled:

```js
      const payload = { people, favorites: data.favorites, comments: data.comments, submissions: data.submissions }

      const purchase = ctx.page.clientFeatures?.purchase
      if (purchase?.enabled) {
        const { deviceId } = req.query
        const email = deviceId ? data.people?.[deviceId]?.email : null
        const state = viewerPurchaseState({ data, email, freeAllowance: purchase.freeAllowance || 0 })
        payload.purchase = { ...state, freeAllowance: purchase.freeAllowance || 0 }
      }

      return res.status(200).json(payload)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/client-engagement/engagementPurchaseState.route.test.js`
Expected: PASS (both tests).

- [ ] **Step 5: Confirm the existing engagement route tests still pass**

Run: `npm test -- __tests__/client-engagement/engagement.route.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pages/api/client/engagement.js __tests__/client-engagement/engagementPurchaseState.route.test.js
git commit -m "feat(purchase): expose viewer purchase state on engagement GET"
```

---

## Task 10: Expose `paymentsReady` and thread it to the provider

**Files:**
- Modify: `common/print/publicPrint.js:16-24`
- Modify: `pages/sites/[username]/[slug].js:62-73, 133-139`
- Test: `__tests__/common/publicPrintStore.paymentsReady.test.js`

**Interfaces:**
- Produces: `publicPrintStore(siteConfig).paymentsReady: boolean` — true when the connected account can accept charges. It never leaks the account id.
- The public page passes `paymentsReady` (from `printStore`) into `ClientEngagementProvider`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/publicPrintStore.paymentsReady.test.js
import { publicPrintStore } from '@/common/print/publicPrint'

it('paymentsReady is true only when charges are enabled with a connected account', () => {
  expect(publicPrintStore({ printStore: { chargesEnabled: true, stripeConnectAccountId: 'acct_1' } }).paymentsReady).toBe(true)
  expect(publicPrintStore({ printStore: { chargesEnabled: false, stripeConnectAccountId: 'acct_1' } }).paymentsReady).toBe(false)
  expect(publicPrintStore({ printStore: { chargesEnabled: true } }).paymentsReady).toBe(false)
})

it('never leaks the connected account id', () => {
  const out = publicPrintStore({ printStore: { chargesEnabled: true, stripeConnectAccountId: 'acct_secret' } })
  expect(JSON.stringify(out)).not.toContain('acct_secret')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/publicPrintStore.paymentsReady.test.js`
Expected: FAIL — `paymentsReady` undefined.

- [ ] **Step 3: Add `paymentsReady` to `publicPrintStore`**

In `common/print/publicPrint.js`, replace `publicPrintStore` (lines 16–24):

```js
export function publicPrintStore(siteConfig) {
  const ps = (siteConfig && siteConfig.printStore) || {}
  return {
    enabled: !!ps.enabled,
    markup: typeof ps.markup === 'number' && ps.markup > 0 ? ps.markup : 3,
    currency: ps.currency || 'USD',
    showPriceOnImage: !!ps.showPriceOnImage,
    paymentsReady: !!(ps.chargesEnabled && ps.stripeConnectAccountId),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/publicPrintStore.paymentsReady.test.js`
Expected: PASS.

- [ ] **Step 5: Pass `paymentsReady` into the provider**

In `pages/sites/[username]/[slug].js`, add `paymentsReady` to the `ClientEngagementProvider` props (the element starting line 133):

```js
        <ClientEngagementProvider
          username={username}
          pageId={page.id}
          pageSlug={page.slug || page.id}
          clientFeatures={page.clientFeatures}
          paymentsReady={printStore.paymentsReady}
          branding={{ siteName: siteConfig.siteName, logo: siteConfig.logoType === 'image' ? siteConfig.logo : '', logoFont: siteConfig.logoFont || 'theme' }}
        >
```

- [ ] **Step 6: Run test to confirm no regression in print public tests**

Run: `npm test -- __tests__/common`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add common/print/publicPrint.js pages/sites/[username]/[slug].js __tests__/common/publicPrintStore.paymentsReady.test.js
git commit -m "feat(purchase): expose paymentsReady and thread it to the client provider"
```

---

## Task 11: Client context purchase state + PurchaseSheet + gated download

**Files:**
- Modify: `components/image-displays/engagement/ClientEngagementContext.js`
- Create: `components/image-displays/engagement/PurchaseSheet.js`
- Test: `__tests__/client-engagement/purchaseSheet.test.js`

**Interfaces:**
- Consumes: the `purchase` object from the engagement GET (Task 9), `paymentsReady` prop (Task 10).
- Produces (on ctx): `features.purchase`, `paymentsReady`, `packages`, `purchaseCurrency`, `purchaseState`, `isUnlocked(url)`, `canUnlockMore()`, `openPurchase()`, `startCheckout(packageId)`. `openDownload` gates on entitlement.

- [ ] **Step 1: Write the failing test (PurchaseSheet renders packages and starts checkout)**

```js
// __tests__/client-engagement/purchaseSheet.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PurchaseSheet from '@/components/image-displays/engagement/PurchaseSheet'
import * as CtxMod from '@/components/image-displays/engagement/ClientEngagementContext'

function withCtx(value) {
  jest.spyOn(CtxMod, 'useClientEngagement').mockReturnValue(value)
}

afterEach(() => jest.restoreAllMocks())

it('lists packages with formatted prices and calls startCheckout', () => {
  const startCheckout = jest.fn()
  withCtx({
    purchaseCurrency: 'USD',
    purchaseState: { unlockedCount: 2, ceiling: 2, all: false, remaining: 0 },
    packages: [
      { id: 'pkg_a', label: '10 more photos', credits: 10, price: 4000 },
      { id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 },
    ],
    startCheckout,
  })
  render(<PurchaseSheet onClose={() => {}} />)
  expect(screen.getByText('10 more photos')).toBeInTheDocument()
  expect(screen.getByText('$40.00')).toBeInTheDocument()
  expect(screen.getByText('$150.00')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Entire gallery'))
  expect(startCheckout).toHaveBeenCalledWith('pkg_all')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/client-engagement/purchaseSheet.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/image-displays/engagement/PurchaseSheet.js`**

```js
// components/image-displays/engagement/PurchaseSheet.js
import { useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'

function formatPrice(cents, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100)
  } catch {
    return `${((cents || 0) / 100).toFixed(2)} ${currency || 'USD'}`
  }
}

export default function PurchaseSheet({ onClose }) {
  const ctx = useClientEngagement()
  const [loading, setLoading] = useState(null)
  if (!ctx) return null

  const { purchaseState, packages, purchaseCurrency } = ctx
  const header = purchaseState?.all
    ? 'You have the full gallery'
    : `You've unlocked ${purchaseState?.unlockedCount ?? 0} of ${purchaseState?.ceiling ?? 0}`

  function buy(id) {
    setLoading(id)
    Promise.resolve(ctx.startCheckout(id)).catch(() => setLoading(null))
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,14,8,0.38)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fdf9f4', borderRadius: 14, border: '1px solid rgba(160,140,110,0.22)', boxShadow: '0 12px 48px rgba(20,14,8,0.28)', padding: 24, width: 'calc(100% - 40px)', maxWidth: 340 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416', letterSpacing: '-0.01em' }}>Download more photos</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#a8967a', lineHeight: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ fontSize: 12, color: '#a8967a', marginBottom: 16 }}>{header}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {(packages || []).map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              disabled={!!loading}
              onClick={() => buy(pkg.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(44,36,22,0.03)', border: '1px solid rgba(160,140,110,0.22)', borderRadius: 9, cursor: loading ? 'default' : 'pointer', width: '100%' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(44,36,22,0.07)' }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(44,36,22,0.03)' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#2c2416' }}>{pkg.label}</div>
                <div style={{ fontSize: 11, color: '#a8967a', marginTop: 2 }}>
                  {pkg.credits === 'all' ? 'Everything in this gallery' : `${pkg.credits} more photo${pkg.credits === 1 ? '' : 's'}`}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2416' }}>
                {loading === pkg.id ? 'Redirecting…' : formatPrice(pkg.price, purchaseCurrency)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/client-engagement/purchaseSheet.test.js`
Expected: PASS.

- [ ] **Step 5: Wire purchase into `ClientEngagementContext.js`**

Make these edits to `components/image-displays/engagement/ClientEngagementContext.js`:

**(a)** Add the import after the `DownloadSheet` import (line 10):

```js
import PurchaseSheet from './PurchaseSheet'
```

**(b)** Change the provider signature (line 15) to accept `paymentsReady`:

```js
export function ClientEngagementProvider({ username, pageId, pageSlug, clientFeatures, paymentsReady, branding, children }) {
```

**(c)** Add a `purchase` flag to the `features` memo (inside the object at lines 17–25):

```js
    purchase: !!(enabled && clientFeatures?.purchase?.enabled && paymentsReady),
```

**(d)** Add purchase config + state near the other `useState` calls (after line 32):

```js
  const purchaseCfg = clientFeatures?.purchase || {}
  const [purchaseState, setPurchaseState] = useState(null) // { unlockedUrls, unlockedCount, ceiling, all, remaining }
  const [purchaseOpen, setPurchaseOpen] = useState(false)
```

**(e)** Capture purchase state from the engagement GET. Replace the fetch effect (lines 36–45) so it sends `deviceId` and stores `purchase`:

```js
  const interactive = features.favorites || features.comments || features.downloads || features.purchase
  const refetch = useCallback(() => {
    const id = getClientIdentity(username)
    const qs = new URLSearchParams({ username, pageId })
    if (id?.deviceId) qs.set('deviceId', id.deviceId)
    return fetch(`/api/client/engagement?${qs}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setData(d); if (d.purchase) setPurchaseState(d.purchase) } })
      .catch(() => {})
  }, [username, pageId])

  useEffect(() => {
    if (!interactive) return
    let alive = true
    refetch().then(() => { if (!alive) return })
    return () => { alive = false }
  }, [interactive, refetch])
```

**(f)** On mount, if the URL carries `?purchase=success`, poll briefly for the granted credits. Add this effect after the effect above:

```js
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!new URLSearchParams(window.location.search).get('purchase')) return
    let n = 0
    const tick = () => { refetch(); if (++n < 5) setTimeout(tick, 2000) }
    tick()
  }, [refetch])
```

**(g)** Add purchase helpers + gated `openDownload` to the `ctx` memo (lines 116–146). Add these entries inside the returned object, and replace the existing `openDownload`:

```js
    paymentsReady: !!paymentsReady,
    packages: purchaseCfg.packages || [],
    purchaseCurrency: purchaseCfg.currency || 'USD',
    purchaseState,
    isUnlocked: (url) => !!purchaseState && (purchaseState.all || purchaseState.unlockedUrls?.includes(url)),
    canUnlockMore: () => !!purchaseState && (purchaseState.all || purchaseState.remaining > 0),
    openPurchase: () => setPurchaseOpen(true),
    startCheckout: async (packageId) => {
      const id = getClientIdentity(username)
      const res = await fetch('/api/client/purchase/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pageId, packageId, buyer: { email: id?.email, name: id?.name }, returnPath: window.location.pathname }),
      })
      const body = await res.json().catch(() => null)
      if (body?.url) window.location.href = body.url
    },
    openDownload: (photoUrl) => runOrPrompt('download', () => {
      if (features.purchase) {
        const unlocked = !!purchaseState && (purchaseState.all || purchaseState.unlockedUrls?.includes(photoUrl))
        const canMore = !!purchaseState && (purchaseState.all || purchaseState.remaining > 0)
        if (!unlocked && !canMore) { setPurchaseOpen(true); return }
      }
      setDownloadUrl(photoUrl)
    }),
```

Also add `purchaseState`, `purchaseOpen`, `paymentsReady`, `purchaseCfg` to the `useMemo` dependency array on line 146.

**(h)** Render the sheet. In the returned JSX (after the `DownloadSheet` line 168), add:

```js
      {purchaseOpen && <PurchaseSheet onClose={() => setPurchaseOpen(false)} />}
```

- [ ] **Step 6: Run the full engagement + purchase suite**

Run: `npm test -- __tests__/client-engagement`
Expected: PASS (existing context tests + new purchase sheet test).

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/engagement/ClientEngagementContext.js components/image-displays/engagement/PurchaseSheet.js __tests__/client-engagement/purchaseSheet.test.js
git commit -m "feat(purchase): client purchase state, PurchaseSheet, and gated downloads"
```

---

## Task 12: Persistent "Get the full set" entry point

**Files:**
- Create: `components/image-displays/engagement/PurchasePrompt.js`
- Modify: `components/image-displays/engagement/ClientEngagementContext.js`
- Test: `__tests__/client-engagement/purchasePrompt.test.js`

**Interfaces:**
- Consumes: ctx `features.purchase`, `purchaseState`, `packages`, `openPurchase`.
- Behavior: a floating button that opens the PurchaseSheet. Shown only when purchase is active, there are packages, and the viewer is not already fully entitled (`purchaseState.all !== true`). This is also the "download all" affordance.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/client-engagement/purchasePrompt.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PurchasePrompt from '@/components/image-displays/engagement/PurchasePrompt'
import * as CtxMod from '@/components/image-displays/engagement/ClientEngagementContext'

const base = (over) => ({
  features: { purchase: true },
  packages: [{ id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 }],
  purchaseState: { all: false, remaining: 0 },
  openPurchase: jest.fn(),
  ...over,
})
afterEach(() => jest.restoreAllMocks())

it('renders and opens the purchase sheet', () => {
  const ctx = base()
  jest.spyOn(CtxMod, 'useClientEngagement').mockReturnValue(ctx)
  render(<PurchasePrompt />)
  const btn = screen.getByRole('button', { name: /get the full set/i })
  fireEvent.click(btn)
  expect(ctx.openPurchase).toHaveBeenCalled()
})

it('hides when the viewer already owns the whole gallery', () => {
  jest.spyOn(CtxMod, 'useClientEngagement').mockReturnValue(base({ purchaseState: { all: true } }))
  const { container } = render(<PurchasePrompt />)
  expect(container).toBeEmptyDOMElement()
})

it('hides when purchase is not active', () => {
  jest.spyOn(CtxMod, 'useClientEngagement').mockReturnValue(base({ features: { purchase: false } }))
  const { container } = render(<PurchasePrompt />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/client-engagement/purchasePrompt.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/image-displays/engagement/PurchasePrompt.js`**

```js
// components/image-displays/engagement/PurchasePrompt.js
// Persistent, page-level entry point into the purchase sheet — the "just give
// me everything" path and the "download all" affordance. Mirrors SubmitPill's
// fixed placement so it reads as gallery chrome, not an ad.
import { useClientEngagement } from './ClientEngagementContext'

export default function PurchasePrompt() {
  const ctx = useClientEngagement()
  if (!ctx?.features?.purchase) return null
  if (!(ctx.packages || []).length) return null
  if (ctx.purchaseState?.all) return null // already owns everything

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 60 }}>
      <button
        type="button"
        onClick={() => ctx.openPurchase()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#2c2416', background: 'rgba(240,232,216,0.92)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid rgba(160,140,110,0.28)', borderRadius: 999, boxShadow: '0 2px 10px rgba(20,14,8,0.18)', cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(240,232,216,1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(240,232,216,0.92)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
        Get the full set
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/client-engagement/purchasePrompt.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Render PurchasePrompt from the provider**

In `components/image-displays/engagement/ClientEngagementContext.js`, add the import after the `PurchaseSheet` import:

```js
import PurchasePrompt from './PurchasePrompt'
```

Then, in the returned JSX, right after the `{features.submitWorkflow && <SubmitPill />}` line (line 169), add:

```js
      {features.purchase && <PurchasePrompt />}
```

- [ ] **Step 6: Run the engagement suite to confirm no regression**

Run: `npm test -- __tests__/client-engagement`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/engagement/PurchasePrompt.js components/image-displays/engagement/ClientEngagementContext.js __tests__/client-engagement/purchasePrompt.test.js
git commit -m "feat(purchase): persistent Get-the-full-set entry point"
```

---

## Task 13: Admin packages editor

**Files:**
- Modify: `components/admin/platform/PageSettingsPopover.js:379-409`
- Test: `__tests__/components/purchaseSettings.test.js`

**Interfaces:**
- Consumes: the `purchase` config (Task 1) and `updateCf('purchase', patch)` (existing debounced saver).
- Behavior: the Purchase FeatureBlock exposes a free-allowance input and a packages editor (label / credits-or-Entire-gallery / price in dollars → stored cents). The enable toggle is disabled until downloads is on; a hint appears when Stripe is not connected.

**Note on `updateCf`:** it shallow-merges the patch into `cf.purchase` (confirm by reading the existing `updateCf` at `PageSettingsPopover.js:107-110`). Always send the full `packages` array in the patch, never a partial.

- [ ] **Step 1: Write the failing test (a small pure helper drives the editor math)**

The dollars↔cents and package-row mutations are pure. Extract them so they're testable without mounting the popover.

```js
// __tests__/components/purchaseSettings.test.js
import { addPackage, updatePackage, removePackage, dollarsToCents, centsToDollars } from '@/components/admin/platform/purchasePackages'

it('converts dollars to integer cents and back', () => {
  expect(dollarsToCents('40')).toBe(4000)
  expect(dollarsToCents('40.5')).toBe(4050)
  expect(dollarsToCents('')).toBe(0)
  expect(centsToDollars(15000)).toBe('150')
  expect(centsToDollars(4050)).toBe('40.5')
})

it('adds a package with a unique id and sensible defaults', () => {
  const list = addPackage([])
  expect(list).toHaveLength(1)
  expect(list[0]).toMatchObject({ label: '', credits: 10, price: 0 })
  expect(list[0].id).toMatch(/^pkg_/)
  expect(addPackage(list)[1].id).not.toBe(list[0].id)
})

it('updates a package field by id and removes by id', () => {
  let list = addPackage([])
  const id = list[0].id
  list = updatePackage(list, id, { label: 'Ten more', price: 4000 })
  expect(list[0]).toMatchObject({ label: 'Ten more', price: 4000 })
  list = updatePackage(list, id, { credits: 'all' })
  expect(list[0].credits).toBe('all')
  list = removePackage(list, id)
  expect(list).toHaveLength(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/components/purchaseSettings.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/admin/platform/purchasePackages.js`**

```js
// components/admin/platform/purchasePackages.js
// Pure helpers for the admin packages editor. Prices are integer cents.
let seq = 0
function newId() {
  seq += 1
  return `pkg_${Date.now().toString(36)}_${seq}`
}

export function dollarsToCents(v) {
  if (v === '' || v == null) return 0
  return Math.max(0, Math.round(parseFloat(v) * 100)) || 0
}

export function centsToDollars(cents) {
  const n = (cents || 0) / 100
  return Number.isInteger(n) ? String(n) : String(n)
}

export function addPackage(list) {
  return [...(list || []), { id: newId(), label: '', credits: 10, price: 0 }]
}

export function updatePackage(list, id, patch) {
  return (list || []).map(p => (p.id === id ? { ...p, ...patch } : p))
}

export function removePackage(list, id) {
  return (list || []).filter(p => p.id !== id)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/components/purchaseSettings.test.js`
Expected: PASS.

- [ ] **Step 5: Replace the Purchase FeatureBlock in `PageSettingsPopover.js`**

Add the import near the top of `components/admin/platform/PageSettingsPopover.js` (with the other imports):

```js
import { addPackage, updatePackage, removePackage, dollarsToCents, centsToDollars } from './purchasePackages'
```

Replace the entire Purchase `<FeatureBlock>` (lines 379–409) with:

```jsx
          <FeatureBlock
            label="Purchase"
            description="Let clients pay to download more photos. The first few are free; the rest are sold in packages. Checkout is handled for you."
            checked={cf.purchase?.enabled || false}
            disabled={!cf.downloads?.enabled}
            onToggle={(v) => updateCf('purchase', { enabled: v })}
          >
            {!cf.downloads?.enabled && (
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Turn on Downloads first — purchases gate how many downloads are free.</p>
            )}
            {cf.downloads?.enabled && !paymentsReady && (
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Connect a payout account in Site Settings → Print store to accept payments.</p>
            )}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Free downloads</div>
              <input
                type="number" min="0" step="1"
                className="w-20 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent"
                value={cf.purchase?.freeAllowance ?? 0}
                onChange={(e) => updateCf('purchase', { freeAllowance: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              />
            </div>
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>Packages</div>
              {(cf.purchase?.packages || []).map((pkg) => (
                <div key={pkg.id} className="flex items-center gap-1.5">
                  <input
                    type="text" placeholder="Label"
                    className="flex-1 min-w-0 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent"
                    value={pkg.label}
                    onChange={(e) => updateCf('purchase', { packages: updatePackage(cf.purchase.packages, pkg.id, { label: e.target.value }) })}
                  />
                  {pkg.credits === 'all' ? (
                    <span className="text-[10px] w-14 text-center" style={{ color: 'var(--text-muted)' }}>All</span>
                  ) : (
                    <input
                      type="number" min="1" step="1" title="Photos" placeholder="#"
                      className="w-12 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent text-center"
                      value={pkg.credits}
                      onChange={(e) => updateCf('purchase', { packages: updatePackage(cf.purchase.packages, pkg.id, { credits: Math.max(1, parseInt(e.target.value, 10) || 1) }) })}
                    />
                  )}
                  <button
                    type="button"
                    title="Toggle whole-gallery"
                    className="text-[10px] px-1"
                    style={{ color: pkg.credits === 'all' ? '#8b6f47' : 'var(--text-muted)' }}
                    onClick={() => updateCf('purchase', { packages: updatePackage(cf.purchase.packages, pkg.id, { credits: pkg.credits === 'all' ? 10 : 'all' }) })}
                  >∞</button>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{cf.purchase?.currency || 'USD'}</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      className="w-16 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent"
                      value={centsToDollars(pkg.price)}
                      onChange={(e) => updateCf('purchase', { packages: updatePackage(cf.purchase.packages, pkg.id, { price: dollarsToCents(e.target.value) }) })}
                    />
                  </div>
                  <button
                    type="button" aria-label="Remove package" className="px-1"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => updateCf('purchase', { packages: removePackage(cf.purchase.packages, pkg.id) })}
                  >×</button>
                </div>
              ))}
              <button
                type="button"
                className="text-[11px] font-mono uppercase tracking-[0.07em]"
                style={{ color: '#8b6f47' }}
                onClick={() => updateCf('purchase', { packages: addPackage(cf.purchase?.packages) })}
              >+ Add package</button>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Currency</div>
              <select
                style={{ ...selectStyle, width: 'auto' }}
                value={cf.purchase?.currency || 'USD'}
                onChange={(e) => updateCf('purchase', { currency: e.target.value })}
              >
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </FeatureBlock>
```

**`paymentsReady` in the popover:** the popover renders inside the admin site settings, which already loads `siteConfig`. Derive it locally near where `cf` is defined (search for `const cf =` in the component) by reading the same site config the popover already has access to:

```js
  const paymentsReady = !!(siteConfig?.printStore?.chargesEnabled && siteConfig?.printStore?.stripeConnectAccountId)
```

If `siteConfig` is not already a prop/available in this component, pass `paymentsReady` down from the parent that renders `PageSettingsPopover` (it has the site config). Confirm by reading the component's props and its call sites before wiring; use whichever of the two is already threaded.

- [ ] **Step 6: Confirm `FeatureBlock` supports a `disabled` prop**

Read the `FeatureBlock` definition (search `function FeatureBlock` or `const FeatureBlock` in `PageSettingsPopover.js` or its imports). If it does not accept `disabled`, add support: when `disabled`, render the toggle non-interactive (greyed) and ignore `onToggle`. Keep the change minimal and consistent with the existing toggle styling.

- [ ] **Step 7: Run the component tests**

Run: `npm test -- __tests__/components/purchaseSettings.test.js`
Expected: PASS.

- [ ] **Step 8: Manual smoke check (dev server on :3000 is already running)**

Open the admin page settings for a gallery, open **Client Features → Purchase**. Confirm: the toggle is disabled until Downloads is on; enabling shows Free downloads, a packages editor (add/remove, ∞ toggles a row to "All"), and Currency. Confirm values persist after a reload (debounced autosave to R2).

- [ ] **Step 9: Commit**

```bash
git add components/admin/platform/PageSettingsPopover.js components/admin/platform/purchasePackages.js __tests__/components/purchaseSettings.test.js
git commit -m "feat(purchase): admin packages editor (free allowance + packages)"
```

---

## Task 14: Full-suite verification + manual end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: PASS — all suites green. Investigate and fix any regression before proceeding.

- [ ] **Step 2: Manual end-to-end against the running dev server (:3000)**

Using the Stripe **test** environment and a CONNECT-scoped local webhook forward
(`stripe listen --forward-connect-to localhost:3000/api/stripe/webhook`), verify the full loop on a gallery with Downloads + Purchase enabled, `freeAllowance: 1`, and two packages (a "+2 photos" and an "Entire gallery"):

1. As a client (fresh browser profile), download one photo → succeeds (free).
2. Attempt a second, different photo → the **PurchaseSheet** appears (paywall).
3. Buy "+2 photos" with Stripe test card `4242 4242 4242 4242` → redirected to Stripe, complete, return to the gallery with `?purchase=success`.
4. After the webhook grants credits (the return handler polls), download two more distinct photos → succeed; a further new photo → paywall again.
5. Re-download any already-unlocked photo → always succeeds, no paywall.
6. Click **Get the full set** → buy "Entire gallery" → afterward every photo downloads freely and the "Get the full set" button disappears.
7. Confirm the photographer's `/admin/orders` (or order records) shows the digital orders as `paid`.

- [ ] **Step 3: Note any gaps**

If step 2's manual e2e surfaces UX gaps (e.g., the `<a download>` cannot intercept a server 402, so a stale client prediction would attempt a failed download), log them as follow-ups. The server 402 is the correctness backstop; the client prediction plus post-purchase polling is the UX layer.

---

## Self-Review Notes (author)

- **Spec coverage:** config normalization (T1), entitlement storage (T2), accounting (T3), digital amounts (T4), digital checkout params (T5), enforcement/402 (T6), checkout route (T7), webhook grant (T8), viewer-state GET (T9), paymentsReady threading (T10), client state + PurchaseSheet + gated download (T11), persistent entry point (T12), admin editor (T13), verification (T14). Every spec section maps to a task.
- **Deferred per spec (no tasks):** ZIP-all bulk download, quality-tier pricing, named fixed-set packages ("C" model), refund/dispute automation.
- **Type consistency:** `resolveDownloadAccess`, `grantEntitlement`, `viewerPurchaseState`, `normalizePurchaseConfig`, `buildDigitalAmounts`, `buildDigitalCheckoutSessionParams` are named identically across producing and consuming tasks. Order shape (`type: 'digital'`, `credits`, `pageId`, `buyer.email`, `amounts`) is consistent between T7 (create) and T8 (consume).
- **Known UX caveat (logged in T14):** an `<a download>` navigation cannot catch a 402, so the client relies on its predicted `purchaseState` + post-purchase polling to decide when to show the paywall; the server 402 remains the correctness gate.
