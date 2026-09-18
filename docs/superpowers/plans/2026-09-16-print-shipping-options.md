# Photographer-chosen shipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the photographer choose Budget vs Standard shipping and optionally offer "Free shipping" (funded by a flat per-print buffer), plus opt-in charm-9 price rounding — all from the Print store settings.

**Architecture:** Four new `printStore` config fields drive the pricing pipeline. Pure money math in `orderPricing`/`quoteOrder`/`pricing` gains free-shipping + rounding branches; the Prodigi adapter takes a shipping method (with a Budget→Standard fallback) that's persisted on the order at checkout and reused at placement; the settings UI and checkout display expose it.

**Tech Stack:** Next.js (pages router), React, Jest. Money is integer cents.

**Spec:** `docs/superpowers/specs/2026-09-16-print-shipping-options-design.md`

## Global Constraints

- Money is integer minor units (cents). Config `shippingBuffer` is cents.
- Defaults preserve today's behavior exactly: `shippingMethod:'standard'`, `freeShipping:false`, `shippingBuffer:800`, `priceRounding:'nearest5'`.
- Attr vocabularies (exact): `shippingMethod` ∈ `'standard'|'budget'`; `priceRounding` ∈ `'nearest5'|'charm9'`. Prodigi API wants capitalized `'Standard'|'Budget'`.
- Free-shipping accounting (verbatim from spec): `total = retail + buffer`; buyer-facing `shippingCost = 0`; `applicationFee = printCost + actualShipping + platformFee`; `platformFee = round(retail * pct)` (on retail, not buffer); keep the `applicationFee ≤ total` guard.
- Quote method and place-order method MUST match for an order (persist the resolved method).
- Run tests with `node_modules/.bin/jest <file>` (NOT npx). Ignore the ~27 pre-existing AWS-SDK/node-20 suite-load failures — only touched suites matter.

---

### Task 1: printStore config fields (`common/siteConfig.js`)

**Files:**
- Modify: `common/siteConfig.js` (the `normalizePrintStore` / printStore defaults — search `markup` and `platformFeePct`)
- Test: `__tests__/common/siteConfig.test.js` (append)

**Interfaces:**
- Produces: normalized `printStore` always carries `shippingMethod:'standard'|'budget'`, `freeShipping:boolean`, `shippingBuffer:number(cents,≥0)`, `priceRounding:'nearest5'|'charm9'` with the defaults above; invalid values clamp to the default.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/siteConfig.test.js
import { normalizePrintStore } from '../../common/siteConfig'

describe('printStore shipping options', () => {
  it('defaults preserve current behavior', () => {
    const ps = normalizePrintStore({}).printStore
    expect(ps.shippingMethod).toBe('standard')
    expect(ps.freeShipping).toBe(false)
    expect(ps.shippingBuffer).toBe(800)
    expect(ps.priceRounding).toBe('nearest5')
  })
  it('keeps valid values and clamps invalid ones', () => {
    const ps = normalizePrintStore({ printStore: { shippingMethod: 'budget', freeShipping: true, shippingBuffer: 1200, priceRounding: 'charm9' } }).printStore
    expect(ps).toMatchObject({ shippingMethod: 'budget', freeShipping: true, shippingBuffer: 1200, priceRounding: 'charm9' })
    const bad = normalizePrintStore({ printStore: { shippingMethod: 'x', priceRounding: 'y', shippingBuffer: -5 } }).printStore
    expect(bad).toMatchObject({ shippingMethod: 'standard', priceRounding: 'nearest5', shippingBuffer: 0 })
  })
})
```

- [ ] **Step 2: Run — verify fail.** `node_modules/.bin/jest __tests__/common/siteConfig.test.js -t "printStore shipping options"` → FAIL (fields undefined).

- [ ] **Step 3: Implement.** In `normalizePrintStore`, where the print store object is built with `markup`/`currency`/`platformFeePct`, add (read the file for the exact object; add these alongside the existing fields):

```js
const SHIP_METHODS = ['standard', 'budget']
const ROUNDINGS = ['nearest5', 'charm9']
// ...inside the normalized printStore object:
shippingMethod: SHIP_METHODS.includes(ps.shippingMethod) ? ps.shippingMethod : 'standard',
freeShipping: !!ps.freeShipping,
shippingBuffer: Number.isFinite(ps.shippingBuffer) && ps.shippingBuffer >= 0 ? Math.round(ps.shippingBuffer) : (ps.shippingBuffer === undefined ? 800 : 0),
priceRounding: ROUNDINGS.includes(ps.priceRounding) ? ps.priceRounding : 'nearest5',
```

(where `ps` is the raw input printStore — match the file's existing variable name.)

- [ ] **Step 4: Run — verify pass.**

- [ ] **Step 5: Commit.** `git add common/siteConfig.js __tests__/common/siteConfig.test.js && git commit -m "feat(print): printStore shipping-method / free-shipping / rounding config"`

---

### Task 2: charm-9 rounding (`common/print/pricing.js`)

**Files:**
- Modify: `common/print/pricing.js`
- Test: `__tests__/common/pricing.test.js` (append)

**Interfaces:**
- Produces: `computeRetail(labCost, markup, opts?)` where `opts.rounding ∈ 'nearest5'|'charm9'` (default `'nearest5'`). `roundCharm9(n)` rounds up to the next whole dollar ending in 9. Existing 2-arg callers keep working (default rounding).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/pricing.test.js
import { computeRetail, roundCharm9 } from '../../common/print/pricing'

describe('charm-9 rounding', () => {
  it('rounds up to the next dollar ending in 9', () => {
    expect(roundCharm9(34)).toBe(39)
    expect(roundCharm9(39)).toBe(39)
    expect(roundCharm9(40)).toBe(49)
    expect(roundCharm9(9)).toBe(9)
    expect(roundCharm9(1)).toBe(9)
  })
  it('computeRetail honors the rounding mode; default is nearest5', () => {
    expect(computeRetail(13, 3)).toBe(40)                       // 39 -> nearest5 -> 40
    expect(computeRetail(13, 3, { rounding: 'charm9' })).toBe(39)
    expect(computeRetail(13, 3, { rounding: 'nearest5' })).toBe(40)
  })
})
```

- [ ] **Step 2: Run — verify fail.** `node_modules/.bin/jest __tests__/common/pricing.test.js -t "charm-9"` → FAIL.

- [ ] **Step 3: Implement** in `common/print/pricing.js`:

```js
export function roundPrice(n) {
  return Math.ceil(n / 5) * 5
}

// Round up to the next whole dollar ending in 9 (…,9,19,29,39,…).
export function roundCharm9(n) {
  return Math.ceil((n + 1) / 10) * 10 - 1
}

export function computeRetail(labCost, markup, { rounding = 'nearest5' } = {}) {
  const raw = labCost * markup
  return rounding === 'charm9' ? roundCharm9(raw) : roundPrice(raw)
}
```

(Leave `lineCost`/`buildPriceMatrix` as-is; `buildPriceMatrix` keeps calling `computeRetail(labCost, markup)` with default rounding — acceptable for the admin matrix in v1.)

- [ ] **Step 4: Run — verify pass.**

- [ ] **Step 5: Commit.** `git add common/print/pricing.js __tests__/common/pricing.test.js && git commit -m "feat(print): charm-9 price rounding option"`

---

### Task 3: free-shipping amounts (`common/print/orderPricing.js`)

**Files:**
- Modify: `common/print/orderPricing.js`
- Test: `__tests__/common/orderPricing.test.js` (create if absent; else append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildAmounts({ retail, printCost, shippingCost, platformFeePct, currency, freeShipping = false, shippingBuffer = 0 })`. Standard mode unchanged. Free mode returns `shippingCost: 0`, adds `shippingFree: true`, `actualShippingCost` (the real Prodigi shipping), `total = retail + shippingBuffer`, `applicationFee = printCost + actualShipping + platformFee`. Guard `applicationFee ≤ total` retained.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/orderPricing.test.js
import { buildAmounts } from '../../common/print/orderPricing'

describe('buildAmounts free shipping', () => {
  const base = { retail: 6000, printCost: 2000, shippingCost: 700, platformFeePct: 15, currency: 'USD' }
  it('standard mode is unchanged', () => {
    const a = buildAmounts(base)
    expect(a).toMatchObject({ total: 6700, shippingCost: 700, applicationFee: 2000 + 700 + 900, profit: 6000 - 2000 - 900, shippingFree: false })
  })
  it('free shipping folds the buffer into total, hides buyer shipping, keeps actual shipping in the fee', () => {
    const a = buildAmounts({ ...base, freeShipping: true, shippingBuffer: 1000 })
    expect(a.total).toBe(7000)                    // retail 6000 + buffer 1000
    expect(a.shippingCost).toBe(0)                // buyer sees free
    expect(a.actualShippingCost).toBe(700)
    expect(a.platformFee).toBe(900)               // 15% of retail (not buffer)
    expect(a.applicationFee).toBe(2000 + 700 + 900)
    expect(a.profit).toBe(7000 - (2000 + 700 + 900))
    expect(a.shippingFree).toBe(true)
  })
  it('guards when costs exceed the buyer charge (cheap print, pricey international)', () => {
    expect(() => buildAmounts({ retail: 1500, printCost: 2000, shippingCost: 3000, platformFeePct: 0, freeShipping: true, shippingBuffer: 500 }))
      .toThrow(/application fee exceeds/)
  })
})
```

- [ ] **Step 2: Run — verify fail.** `node_modules/.bin/jest __tests__/common/orderPricing.test.js` → FAIL.

- [ ] **Step 3: Implement** — replace `common/print/orderPricing.js` with:

```js
// Pure money math for one print order. All amounts are integer minor units (cents).
export function buildAmounts({ retail, printCost, shippingCost, platformFeePct = 0, currency = 'USD', freeShipping = false, shippingBuffer = 0 }) {
  const platformFee = Math.round(retail * (platformFeePct / 100))
  if (freeShipping) {
    // Buffer folds into the price; the buyer sees no shipping line, but Prodigi
    // still bills the real shipping, so it stays in the application fee.
    const total = retail + shippingBuffer
    const applicationFee = printCost + shippingCost + platformFee
    const profit = total - applicationFee
    if (applicationFee > total) throw new Error('markup too low: application fee exceeds the buyer charge')
    return { retail, printCost, shippingCost: 0, actualShippingCost: shippingCost, shippingBuffer, shippingFree: true, platformFee, applicationFee, profit, total, currency }
  }
  const total = retail + shippingCost
  const applicationFee = printCost + shippingCost + platformFee
  const profit = retail - printCost - platformFee
  if (applicationFee > total) throw new Error('markup too low: application fee exceeds the buyer charge')
  return { retail, printCost, shippingCost, platformFee, applicationFee, profit, total, currency, shippingFree: false }
}
```

- [ ] **Step 4: Run — verify pass.**

- [ ] **Step 5: Commit.** `git add common/print/orderPricing.js __tests__/common/orderPricing.test.js && git commit -m "feat(print): free-shipping amounts (buffer folded into total)"`

---

### Task 4: thread options through the quote (`common/print/quoteOrder.js`)

**Files:**
- Modify: `common/print/quoteOrder.js`
- Test: `__tests__/common/quoteOrder.test.js` (create if absent)

**Interfaces:**
- Consumes: `computeRetail(cost, markup, {rounding})` (Task 2), `buildAmounts({..., freeShipping, shippingBuffer})` (Task 3), `adapter.getQuote(spec, address, method)` (Task 5 — treat `method` as a string the adapter accepts; a mock adapter may ignore it).
- Produces: `quoteOrder({ spec, markup, platformFeePct, currency, adapter, address, shippingMethod='standard', freeShipping=false, shippingBuffer=0, rounding='nearest5' })` → the amounts object plus `shippingMethod` echoed back (the resolved method the adapter used, read from the quote result's `shippingMethod` if present, else the requested one).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/quoteOrder.test.js
import { quoteOrder } from '../../common/print/quoteOrder'

const adapter = { getQuote: jest.fn(async (_spec, _addr, method) => ({ cost: 20, shipping: 7, currency: 'USD', shippingMethod: method || 'Standard' })) }
beforeEach(() => adapter.getQuote.mockClear())

it('passes the shipping method to the adapter and echoes it back', async () => {
  const a = await quoteOrder({ spec: {}, markup: 3, platformFeePct: 0, adapter, address: {}, shippingMethod: 'budget' })
  expect(adapter.getQuote).toHaveBeenCalledWith({}, {}, 'budget')
  expect(a.shippingMethod).toBe('budget')
})
it('free shipping folds the buffer and honors charm rounding', async () => {
  const a = await quoteOrder({ spec: {}, markup: 3, platformFeePct: 0, adapter, address: {}, freeShipping: true, shippingBuffer: 900, rounding: 'charm9' })
  // retail = computeRetail(20,3,charm9) = roundCharm9(60) = 69 -> 6900c; total = 6900 + 900
  expect(a.total).toBe(6900 + 900)
  expect(a.shippingCost).toBe(0)
  expect(a.shippingFree).toBe(true)
})
```

- [ ] **Step 2: Run — verify fail.**

- [ ] **Step 3: Implement** — replace `common/print/quoteOrder.js` with:

```js
import { computeRetail } from './pricing'
import { buildAmounts } from './orderPricing'

const toCents = (n) => Math.round(n * 100)

export async function quoteOrder({ spec, markup, platformFeePct = 0, currency = 'USD', adapter, address, shippingMethod = 'standard', freeShipping = false, shippingBuffer = 0, rounding = 'nearest5' }) {
  const q = await adapter.getQuote(spec, address, shippingMethod)
  const printCost = toCents(q.cost)
  const shippingCost = toCents(q.shipping)
  const retail = toCents(computeRetail(q.cost, markup, { rounding }))
  const amounts = buildAmounts({ retail, printCost, shippingCost, platformFeePct, currency: q.currency || currency, freeShipping, shippingBuffer })
  // Echo the method the adapter actually used (it may have fallen back).
  return { ...amounts, shippingMethod: q.shippingMethod || shippingMethod }
}
```

- [ ] **Step 4: Run — verify pass.**

- [ ] **Step 5: Commit.** `git add common/print/quoteOrder.js __tests__/common/quoteOrder.test.js && git commit -m "feat(print): thread shipping method / free-shipping / rounding through quoteOrder"`

---

### Task 5: Prodigi adapter shipping method + fallback (`common/fulfillment/prodigi.js`)

**Files:**
- Modify: `common/fulfillment/prodigi.js`
- Test: `__tests__/common/prodigiAdapter.test.js` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `getQuote(spec, address, method)` sends the mapped Prodigi method (`'budget'→'Budget'`, else `'Standard'`); on a Budget quote failure it retries once with `'Standard'`; on total failure it falls back to the seed quote. The returned quote carries `shippingMethod` (`'standard'|'budget'`) = what actually succeeded. `placeOrder(order)` reads `order.fulfillment?.shippingMethod` and sends the matching Prodigi method (default `'Standard'`). The mock adapter (`common/fulfillment/mockLabAdapter.js`) `getQuote` must accept and ignore the 3rd `method` arg (verify it already does; it uses `(spec, address)` so it's fine).

- [ ] **Step 1: Write the failing test.** Read the existing `__tests__/common/prodigiAdapter.test.js` to match its `prodigiFetch` mock style, then add:

```js
// asserts (using the file's existing prodigiFetch mock):
// 1. getQuote(spec, addr, 'budget') → the POST /v4.0/quotes body.shippingMethod === 'Budget'
// 2. when the Budget quote throws, getQuote retries with shippingMethod 'Standard' and resolves,
//    and the returned quote.shippingMethod === 'standard'
// 3. placeOrder for an order with fulfillment.shippingMethod === 'budget' sends body.shippingMethod 'Budget'
```

(Write the three concrete cases using the mock already in that file.)

- [ ] **Step 2: Run — verify fail.**

- [ ] **Step 3: Implement.** Add a mapper and use it. Rewrite `getQuote` + `placeOrder`:

```js
const PRODIGI_METHOD = { budget: 'Budget', standard: 'Standard' }
const prodigiMethod = (m) => PRODIGI_METHOD[m] || 'Standard'

async function quoteWithMethod(spec, address, method) {
  const mapped = mapSpecToProdigi(spec)
  const body = {
    shippingMethod: prodigiMethod(method),
    destinationCountryCode: (address?.country || 'US').toUpperCase(),
    items: [{ sku: mapped.sku, copies: mapped.copies, attributes: mapped.attributes, assets: [{ printArea: 'default' }] }],
  }
  const out = await prodigiFetch('/v4.0/quotes', { method: 'POST', body })
  const q = (out.quotes || [])[0]
  const cost = Number(q?.costSummary?.items?.amount)
  const shipping = Number(q?.costSummary?.shipping?.amount)
  const currency = q?.costSummary?.items?.currency
  if (!Number.isFinite(cost) || !Number.isFinite(shipping) || !currency) throw new Error('incomplete prodigi quote')
  return { cost, shipping, currency, shippingMethod: method === 'budget' ? 'budget' : 'standard' }
}

// in prodigiAdapter:
async getQuote(spec, address, method = 'standard') {
  try {
    return await quoteWithMethod(spec, address, method)
  } catch (err) {
    if (method === 'budget') {
      // Budget isn't offered for every product/destination — fall back to Standard
      // so the quoted price is real and matches what we'll place.
      try { return await quoteWithMethod(spec, address, 'standard') } catch (_) { /* fall through */ }
    }
    console.error('prodigi quote failed, using seed pricing:', err.message)
    const seed = await mockLabAdapter.getQuote(spec, address)
    return { ...seed, shippingMethod: 'standard' }
  }
},

async placeOrder(order) {
  const mapped = mapSpecToProdigi(order.spec)
  const body = {
    merchantReference: `${order.userId}:${order.id}`,
    shippingMethod: prodigiMethod(order.fulfillment?.shippingMethod),
    recipient: toRecipient(order.buyer),
    items: [ { sku: mapped.sku, copies: mapped.copies, sizing: mapped.sizing, attributes: mapped.attributes, assets: [{ printArea: 'default', url: order.print?.imageUrl }] } ],
  }
  const out = await prodigiFetch('/v4.0/Orders', { method: 'POST', body })
  if (!out?.order?.id) throw new Error(`prodigi: no order id in response: ${JSON.stringify(out)}`)
  return { labOrderId: out.order.id, status: 'placed' }
},
```

- [ ] **Step 4: Run — verify pass.** Also run `__tests__/common/mockLabAdapter.test.js` to confirm the mock still works with the extra arg.

- [ ] **Step 5: Commit.** `git add common/fulfillment/prodigi.js __tests__/common/prodigiAdapter.test.js && git commit -m "feat(print): Prodigi shipping method with Budget->Standard fallback"`

---

### Task 6: wire config into checkout + persist the method (`pages/api/print/checkout.js`)

**Files:**
- Modify: `pages/api/print/checkout.js`
- Test: `__tests__/api/purchaseCheckout.test.js` or the existing print-checkout test (find it: `grep -rl "print/checkout\|quoteOrder" __tests__`)

**Interfaces:**
- Consumes: `quoteOrder({..., shippingMethod, freeShipping, shippingBuffer, rounding})` (Task 4); `ps.shippingMethod/freeShipping/shippingBuffer/priceRounding` (Task 1).
- Produces: the created order carries the resolved method at `order.fulfillment.shippingMethod` (so Task 5's `placeOrder` uses it). `amounts` reflects the shipping options.

- [ ] **Step 1: Write/extend the failing test** — assert `quoteOrder` is called with the store's `shippingMethod`/`freeShipping`/`shippingBuffer`/`priceRounding` (as `rounding`) and that the saved order's `fulfillment.shippingMethod` equals the resolved method from the amounts. (Mock `quoteOrder`, `saveOrder`, Stripe, config reads as the existing test does.)

- [ ] **Step 2: Run — verify fail.**

- [ ] **Step 3: Implement.** In `checkout.js`, change the `quoteOrder` call and the order object:

```js
const amounts = await quoteOrder({
  spec, markup: ps.markup, platformFeePct, currency: ps.currency, adapter, address: buyer.address,
  shippingMethod: ps.shippingMethod, freeShipping: ps.freeShipping, shippingBuffer: ps.shippingBuffer, rounding: ps.priceRounding,
})
```
and set the resolved method on the order's fulfillment:
```js
fulfillment: { lab: 'prodigi', labOrderId: null, status: 'none', tracking: null, shippingMethod: amounts.shippingMethod || 'standard' },
```
(remove `shippingMethod` from the persisted `amounts` if you prefer it only on `fulfillment` — or leave it; harmless.)

- [ ] **Step 4: Run — verify pass.**

- [ ] **Step 5: Commit.** `git add pages/api/print/checkout.js __tests__/... && git commit -m "feat(print): checkout applies store shipping options + persists the resolved method"`

---

### Task 7: checkout display — Free shipping (`components/image-displays/print/CheckoutStep.js` + public "from" price)

**Files:**
- Modify: `components/image-displays/print/CheckoutStep.js` (the amounts block ~L56-61)
- Modify: the public product "from" price display — find it: `grep -rn "computeRetail\|from \$\|fromPrice\|priceLabel" components/image-displays/print/ common/print/publicPrint.js` — and include the buffer when `freeShipping` so the displayed price matches checkout.
- Test: `__tests__/components/checkoutStepFreeShipping.test.js` (create) or extend an existing CheckoutStep test.

**Interfaces:**
- Consumes: `amounts.shippingFree` + `amounts.total`/`amounts.shippingCost` (Task 3/4).

- [ ] **Step 1: Write the failing test**

```js
// render CheckoutStep with amounts having shippingFree:true and assert:
// - the shipping line shows "Free" (not a "$0.00")
// - no "Shipping $" dollar amount is shown
// and with shippingFree:false it shows "Shipping $X.XX" as before.
```
(Follow the existing CheckoutStep test's render/props; if none exists, render the component with a minimal `amounts` prop and the required handlers.)

- [ ] **Step 2: Run — verify fail.**

- [ ] **Step 3: Implement.** Replace the amounts block (`CheckoutStep.js:56-61`):

```jsx
{amounts && (
  <div style={{ fontFamily: SANS, fontSize: 13, color: '#5c4f3a', display: 'flex', justifyContent: 'space-between' }}>
    <span>Shipping {amounts.shippingFree ? 'Free' : `$${(amounts.shippingCost / 100).toFixed(2)}`}</span>
    <span>Total ${(amounts.total / 100).toFixed(2)}</span>
  </div>
)}
```
For the public "from" price: locate where retail is shown pre-checkout and, when the store's `freeShipping` is on, add `shippingBuffer` to the shown price (so product page and checkout agree). If the "from" price has no access to the store config, note it in your report and leave it for a follow-up rather than guessing.

- [ ] **Step 4: Run — verify pass.**

- [ ] **Step 5: Commit.** `git add components/image-displays/print/CheckoutStep.js __tests__/... && git commit -m "feat(print): checkout shows Free shipping when enabled"`

---

### Task 8: Print store settings UI (`components/admin/platform/SiteSettingsPopover.js`)

**Files:**
- Modify: `components/admin/platform/SiteSettingsPopover.js` (Pricing section, ~L317-355; markup field is the anchor)
- Test: `__tests__/components/printSettingsShipping.test.js` (create) — render the popover (or the Pricing subtree) and assert the controls exist + `updatePrintStore` is called with the right keys.

**Interfaces:**
- Consumes: `ps.shippingMethod/freeShipping/shippingBuffer/priceRounding`; `updatePrintStore(patch)` (already in the component).

- [ ] **Step 1: Write the failing test** — assert: a Standard/Budget control that calls `updatePrintStore({ shippingMethod: 'budget' })`; a Free-shipping toggle calling `updatePrintStore({ freeShipping: true })`; when free shipping is on, a buffer input calling `updatePrintStore({ shippingBuffer: <cents> })`; a rounding control calling `updatePrintStore({ priceRounding: 'charm9' })`. (Follow the popover's existing test setup, or render the Pricing block with a stub `updatePrintStore`/`ps`.)

- [ ] **Step 2: Run — verify fail.**

- [ ] **Step 3: Implement.** In the Pricing section, after the markup `<Field>`, add (reusing the file's `Field`, `inputCls`, `inputStyle`, `ToggleSwitch` and its copy conventions):
  - **Shipping speed** — two options (Standard / Budget) via a small toggle or two buttons; on change `updatePrintStore({ shippingMethod })`. Copy under it: Standard = "Tracked, faster (~3–7 days). ~$25 to the US." Budget = "Cheaper (~$5–8), slower, and may not be tracked."
  - **Free shipping** — `ToggleSwitch` bound to `ps.freeShipping`, `updatePrintStore({ freeShipping: !ps.freeShipping })`. When on, reveal a **buffer** number input (shown in dollars, stored in cents: value `= (ps.shippingBuffer/100)`, onChange `updatePrintStore({ shippingBuffer: Math.round(dollars*100) })`), with copy: "Added to every print to cover shipping. Covers domestic; international may cost more and comes out of your margin."
  - **Price rounding** — Standard `$5` vs `End in $9` toggle → `updatePrintStore({ priceRounding })`.
  - Update the existing example line to reflect free shipping (show the buffer folded in and "Free shipping" instead of a shipping cost) when `ps.freeShipping`.

- [ ] **Step 4: Run — verify pass.**

- [ ] **Step 5: Commit.** `git add components/admin/platform/SiteSettingsPopover.js __tests__/... && git commit -m "feat(print): shipping + rounding controls in the print store settings"`

---

### Task 9: Verify

- [ ] **Step 1:** Run every touched suite together:
```bash
node_modules/.bin/jest __tests__/common/siteConfig.test.js __tests__/common/pricing.test.js __tests__/common/orderPricing.test.js __tests__/common/quoteOrder.test.js __tests__/common/prodigiAdapter.test.js __tests__/api/purchaseCheckout.test.js __tests__/components/checkoutStepFreeShipping.test.js __tests__/components/printSettingsShipping.test.js __tests__/common/mockLabAdapter.test.js
```
Expected: all PASS.
- [ ] **Step 2 (manual, post-merge):** in the studio, toggle Budget and confirm a checkout quote drops; toggle Free shipping + set a buffer and confirm checkout shows "Free" with the price bumped; confirm a Budget order still places (Standard fallback if unsupported).

---

## Self-Review

- **Spec coverage:** config fields (T1) ✓; charm-9 (T2) ✓; free-shipping amounts + guard (T3) ✓; method/free/rounding through quote (T4) ✓; adapter method + Budget→Standard fallback + place-order method (T5) ✓; checkout applies + persists method (T6) ✓; Free-shipping display (T7) ✓; settings UI + copy + international warning (T8) ✓; verify (T9) ✓. Per-zone buffers / charm-in-matrix / restrict-countries are explicit non-goals.
- **Placeholder scan:** the softest steps are T5/T6/T7/T8 test bodies that point at existing test files' setup — the implementer must read those files and follow their patterns (as in the markdown plan). T7's "from" price step says to report-and-defer if the config isn't reachable rather than guess. No "TODO/handle edge cases" left.
- **Type consistency:** `shippingMethod`/`freeShipping`/`shippingBuffer`/`priceRounding` (config, lowercase) vs Prodigi `'Standard'|'Budget'` (mapped in T5) are consistent; `buildAmounts` free-mode return (`shippingFree`, `actualShippingCost`, `total`) matches what T4/T7 consume; `quoteOrder` echoes `shippingMethod` which T6 persists at `order.fulfillment.shippingMethod` which T5's `placeOrder` reads.
