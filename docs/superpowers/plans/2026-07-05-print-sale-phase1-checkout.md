# Print Sale Phase 1 — Connect Onboarding + Checkout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A photographer connects a Stripe (Express) account; a buyer configures a print, enters a shipping address, gets a quote, and pays through Stripe Checkout (test mode); an order is recorded and marked paid — all with no Prodigi and no real money.

**Architecture:** Pure money-math (`orderPricing`) and a pure Stripe-session builder are unit-tested; a per-user GCS `orders` store persists order records; thin Stripe API routes (Connect onboarding, checkout session, webhook) sit behind a lazily-configured Stripe client. Quotes use the existing **mock lab adapter** (Prodigi is Phase 2). The configurator drawer gains an address step that quotes then redirects to Stripe Checkout.

**Tech Stack:** Next.js (pages router), `stripe` Node SDK, Jest + jsdom, Cloudflare R2 (S3 SDK) JSON configs, Stripe test mode + Stripe CLI for webhook forwarding.

## Global Constraints

- JavaScript only (no TypeScript). Match existing `common/`/route style.
- Tests in `__tests__/**/*.test.js`, run with `npm test`. `@/` maps to repo root.
- **All monetary amounts are integer minor units (cents).** Never floats.
- The photographer is **merchant of record**: Stripe **direct charge on the connected account** (`{ stripeAccount }` request option), with `application_fee_amount`.
- **Money split (verbatim from spec §3):** buyer pays `retail + shippingCost`; `application_fee_amount = printCost + shippingCost + platformFee`; photographer nets `retail − printCost − platformFee`; `platformFee = round(retail * printStore.platformFeePct / 100)`.
- Buy/checkout activates only when `printStore.enabled && printStore.chargesEnabled` and the image is sellable with available sizes.
- Quotes in this phase come from the **mock lab adapter** via `getAdapterForCountry` — do NOT build Prodigi here (Phase 2).
- Secrets live in `.env.local` (symlinked to `~/.secrets/portfolio-builder-v1.env`); never commit them. New keys: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (all Stripe **test** values in this phase).
- Spec: `docs/superpowers/specs/2026-07-05-print-sale-checkout-fulfillment-design.md`.
- Pre-existing unrelated suite failures (`siteConfig` ×2/3, `CrossBlockDrag` ×1) predate this work — don't attribute them here; don't add new failures.

---

### Task 1: Dependency, env, and `chargesEnabled` config

**Files:**
- Modify: `package.json` (add `stripe`)
- Modify: `common/siteConfig.js` (`normalizePrintStore`, `createDefaultSiteConfig` printStore — add `chargesEnabled`)
- Test: `__tests__/common/siteConfig.test.js` (extend the printStore block)

**Interfaces:**
- Produces: `printStore.chargesEnabled` (boolean, default false) on every normalized/default site config.

- [ ] **Step 1: Install the Stripe SDK**

Run: `npm install stripe@^16`
Expected: `stripe` appears in `package.json` dependencies.

- [ ] **Step 2: Document the new env keys (do not commit secrets)**

Append to `.env.local` (the symlinked secrets file) — the human supplies real test values:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
Confirm `.env.local` is a symlink (`ls -la .env.local`) and is git-ignored (`git check-ignore .env.local`). Do not add secrets to the repo.

- [ ] **Step 3: Write the failing test for `chargesEnabled`**

```js
// __tests__/common/siteConfig.test.js  (append inside the existing printStore describe, or add one)
import { createDefaultSiteConfig, normalizePrintStore } from '../../common/siteConfig'

describe('printStore.chargesEnabled', () => {
  it('defaults to false on a new config', () => {
    expect(createDefaultSiteConfig('u1').printStore.chargesEnabled).toBe(false)
  })
  it('normalizePrintStore backfills and preserves chargesEnabled', () => {
    expect(normalizePrintStore({}).printStore.chargesEnabled).toBe(false)
    expect(normalizePrintStore({ printStore: { chargesEnabled: true } }).printStore.chargesEnabled).toBe(true)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- siteConfig`
Expected: FAIL — `chargesEnabled` is undefined.

- [ ] **Step 5: Add `chargesEnabled` to the printStore default and normalizer**

In `common/siteConfig.js`, in the `createDefaultSiteConfig` printStore object add `chargesEnabled: false,` (next to `stripeConnectAccountId`). In `normalizePrintStore`'s returned `printStore`, add:
```js
      chargesEnabled: ps.chargesEnabled ?? false,
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- siteConfig`
Expected: PASS (new cases; pre-existing 3 failures unchanged).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json common/siteConfig.js __tests__/common/siteConfig.test.js
git commit -m "feat(print-sale): add stripe dep + printStore.chargesEnabled"
```

---

### Task 2: Order pricing (pure money math)

**Files:**
- Create: `common/print/orderPricing.js`
- Test: `__tests__/common/orderPricing.test.js`

**Interfaces:**
- Produces: `buildAmounts({ retail, printCost, shippingCost, platformFeePct = 0, currency = 'USD' }) => { retail, printCost, shippingCost, platformFee, applicationFee, profit, total, currency }` — all integer cents. Throws `'markup too low'` if the application fee would exceed the buyer charge.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/orderPricing.test.js
import { buildAmounts } from '../../common/print/orderPricing'

describe('buildAmounts', () => {
  it('computes the split (spec §3)', () => {
    const a = buildAmounts({ retail: 17000, printCost: 6500, shippingCost: 1200, platformFeePct: 10, currency: 'USD' })
    expect(a).toEqual({
      retail: 17000, printCost: 6500, shippingCost: 1200,
      platformFee: 1700,                 // 10% of 17000
      total: 18200,                      // retail + shipping
      applicationFee: 9400,              // 6500 + 1200 + 1700
      profit: 8800,                      // 17000 - 6500 - 1700
      currency: 'USD',
    })
  })

  it('defaults platformFee to 0', () => {
    const a = buildAmounts({ retail: 7000, printCost: 2400, shippingCost: 1000 })
    expect(a.platformFee).toBe(0)
    expect(a.applicationFee).toBe(3400)
    expect(a.profit).toBe(4600)
    expect(a.total).toBe(8000)
  })

  it('throws when the markup is too low (fee would exceed the charge)', () => {
    // retail below printCost: profit negative, app fee > total
    expect(() => buildAmounts({ retail: 2000, printCost: 2400, shippingCost: 1000 })).toThrow('markup too low')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- orderPricing`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```js
// common/print/orderPricing.js
// Pure money math for one print order. All amounts are integer minor units (cents).
export function buildAmounts({ retail, printCost, shippingCost, platformFeePct = 0, currency = 'USD' }) {
  const platformFee = Math.round(retail * (platformFeePct / 100))
  const total = retail + shippingCost
  const applicationFee = printCost + shippingCost + platformFee
  const profit = retail - printCost - platformFee
  if (applicationFee > total) throw new Error('markup too low: application fee exceeds the buyer charge')
  return { retail, printCost, shippingCost, platformFee, applicationFee, profit, total, currency }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- orderPricing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/print/orderPricing.js __tests__/common/orderPricing.test.js
git commit -m "feat(print-sale): order pricing split (pure)"
```

---

### Task 3: Orders store (GCS)

**Files:**
- Modify: `common/gcsUser.js` (add order path helpers)
- Create: `common/orders.js`
- Test: `__tests__/common/gcsUser.test.js` (append), `__tests__/common/orders.test.js`

**Interfaces:**
- Consumes: `downloadJSON`/`uploadJSON`/`listFiles` from `common/gcsClient.js`.
- Produces:
  - `getUserOrdersPrefix(userId) => 'users/{userId}/orders/'`, `getUserOrderPath(userId, orderId) => 'users/{userId}/orders/{orderId}.json'`.
  - `newOrderId() => 'ord_<uuid>'` (uses `crypto.randomUUID`).
  - `saveOrder(userId, order) => Promise`, `getOrder(userId, orderId) => Promise<order|null>`, `listOrders(userId) => Promise<order[]>` (newest first).

- [ ] **Step 1: Write the failing tests (path helpers + id shape)**

```js
// __tests__/common/gcsUser.test.js  (append)
import { getUserOrdersPrefix, getUserOrderPath } from '../../common/gcsUser'
describe('order paths', () => {
  it('builds the orders prefix and a per-order path', () => {
    expect(getUserOrdersPrefix('u1')).toBe('users/u1/orders/')
    expect(getUserOrderPath('u1', 'ord_x')).toBe('users/u1/orders/ord_x.json')
  })
  it('throws without an orderId', () => {
    expect(() => getUserOrderPath('u1', '')).toThrow('orderId is required')
  })
})
```

```js
// __tests__/common/orders.test.js
import { newOrderId } from '../../common/orders'
it('newOrderId is prefixed and unique', () => {
  const a = newOrderId(), b = newOrderId()
  expect(a).toMatch(/^ord_[0-9a-f-]{36}$/)
  expect(a).not.toBe(b)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- gcsUser orders`
Expected: FAIL — helpers/module missing.

- [ ] **Step 3: Add the path helpers**

In `common/gcsUser.js`:
```js
export function getUserOrdersPrefix(userId) {
  return `${getUserPrefix(userId)}orders/`
}
export function getUserOrderPath(userId, orderId) {
  if (!orderId) throw new Error('orderId is required')
  return `${getUserOrdersPrefix(userId)}${orderId}.json`
}
```

- [ ] **Step 4: Write the orders store**

```js
// common/orders.js
// Server-side per-user order persistence in R2.
import { randomUUID } from 'crypto'
import { downloadJSON, uploadJSON, listFiles } from './gcsClient'
import { getUserOrdersPrefix, getUserOrderPath } from './gcsUser'

export function newOrderId() {
  return `ord_${randomUUID()}`
}

export async function saveOrder(userId, order) {
  await uploadJSON(getUserOrderPath(userId, order.id), order)
  return order
}

export async function getOrder(userId, orderId) {
  try {
    return await downloadJSON(getUserOrderPath(userId, orderId))
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey') return null
    throw err
  }
}

export async function listOrders(userId) {
  const keys = await listFiles(getUserOrdersPrefix(userId))
  const jsonKeys = keys.filter((k) => k.endsWith('.json'))
  const orders = await Promise.all(jsonKeys.map((k) => downloadJSON(k).catch(() => null)))
  return orders.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- gcsUser orders`
Expected: PASS (new cases; pre-existing gcsUser tests still pass).

- [ ] **Step 6: Commit**

```bash
git add common/gcsUser.js common/orders.js __tests__/common/gcsUser.test.js __tests__/common/orders.test.js
git commit -m "feat(print-sale): per-user orders store + id/path helpers"
```

---

### Task 4: Stripe client + Checkout session builder

**Files:**
- Create: `common/stripe/client.js`
- Create: `common/stripe/checkout.js`
- Test: `__tests__/common/stripeCheckout.test.js`

**Interfaces:**
- Produces:
  - `getStripe() => Stripe` — lazy singleton from `STRIPE_SECRET_KEY`; throws `'STRIPE_SECRET_KEY not configured'` if unset.
  - `buildCheckoutSessionParams({ order, successUrl, cancelUrl }) => object` — the params for `stripe.checkout.sessions.create` (the connected-account id is NOT in here; the route passes it as the request option). Two line items (print at `retail`, shipping at `shippingCost`), `payment_intent_data.application_fee_amount = amounts.applicationFee`, `metadata { orderId, userId }`, `customer_email`, `success_url` with `{CHECKOUT_SESSION_ID}`.

- [ ] **Step 1: Write the failing test (pure builder)**

```js
// __tests__/common/stripeCheckout.test.js
import { buildCheckoutSessionParams } from '../../common/stripe/checkout'

const order = {
  id: 'ord_1', userId: 'u1',
  buyer: { email: 'b@x.com' },
  spec: { size: '16x24' },
  amounts: { retail: 17000, shippingCost: 1200, applicationFee: 9400, currency: 'USD' },
}

it('builds a Connect checkout session params object', () => {
  const p = buildCheckoutSessionParams({ order, successUrl: 'https://s/print/confirmation', cancelUrl: 'https://s/x' })
  expect(p.mode).toBe('payment')
  expect(p.line_items).toHaveLength(2)
  expect(p.line_items[0].price_data.unit_amount).toBe(17000)
  expect(p.line_items[1].price_data.unit_amount).toBe(1200)
  expect(p.line_items[0].price_data.currency).toBe('usd')
  expect(p.payment_intent_data.application_fee_amount).toBe(9400)
  expect(p.customer_email).toBe('b@x.com')
  expect(p.metadata).toEqual({ orderId: 'ord_1', userId: 'u1' })
  expect(p.success_url).toBe('https://s/print/confirmation?session_id={CHECKOUT_SESSION_ID}')
  expect(p.cancel_url).toBe('https://s/x')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- stripeCheckout`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the client and builder**

```js
// common/stripe/client.js
// Lazy platform Stripe client (server-side only).
import Stripe from 'stripe'

let _stripe = null
export function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
    _stripe = new Stripe(key, { apiVersion: '2024-06-20' })
  }
  return _stripe
}
```

```js
// common/stripe/checkout.js
// Pure: build the Stripe Checkout Session params for a print order. The connected
// account id is passed by the route as a request option, not here.
export function buildCheckoutSessionParams({ order, successUrl, cancelUrl }) {
  const { amounts, spec, id, userId, buyer } = order
  const currency = (amounts.currency || 'USD').toLowerCase()
  return {
    mode: 'payment',
    line_items: [
      { price_data: { currency, unit_amount: amounts.retail, product_data: { name: `Fine art print — ${spec.size}` } }, quantity: 1 },
      { price_data: { currency, unit_amount: amounts.shippingCost, product_data: { name: 'Shipping' } }, quantity: 1 },
    ],
    payment_intent_data: { application_fee_amount: amounts.applicationFee },
    customer_email: buyer?.email,
    metadata: { orderId: id, userId },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- stripeCheckout`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/stripe/client.js common/stripe/checkout.js __tests__/common/stripeCheckout.test.js
git commit -m "feat(print-sale): stripe client + checkout session builder"
```

---

### Task 5: Connect onboarding routes

**Files:**
- Create: `pages/api/admin/print/connect.js`
- Create: `pages/api/admin/print/connect/status.js`

**Interfaces:**
- Consumes: `getStripe` (Task 4); `readSiteConfig`/`writeSiteConfig`/`createDefaultSiteConfig`/`normalizePrintStore`; `withAuth`; `siteUrlFor` from `common/domainUtils`.
- Produces:
  - `POST /api/admin/print/connect` → ensures a Stripe Express connected account for the user (creates one if `printStore.stripeConnectAccountId` is null, persists it), creates an **Account Link**, returns `{ url }` (Stripe-hosted onboarding).
  - `GET /api/admin/print/connect/status` → retrieves the connected account, writes `chargesEnabled = account.charges_enabled`, returns `{ connected: !!accountId, chargesEnabled }`.

> No unit test: these are thin Stripe I/O compositions verified in the Task 11 manual smoke (Stripe test mode). Keep them minimal.

- [ ] **Step 1: Write the connect route**

```js
// pages/api/admin/print/connect.js
import { withAuth } from '../../../../common/withAuth'
import { readSiteConfig, writeSiteConfig, createDefaultSiteConfig, normalizePrintStore } from '../../../../common/siteConfig'
import { getStripe } from '../../../../common/stripe/client'

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const stripe = getStripe()
    let config = normalizePrintStore((await readSiteConfig(user.id)) || createDefaultSiteConfig(user.id))
    let accountId = config.printStore.stripeConnectAccountId

    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express', metadata: { userId: user.id } })
      accountId = account.id
      config = { ...config, printStore: { ...config.printStore, stripeConnectAccountId: accountId } }
      await writeSiteConfig(user.id, config)
    }

    const origin = req.headers.origin || `https://${req.headers.host}`
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/admin?connect=refresh`,
      return_url: `${origin}/admin?connect=return`,
      type: 'account_onboarding',
    })
    return res.status(200).json({ url: link.url })
  } catch (err) {
    console.error('print connect error', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
```

- [ ] **Step 2: Write the status route**

```js
// pages/api/admin/print/connect/status.js
import { withAuth } from '../../../../../common/withAuth'
import { readSiteConfig, writeSiteConfig, createDefaultSiteConfig, normalizePrintStore } from '../../../../../common/siteConfig'
import { getStripe } from '../../../../../common/stripe/client'

async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    let config = normalizePrintStore((await readSiteConfig(user.id)) || createDefaultSiteConfig(user.id))
    const accountId = config.printStore.stripeConnectAccountId
    if (!accountId) return res.status(200).json({ connected: false, chargesEnabled: false })

    const account = await getStripe().accounts.retrieve(accountId)
    const chargesEnabled = !!account.charges_enabled
    if (chargesEnabled !== config.printStore.chargesEnabled) {
      config = { ...config, printStore: { ...config.printStore, chargesEnabled } }
      await writeSiteConfig(user.id, config)
    }
    return res.status(200).json({ connected: true, chargesEnabled })
  } catch (err) {
    console.error('print connect status error', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
```

- [ ] **Step 3: Confirm the suite still passes (no new tests here)**

Run: `npm test`
Expected: PASS (only the pre-existing failures).

- [ ] **Step 4: Commit**

```bash
git add pages/api/admin/print/connect.js pages/api/admin/print/connect/status.js
git commit -m "feat(print-sale): Stripe Connect Express onboarding routes"
```

---

### Task 6: Public quote route

**Files:**
- Create: `pages/api/print/quote.js`
- Create: `common/print/quoteOrder.js` (pure helper so the money assembly is testable)
- Test: `__tests__/common/quoteOrder.test.js`

**Interfaces:**
- Consumes: `getAdapterForCountry` (mock adapter) for `getCost`/`getShippingQuote`; `computeRetail`+`lineCost` (pricing); `buildAmounts` (Task 2); `SEED_CATALOG`.
- Produces:
  - `quoteOrder({ catalog, spec, markup, platformFeePct, currency, adapter, address }) => amounts` — pure orchestration: `printCost = round(adapter.getCost(spec).cost*100)`, `shippingCost = round(adapter.getShippingQuote(spec,address).cost*100)`, `retail = computeRetail(lineCost(catalog,spec), markup)*100`, then `buildAmounts(...)`. (Catalog costs are in whole currency units → ×100 to cents.)
  - `POST /api/print/quote` body `{ username, assetId, spec, address }` → resolves the user's siteConfig (markup, fee, currency) + verifies the asset is sellable, calls `quoteOrder`, returns `{ amounts }`.

- [ ] **Step 1: Write the failing test for the pure helper**

```js
// __tests__/common/quoteOrder.test.js
import { quoteOrder } from '../../common/print/quoteOrder'
import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'
import { computeRetail, lineCost } from '../../common/print/pricing'

const adapter = {
  getCost: (spec) => ({ cost: lineCost(SEED_CATALOG, spec), currency: 'USD' }),
  getShippingQuote: () => ({ cost: 12, currency: 'USD', etaDays: 5 }),
}

it('assembles amounts in cents from catalog + adapter quotes', () => {
  const spec = { size: '16x24', finish: 'lustre', frame: 'none', matte: false }
  const a = quoteOrder({ catalog: SEED_CATALOG, spec, markup: 3, platformFeePct: 0, currency: 'USD', adapter, address: { country: 'US' } })
  const printCents = lineCost(SEED_CATALOG, spec) * 100
  const retailCents = computeRetail(lineCost(SEED_CATALOG, spec), 3) * 100
  expect(a.printCost).toBe(printCents)
  expect(a.shippingCost).toBe(1200)
  expect(a.retail).toBe(retailCents)
  expect(a.total).toBe(retailCents + 1200)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- quoteOrder`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the pure helper**

```js
// common/print/quoteOrder.js
// Pure: turn catalog + adapter quotes into an amounts split (cents).
import { computeRetail, lineCost } from './pricing'
import { buildAmounts } from './orderPricing'

const toCents = (n) => Math.round(n * 100)

export function quoteOrder({ catalog, spec, markup, platformFeePct = 0, currency = 'USD', adapter, address }) {
  const printCost = toCents(adapter.getCost(spec).cost)
  const shippingCost = toCents(adapter.getShippingQuote(spec, address).cost)
  const retail = toCents(computeRetail(lineCost(catalog, spec), markup))
  return buildAmounts({ retail, printCost, shippingCost, platformFeePct, currency })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- quoteOrder`
Expected: PASS.

- [ ] **Step 5: Write the quote route**

```js
// pages/api/print/quote.js
import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { readLibraryConfig } from '../../../common/adminConfig'
import { publicPrintStore, publicPrintForAsset } from '../../../common/print/publicPrint'
import { getAdapterForCountry } from '../../../common/fulfillment/router'
import { SEED_CATALOG } from '../../../common/fulfillment/seedCatalog'
import { quoteOrder } from '../../../common/print/quoteOrder'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { username, assetId, spec, address } = req.body || {}
    if (!username || !assetId || !spec || !address?.country) return res.status(400).json({ error: 'username, assetId, spec, address.country required' })

    const lookup = await lookupUserByUsername(username)
    if (!lookup) return res.status(404).json({ error: 'not found' })
    const [siteConfig, libraryConfig] = await Promise.all([
      readSiteConfig(lookup.userId),
      readLibraryConfig(lookup.userId).catch(() => ({ assets: {} })),
    ])
    const store = publicPrintStore(siteConfig)
    if (!store.enabled) return res.status(403).json({ error: 'store not enabled' })

    const asset = Object.values(libraryConfig?.assets || {}).find((a) => a.assetId === assetId)
    const print = publicPrintForAsset(asset)
    if (!print || !print.availableSizes.includes(spec.size)) return res.status(400).json({ error: 'unavailable size' })

    const adapter = getAdapterForCountry(address.country)
    const amounts = quoteOrder({ catalog: SEED_CATALOG, spec, markup: store.markup, platformFeePct: 0, currency: store.currency, adapter, address })
    return res.status(200).json({ amounts })
  } catch (err) {
    console.error('quote error', err)
    return res.status(500).json({ error: err.message })
  }
}
```

> `platformFeePct` is read as `0` here for the public quote (the buyer's total is `retail + shipping` regardless of the fee; the fee only affects the Sepia/photographer split, recomputed authoritatively at checkout in Task 7). Keeping it 0 here avoids exposing the platform fee publicly.

- [ ] **Step 6: Confirm the suite passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add pages/api/print/quote.js common/print/quoteOrder.js __tests__/common/quoteOrder.test.js
git commit -m "feat(print-sale): public print quote (mock adapter)"
```

---

### Task 7: Checkout route (create order + Stripe session)

**Files:**
- Create: `pages/api/print/checkout.js`

**Interfaces:**
- Consumes: `lookupUserByUsername`, `readSiteConfig`, `readLibraryConfig`, `publicPrintStore`/`publicPrintForAsset`, `getAdapterForCountry`, `SEED_CATALOG`, `quoteOrder` (with the real `platformFeePct`), `newOrderId`/`saveOrder`, `getStripe`, `buildCheckoutSessionParams`, `siteUrlFor`.
- Produces: `POST /api/print/checkout` body `{ username, assetId, spec, buyer{email,name,address} }` → recomputes amounts authoritatively (with the photographer's `platformFeePct`), gates on `enabled && chargesEnabled`, creates a **pending** order, creates a Stripe Checkout Session as a **direct charge on the connected account**, saves `sessionId` on the order, returns `{ url }`.

> No unit test: thin Stripe I/O + already-tested pure pieces. Verified in the Task 11 manual smoke.

- [ ] **Step 1: Write the checkout route**

```js
// pages/api/print/checkout.js
import { lookupUserByUsername } from '../../../common/userProfile'
import { readSiteConfig } from '../../../common/siteConfig'
import { normalizePrintStore } from '../../../common/siteConfig'
import { readLibraryConfig } from '../../../common/adminConfig'
import { publicPrintForAsset } from '../../../common/print/publicPrint'
import { getAdapterForCountry } from '../../../common/fulfillment/router'
import { SEED_CATALOG } from '../../../common/fulfillment/seedCatalog'
import { quoteOrder } from '../../../common/print/quoteOrder'
import { newOrderId, saveOrder } from '../../../common/orders'
import { getStripe } from '../../../common/stripe/client'
import { buildCheckoutSessionParams } from '../../../common/stripe/checkout'
import { siteUrlFor } from '../../../common/domainUtils'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { username, assetId, spec, buyer } = req.body || {}
    if (!username || !assetId || !spec || !buyer?.email || !buyer?.address?.country) {
      return res.status(400).json({ error: 'username, assetId, spec, buyer.email, buyer.address.country required' })
    }
    const lookup = await lookupUserByUsername(username)
    if (!lookup) return res.status(404).json({ error: 'not found' })

    const rawConfig = await readSiteConfig(lookup.userId)
    const config = normalizePrintStore(rawConfig || {})
    const ps = config.printStore
    if (!ps.enabled || !ps.chargesEnabled || !ps.stripeConnectAccountId) {
      return res.status(403).json({ error: 'store not ready for checkout' })
    }

    const libraryConfig = await readLibraryConfig(lookup.userId).catch(() => ({ assets: {} }))
    const asset = Object.values(libraryConfig?.assets || {}).find((a) => a.assetId === assetId)
    const print = publicPrintForAsset(asset)
    if (!print || !print.availableSizes.includes(spec.size)) return res.status(400).json({ error: 'unavailable size' })

    const adapter = getAdapterForCountry(buyer.address.country)
    const amounts = quoteOrder({
      catalog: SEED_CATALOG, spec, markup: ps.markup, platformFeePct: ps.platformFeePct, currency: ps.currency, adapter, address: buyer.address,
    })

    const order = {
      id: newOrderId(),
      userId: lookup.userId,
      status: 'pending',
      assetId,
      spec,
      buyer,
      amounts,
      stripe: { sessionId: null, paymentIntentId: null, connectedAccountId: ps.stripeConnectAccountId },
      fulfillment: { lab: 'prodigi', labOrderId: null, status: 'none', tracking: null },
      createdAt: new Date().toISOString(),
    }

    const base = siteUrlFor(config, username, process.env.NEXT_PUBLIC_ROOT_DOMAIN)
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create(
      buildCheckoutSessionParams({ order, successUrl: `${base}/print/confirmation`, cancelUrl: `${base}` }),
      { stripeAccount: ps.stripeConnectAccountId },
    )

    order.stripe.sessionId = session.id
    await saveOrder(lookup.userId, order)
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('checkout error', err)
    return res.status(500).json({ error: err.message })
  }
}
```

- [ ] **Step 2: Confirm the suite passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add pages/api/print/checkout.js
git commit -m "feat(print-sale): checkout route creates order + Connect Stripe session"
```

---

### Task 8: Stripe webhook (mark order paid)

**Files:**
- Create: `pages/api/stripe/webhook.js`

**Interfaces:**
- Consumes: `getStripe`, `getOrder`/`saveOrder`, `STRIPE_WEBHOOK_SECRET`.
- Produces: `POST /api/stripe/webhook` — verifies the Stripe signature against the raw body, and on `checkout.session.completed` loads the order (`metadata.orderId`/`metadata.userId`), sets `status = 'paid'` and `stripe.paymentIntentId`, saves. Idempotent (skips if already paid). Requires the raw body (`bodyParser: false`).

> No unit test: signature verification + I/O. Verified in the Task 11 manual smoke via the Stripe CLI. Phase 2 extends this handler to place the Prodigi order.

- [ ] **Step 1: Write the webhook route**

```js
// pages/api/stripe/webhook.js
import { getStripe } from '../../../common/stripe/client'
import { getOrder, saveOrder } from '../../../common/orders'

export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' })

  let event
  try {
    const raw = await readRawBody(req)
    event = getStripe().webhooks.constructEvent(raw, req.headers['stripe-signature'], secret)
  } catch (err) {
    console.error('stripe webhook signature failed', err.message)
    return res.status(400).json({ error: `Webhook signature verification failed` })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { orderId, userId } = session.metadata || {}
      if (orderId && userId) {
        const order = await getOrder(userId, orderId)
        if (order && order.status === 'pending') {
          order.status = 'paid'
          order.stripe.paymentIntentId = session.payment_intent || null
          await saveOrder(userId, order)
        }
      }
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('stripe webhook handler error', err)
    return res.status(500).json({ error: err.message })
  }
}
```

- [ ] **Step 2: Confirm the suite passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add pages/api/stripe/webhook.js
git commit -m "feat(print-sale): stripe webhook marks order paid"
```

---

### Task 9: Confirmation page

**Files:**
- Create: `pages/print/confirmation.js`

**Interfaces:**
- Produces: `/print/confirmation?session_id=…` — a simple thank-you page. Server-side reads nothing sensitive; it just shows a confirmation message (the order/tracking live in the photographer's admin; the buyer gets Stripe's email). Renders a centered "Thank you — your print order is confirmed" with a link back.

- [ ] **Step 1: Write the page**

```jsx
// pages/print/confirmation.js
import Head from 'next/head'

export default function PrintConfirmation() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4efe8', padding: 24 }}>
      <Head><title>Order confirmed</title></Head>
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <p style={{ fontFamily: '"Fraunces", Georgia, serif', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 12, color: '#a8967a' }}>Order confirmed</p>
        <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 34, color: '#2c2416', margin: '10px 0 14px' }}>Thank you — your print is on its way.</h1>
        <p style={{ color: '#5c4f3a', lineHeight: 1.6 }}>We emailed your receipt. Your print will be produced and shipped to the address you provided, and you’ll get a tracking email when it ships.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Confirm it compiles**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/print/confirmation` → expect 200 (dev server running; do NOT run `next build`).

- [ ] **Step 3: Commit**

```bash
git add pages/print/confirmation.js
git commit -m "feat(print-sale): order confirmation page"
```

---

### Task 10: Drawer — address step + pay

**Files:**
- Modify: `components/image-displays/print/PrintConfigurator.js`
- Create: `components/image-displays/print/CheckoutStep.js`

**Interfaces:**
- Consumes: `POST /api/print/quote`, `POST /api/print/checkout`; the `username` of the site (thread it from the public render into the `PrintStoreProvider`/context so the configurator can call the quote/checkout routes).
- Produces: after "Buy this print", the drawer shows `CheckoutStep` — an address form; on blur/submit it calls `/api/print/quote` and shows the shipping + total; a "Pay" button calls `/api/print/checkout` and redirects to `window.location = url`. A "back" link returns to configuration.

> Integration into the drawer + a new presentational form. The `CheckoutStep` form fields and its call to `onQuote`/`onPay` callbacks are unit-tested (jsdom); the drawer wiring + real Stripe redirect are covered by the Task 11 manual smoke.

- [ ] **Step 1: Thread `username` to the configurator context**

In `components/image-displays/print/PrintStoreContext.js`, add a `username` prop to `PrintStoreProvider` and include it in the context value. In `components/image-displays/gallery/Gallery.js`, pass `username={username}` to `<PrintStoreProvider>`. (Gallery already receives `username`.)

- [ ] **Step 2: Write the CheckoutStep component + test**

```jsx
// components/image-displays/print/CheckoutStep.js
import React, { useState } from 'react'

const input = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid rgba(160,140,110,0.35)', borderRadius: 5, background: '#faf7f1', fontSize: 14, color: '#2c2416', outline: 'none', marginTop: 4 }

export default function CheckoutStep({ onBack, onSubmit, quoting, amounts, error }) {
  const [f, setF] = useState({ email: '', name: '', line1: '', city: '', region: '', postalCode: '', country: 'US' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ready = f.email && f.line1 && f.city && f.postalCode && f.country
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (ready) onSubmit(f) }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, color: '#2c2416' }}
    >
      <button type="button" onClick={onBack} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#7a6b55', fontSize: 12.5, cursor: 'pointer', padding: 0 }}>‹ Back to options</button>
      <input style={input} placeholder="Email" aria-label="Email" value={f.email} onChange={set('email')} />
      <input style={input} placeholder="Full name" aria-label="Full name" value={f.name} onChange={set('name')} />
      <input style={input} placeholder="Address" aria-label="Address" value={f.line1} onChange={set('line1')} />
      <input style={input} placeholder="City" aria-label="City" value={f.city} onChange={set('city')} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={input} placeholder="State/Region" aria-label="Region" value={f.region} onChange={set('region')} />
        <input style={input} placeholder="Postal code" aria-label="Postal code" value={f.postalCode} onChange={set('postalCode')} />
      </div>
      <input style={input} placeholder="Country (e.g. US)" aria-label="Country" value={f.country} onChange={set('country')} />
      {amounts && (
        <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 13, color: '#5c4f3a', display: 'flex', justifyContent: 'space-between' }}>
          <span>Shipping ${(amounts.shippingCost / 100).toFixed(2)}</span>
          <span>Total ${(amounts.total / 100).toFixed(2)}</span>
        </div>
      )}
      {error && <p style={{ color: '#a8563a', fontSize: 12.5, margin: 0 }}>{error}</p>}
      <button
        type="submit"
        disabled={!ready || quoting}
        style={{ width: '100%', padding: '13px', borderRadius: 6, border: 'none', fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 18, background: '#2c2416', color: '#f4efe8', cursor: ready && !quoting ? 'pointer' : 'not-allowed', opacity: ready && !quoting ? 1 : 0.6 }}
      >
        {quoting ? 'Working…' : amounts ? `Pay $${(amounts.total / 100).toFixed(2)}` : 'Continue to payment'}
      </button>
    </form>
  )
}
```

```js
// __tests__/components/CheckoutStep.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CheckoutStep from '../../components/image-displays/print/CheckoutStep'

it('submits the address once required fields are filled', () => {
  const onSubmit = jest.fn()
  render(<CheckoutStep onBack={() => {}} onSubmit={onSubmit} />)
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'b@x.com' } })
  fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '1 A St' } })
  fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Town' } })
  fireEvent.change(screen.getByLabelText(/postal code/i), { target: { value: '90210' } })
  fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'b@x.com', line1: '1 A St', country: 'US' }))
})

it('calls onBack', () => {
  const onBack = jest.fn()
  render(<CheckoutStep onBack={onBack} onSubmit={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /back to options/i }))
  expect(onBack).toHaveBeenCalled()
})
```

- [ ] **Step 3: Run the CheckoutStep test (RED → implement → GREEN)**

Run: `npm test -- CheckoutStep`
Expected: PASS.

- [ ] **Step 4: Wire the step into `PrintConfigurator`**

In `components/image-displays/print/PrintConfigurator.js`: add local state `const [checkout, setCheckout] = useState(false)`, `const [amounts, setAmounts] = useState(null)`, `const [quoting, setQuoting] = useState(false)`, `const [error, setError] = useState('')`. Read `username` from `usePrintStore()`. Reset these when the drawer opens/`imageUrl` changes.

Replace the current controls region so that when `checkout` is true it renders `<CheckoutStep .../>`, else the existing `<PrintPurchasePanel .../>`. Make the panel's Buy button start checkout: pass a new `onBuy` prop to `PrintPurchasePanel` and call it from its Buy button (change the Buy button from `disabled` to `onClick={onBuy}`); in `PrintConfigurator` set `onBuy={() => setCheckout(true)}`.

`CheckoutStep`'s `onSubmit(form)`:
```js
const onSubmit = async (form) => {
  setQuoting(true); setError('')
  const address = { line1: form.line1, city: form.city, region: form.region, postalCode: form.postalCode, country: form.country }
  try {
    if (!amounts) {
      const r = await fetch('/api/print/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, assetId: print?.assetId, spec, address }) })
      if (!r.ok) throw new Error('Could not get a shipping quote for that address.')
      setAmounts((await r.json()).amounts); setQuoting(false); return
    }
    const c = await fetch('/api/print/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, assetId: print?.assetId, spec, buyer: { email: form.email, name: form.name, address } }) })
    if (!c.ok) throw new Error('Checkout could not start. Please try again.')
    window.location = (await c.json()).url
  } catch (e) { setError(e.message); setQuoting(false) }
}
```

> Note: `print` needs an `assetId`. Extend `publicPrintForAsset` (Task in Phase 2 already includes orientation; here) to also carry `assetId`, and the drawer's `openConfigurator({ print, imageUrl })` already receives `print`. Add `assetId: asset.assetId` to `publicPrintForAsset`'s return and update its test to include it.

- [ ] **Step 5: Add `assetId` to `publicPrintForAsset`**

In `common/print/publicPrint.js` add `assetId: asset.assetId || null,` to the returned object; update `__tests__/common/publicPrint.test.js`'s sellable-subset assertion to include `assetId` (use `expect.objectContaining` or add the field to the asset + expected object).

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: PASS (no new failures beyond pre-existing).

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/print/PrintConfigurator.js components/image-displays/print/CheckoutStep.js components/image-displays/print/PrintStoreContext.js components/image-displays/gallery/Gallery.js common/print/publicPrint.js __tests__/components/CheckoutStep.test.js __tests__/common/publicPrint.test.js
git commit -m "feat(print-sale): drawer address + quote + redirect to Stripe Checkout"
```

---

### Task 11: Admin — Connect payouts control + full manual smoke

**Files:**
- Modify: `components/admin/platform/SiteSettingsPopover.js` (Print store view: add a Connect payouts control)

**Interfaces:**
- Consumes: `POST /api/admin/print/connect`, `GET /api/admin/print/connect/status`.
- Produces: in the Print store settings view, a **"Connect payouts"** button (calls connect → `window.location = url`) and a status line (calls status → shows "Payouts connected" when `chargesEnabled`, else "Connect required to sell").

- [ ] **Step 1: Add the control to the Print store view**

In the `view === 'print'` block of `SiteSettingsPopover.js`, add (below the existing enable/markup/show-price controls) a payouts row: a status line driven by a `GET /api/admin/print/connect/status` call on mount, and a button that `POST`s `/api/admin/print/connect` then `window.location = url`. Match the file's existing control styling (`inputCls`, `ToggleSwitch` patterns, the note-paragraph style). Show "Payouts connected ✓" when `chargesEnabled`, otherwise a "Connect payouts" button and the note "Required before you can sell prints."

- [ ] **Step 2: Confirm compile**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin` → expect 200 (do NOT `next build`).

- [ ] **Step 3: Full manual smoke (Stripe test mode)**

Prereq: the human has set `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` (test) in `.env.local`, and is running `stripe listen --forward-to localhost:3000/api/stripe/webhook` (its `whsec_...` set as `STRIPE_WEBHOOK_SECRET`). Restart `next dev` after setting env.

1. In admin → site settings → Print store: click **Connect payouts** → complete Stripe Express **test** onboarding → return → status shows "Payouts connected."
2. Enable the store, set a markup, ensure an image is sellable.
3. On the public site, open a sellable image → **Buy a print** → configure → **Buy this print** → enter a shipping address → see shipping + total → **Pay**.
4. On Stripe Checkout (test), pay with `4242 4242 4242 4242`, any future expiry/CVC.
5. Land on `/print/confirmation`. Confirm in `stripe listen` output that `checkout.session.completed` fired and returned 200.
6. Confirm the order in R2 (`users/{userId}/orders/…json`) has `status: "paid"` and the correct `amounts` split.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/SiteSettingsPopover.js
git commit -m "feat(print-sale): Connect payouts control in print settings"
```

---

## What this plan delivers

A photographer connects Stripe (Express, test), enables the store, and marks an image sellable. A buyer configures a print, enters an address, gets a real (mock-adapter) quote, pays with a Stripe **test** card via hosted Checkout, and an order is recorded and marked **paid** by the Stripe webhook — the entire commercial loop minus the physical print.

## Deferred to later phases

- **Phase 2 (fulfillment):** real Prodigi adapter; the Stripe webhook places the Prodigi (sandbox) order; a Prodigi webhook updates tracking; the admin **Orders view**; buyer/photographer emails.
- **Phase 3 (go-live):** swap to `sepia.photo`, register production webhooks + redirect URLs there, flip to live Stripe + Prodigi keys, place a real order.

## Self-review notes

- **Spec coverage:** onboarding (§1) → Tasks 1,5,11. Checkout flow (§2) → Tasks 6,7,9,10. Money mechanics (§3) → Tasks 2,4,6,7 (the split is computed in `orderPricing`/`quoteOrder` and applied via `buildCheckoutSessionParams` + the `stripeAccount` request option). Data model (§6) → Tasks 1,3,7. Setup (§7) → Task 1 + Task 11 smoke. Fulfillment (§4), Orders view (§5), emails → deferred to Phase 2 (explicit).
- **Type consistency:** `amounts` shape (`retail/printCost/shippingCost/platformFee/applicationFee/profit/total/currency`) is identical across `orderPricing`, `quoteOrder`, the order record, and `buildCheckoutSessionParams`. The `spec` shape matches Plan 2. `metadata { orderId, userId }` is written in Task 7's builder and read in Task 8's webhook.
- **No placeholders:** pure tasks (2,3,4,6,10-CheckoutStep) carry full TDD; the Stripe-I/O routes (5,7,8) and admin/UI wiring (10-drawer,11) carry complete code and are explicitly verified by the Task 11 manual smoke against Stripe test mode + the Stripe CLI.
- **Security:** amounts are recomputed server-side at checkout (never trust client totals); secrets stay in `.env.local`; the webhook verifies the Stripe signature; `platformFeePct` is not exposed in the public quote.
