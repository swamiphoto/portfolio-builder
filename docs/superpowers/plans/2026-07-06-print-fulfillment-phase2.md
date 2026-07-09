# Print Store Phase 2 — Prodigi Fulfillment, Tracking, Orders & Emails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the print-store fulfillment loop — when a buyer pays, the Stripe webhook places a Prodigi (sandbox) order, a Prodigi webhook updates tracking, the photographer sees the order in an admin Orders view, and buyer/photographer emails go out.

**Architecture:** A real `common/fulfillment/prodigi.js` adapter (SKU map + thin HTTP client) implements `placeOrder`/`getTracking` against Prodigi's REST API; the router returns it when `PRODIGI_API_KEY` is set, else the existing mock. Order placement is triggered from `pages/api/stripe/webhook.js` via a pure, idempotent `placeOrderForPaidOrder` orchestrator. A `pages/api/prodigi/webhook.js` callback updates status/tracking and emails the buyer. A `common/email` mailer (nodemailer, no-op when unconfigured) sends the photographer-sale and buyer-shipped notifications. An admin Orders page reads `listOrders`.

**Tech Stack:** Next.js (pages router), Node 20, Jest (`next/jest`, jsdom), nodemailer (already a dep), Stripe SDK (installed), R2/GCS JSON config, Prodigi REST API (sandbox).

## Global Constraints

- **All money is integer minor units (cents).** Never introduce floats into amounts.
- **Sandbox-first.** Build and unit-test with mocked network/transport. Live sandbox order placement and real email delivery are gated on env keys that are **not yet present** (`PRODIGI_API_KEY`, `SMTP_USER`/`SMTP_PASS`) — see "Owner action items" at the end. Do not block code/tests on them.
- **Idempotency is mandatory.** Placing an order is keyed on `order.fulfillment.labOrderId` (never double-place). Tracking updates are keyed on `order.status` (never re-email an already-shipped order).
- **Never trust client amounts.** All amounts already come from the server-recomputed order record; do not accept amounts from webhooks or the client.
- **Do not break existing tests.** Existing checkout/quote tests rely on `getAdapterForCountry` returning deterministic catalog pricing when unkeyed. The Prodigi adapter's `getCost`/`getShippingQuote` MUST return the same seed-catalog numbers as the mock (live Prodigi quote wiring is a go-live gate — see Task 3 note).
- **Prodigi env:** base URL is `https://api.sandbox.prodigi.com` (sandbox) or `https://api.prodigi.com` (live), auth header `X-API-Key: <PRODIGI_API_KEY>`, API version path prefix `/v4.0`.
- **Test runner:** `npm test -- <path>` runs a single file. Tests live in `__tests__/`. Follow existing style (plain `describe/it`, `jest.mock` for module boundaries).
- **Commit after each task** with a `feat(print-fulfillment):` / `test(...)` prefix, matching existing history (`feat(print-sale): ...`).

---

## File Structure

**New files:**
- `common/fulfillment/prodigiSkuMap.js` — pure `mapSpecToProdigi(spec)` → Prodigi SKU + attributes (best-effort map, CONFIRM-BEFORE-GO-LIVE).
- `common/fulfillment/prodigiClient.js` — thin `prodigiFetch(path, opts)` HTTP client (env base URL + `X-API-Key`).
- `common/fulfillment/prodigi.js` — the adapter: `getCatalog/getCost/getShippingQuote/placeOrder/getTracking`.
- `common/fulfillment/placeOrderForPaidOrder.js` — idempotent orchestrator invoked by the Stripe webhook.
- `common/email/mailer.js` — `sendMail({to,subject,html,text})` via nodemailer; no-op when SMTP unconfigured.
- `common/email/templates.js` — `photographerSaleEmail`, `buyerShippedEmail`.
- `pages/api/prodigi/webhook.js` — Prodigi status/tracking callback.
- `pages/api/admin/print/orders.js` — Orders list data (withAuth).
- `pages/admin/orders.js` — admin Orders view page.
- Tests under `__tests__/common/` and `__tests__/api/` (one per task, listed inline).

**Modified files:**
- `common/fulfillment/router.js` — return Prodigi adapter when `PRODIGI_API_KEY` set, else mock.
- `common/print/publicPrint.js` — add pure `printImageRef(asset)` helper.
- `pages/api/print/checkout.js` — persist `order.print = { masterStorageKey, imageUrl }` at order creation.
- `pages/api/stripe/webhook.js` — after flipping `paid`, place the Prodigi order (idempotent) + notify photographer.
- `components/admin/platform/SiteSettingsPopover.js` — "View orders" link in the print drill-in.

---

## Task 1: Prodigi SKU mapping

Pure translation from our `spec` (`{ size, finish, frame, frameColor, matte }`) to a Prodigi SKU + attributes. Prodigi encodes framing in the SKU itself; finish/frame-color/matte become attributes. The concrete SKU strings are **best-effort** and must be reconciled against the real Prodigi catalog before go-live — unmapped combinations throw (the order will land in `fulfillment_failed`, a designed state), rather than silently placing a wrong product.

**Files:**
- Create: `common/fulfillment/prodigiSkuMap.js`
- Test: `__tests__/common/prodigiSkuMap.test.js`

**Interfaces:**
- Consumes: the `spec` shape `{ size: '16x24', finish: 'lustre'|'matte'|'metal', frame: 'none'|'wood'|'metal', frameColor?: string, matte?: boolean }`.
- Produces: `mapSpecToProdigi(spec) -> { sku: string, copies: number, sizing: 'fillPrintArea', attributes: object }`; throws `Error('unmapped prodigi spec: <detail>')` when no mapping exists.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/common/prodigiSkuMap.test.js
import { mapSpecToProdigi } from '../../common/fulfillment/prodigiSkuMap'

describe('mapSpecToProdigi', () => {
  it('maps an unframed lustre print to a global fine-art SKU with copies and sizing', () => {
    const out = mapSpecToProdigi({ size: '16x20', finish: 'lustre', frame: 'none' })
    expect(out.sku).toBe('GLOBAL-FAP-16x20')
    expect(out.copies).toBe(1)
    expect(out.sizing).toBe('fillPrintArea')
    expect(out.attributes.paperType).toBe('SAP') // semi/lustre art paper
  })

  it('maps a wood-framed print to a framed SKU and carries frame color + matte attributes', () => {
    const out = mapSpecToProdigi({ size: '16x20', finish: 'matte', frame: 'wood', frameColor: 'black', matte: true })
    expect(out.sku).toBe('GLOBAL-CFPM-16x20') // classic framed print, matte mount
    expect(out.attributes.frameColour).toBe('black')
    expect(out.attributes.mountColour).toBe('snow')
  })

  it('throws on an unmapped size', () => {
    expect(() => mapSpecToProdigi({ size: '99x99', finish: 'lustre', frame: 'none' }))
      .toThrow(/unmapped prodigi spec/)
  })

  it('throws on an unmapped frame', () => {
    expect(() => mapSpecToProdigi({ size: '16x20', finish: 'lustre', frame: 'gilded' }))
      .toThrow(/unmapped prodigi spec/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/prodigiSkuMap.test.js`
Expected: FAIL — `Cannot find module '../../common/fulfillment/prodigiSkuMap'`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/fulfillment/prodigiSkuMap.js
//
// Maps our print spec -> Prodigi SKU + attributes.
//
// ⚠️ CONFIRM BEFORE GO-LIVE: these SKU strings and attribute keys are a
// best-effort mapping to Prodigi's Global product range and MUST be reconciled
// against the real Prodigi catalog on the approved account (the standing
// print-store pricing/catalog blocker). Unmapped combinations throw so a wrong
// product is never silently ordered — the order lands in `fulfillment_failed`.

// Our finish -> Prodigi paperType attribute.
const PAPER_BY_FINISH = {
  lustre: 'SAP', // smooth/semi-gloss art paper
  matte: 'EMA', // enhanced matte art
  metal: 'MET', // metal / aluminium
}

// Our matte (mount) on/off -> Prodigi mountColour.
const MOUNT_COLOUR = 'snow'

// size id -> the "WxH" fragment used in the SKU.
const SIZE_FRAGMENT = {
  '8x10': '8x10',
  '11x14': '11x14',
  '16x20': '16x20',
  '16x24': '16x24',
  '24x36': '24x36',
}

export function mapSpecToProdigi(spec) {
  const { size, finish, frame, frameColor, matte } = spec || {}
  const frag = SIZE_FRAGMENT[size]
  const paperType = PAPER_BY_FINISH[finish]
  if (!frag || !paperType) {
    throw new Error(`unmapped prodigi spec: size=${size} finish=${finish}`)
  }

  const attributes = { paperType }
  let sku

  if (frame === 'none') {
    sku = `GLOBAL-FAP-${frag}` // fine art print, unframed
  } else if (frame === 'wood' || frame === 'metal') {
    // Classic framed print; "M" suffix denotes a mounted (matted) variant.
    sku = matte ? `GLOBAL-CFPM-${frag}` : `GLOBAL-CFP-${frag}`
    attributes.frameColour = frameColor || 'black'
    if (matte) attributes.mountColour = MOUNT_COLOUR
  } else {
    throw new Error(`unmapped prodigi spec: frame=${frame}`)
  }

  return { sku, copies: 1, sizing: 'fillPrintArea', attributes }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/prodigiSkuMap.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add common/fulfillment/prodigiSkuMap.js __tests__/common/prodigiSkuMap.test.js
git commit -m "feat(print-fulfillment): Prodigi SKU/attribute mapping"
```

---

## Task 2: Prodigi HTTP client

A thin wrapper over `fetch` that adds the base URL (by env), the `X-API-Key` header, JSON body/parse, and turns non-2xx into thrown errors with the response body for diagnostics.

**Files:**
- Create: `common/fulfillment/prodigiClient.js`
- Test: `__tests__/common/prodigiClient.test.js`

**Interfaces:**
- Consumes: `process.env.PRODIGI_API_KEY`, `process.env.PRODIGI_ENV` (`'sandbox'` default | `'live'`), optional `process.env.PRODIGI_BASE_URL` override.
- Produces: `prodigiFetch(path, { method = 'GET', body } = {}) -> Promise<object>`; `prodigiBaseUrl() -> string`. Throws `Error('prodigi <status>: <body>')` on non-2xx, `Error('PRODIGI_API_KEY not configured')` when unkeyed.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/common/prodigiClient.test.js
import { prodigiFetch, prodigiBaseUrl } from '../../common/fulfillment/prodigiClient'

describe('prodigiClient', () => {
  const OLD = process.env
  beforeEach(() => { process.env = { ...OLD, PRODIGI_API_KEY: 'test-key' } })
  afterEach(() => { process.env = OLD; jest.restoreAllMocks() })

  it('defaults to the sandbox base URL', () => {
    expect(prodigiBaseUrl()).toBe('https://api.sandbox.prodigi.com')
  })

  it('uses the live base URL when PRODIGI_ENV=live', () => {
    process.env.PRODIGI_ENV = 'live'
    expect(prodigiBaseUrl()).toBe('https://api.prodigi.com')
  })

  it('sends the API key header and parses JSON on success', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ order: { id: 'ord_1' } }),
    })
    global.fetch = fetchMock
    const out = await prodigiFetch('/v4.0/Orders', { method: 'POST', body: { a: 1 } })
    expect(out).toEqual({ order: { id: 'ord_1' } })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.sandbox.prodigi.com/v4.0/Orders')
    expect(opts.method).toBe('POST')
    expect(opts.headers['X-API-Key']).toBe('test-key')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual({ a: 1 })
  })

  it('throws with status and body on non-2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 422, text: async () => 'bad sku',
    })
    await expect(prodigiFetch('/v4.0/Orders', { method: 'POST', body: {} }))
      .rejects.toThrow(/prodigi 422: bad sku/)
  })

  it('throws when the API key is missing', async () => {
    delete process.env.PRODIGI_API_KEY
    await expect(prodigiFetch('/v4.0/Orders')).rejects.toThrow(/PRODIGI_API_KEY not configured/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/prodigiClient.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/fulfillment/prodigiClient.js
// Thin Prodigi REST client (server-side only). Base URL by env; X-API-Key auth.

export function prodigiBaseUrl() {
  if (process.env.PRODIGI_BASE_URL) return process.env.PRODIGI_BASE_URL
  return process.env.PRODIGI_ENV === 'live'
    ? 'https://api.prodigi.com'
    : 'https://api.sandbox.prodigi.com'
}

export async function prodigiFetch(path, { method = 'GET', body } = {}) {
  const key = process.env.PRODIGI_API_KEY
  if (!key) throw new Error('PRODIGI_API_KEY not configured')

  const res = await fetch(`${prodigiBaseUrl()}${path}`, {
    method,
    headers: {
      'X-API-Key': key,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    let detail = ''
    try { detail = await res.text() } catch (_) { /* ignore */ }
    throw new Error(`prodigi ${res.status}: ${detail}`)
  }
  return res.json()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/prodigiClient.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add common/fulfillment/prodigiClient.js __tests__/common/prodigiClient.test.js
git commit -m "feat(print-fulfillment): thin Prodigi HTTP client"
```

---

## Task 3: Prodigi adapter + router wiring

The adapter implements the fulfillment contract. `getCost`/`getShippingQuote`/`getCatalog` delegate to the seed catalog so quotes stay deterministic, offline-safe, and identical to the mock (existing checkout/quote tests must keep passing; live Prodigi quote wiring is a go-live gate given the pricing blocker). `placeOrder`/`getTracking` hit the live sandbox API via `prodigiFetch`. The router returns Prodigi only when `PRODIGI_API_KEY` is set.

**Files:**
- Create: `common/fulfillment/prodigi.js`
- Modify: `common/fulfillment/router.js`
- Test: `__tests__/common/prodigiAdapter.test.js`

**Interfaces:**
- Consumes: `mapSpecToProdigi` (Task 1), `prodigiFetch` (Task 2), `SEED_CATALOG`, `mockLabAdapter` (for shared cost math).
- Produces: `prodigiAdapter` with:
  - `getCatalog() -> catalog`
  - `getCost(spec) -> { cost, currency }` (cents-free dollar number, matching mock)
  - `getShippingQuote(spec, address) -> { cost, currency, etaDays }` (matching mock)
  - `placeOrder(order) -> Promise<{ labOrderId, status }>` where `order` has `{ id, userId, spec, buyer, print: { imageUrl } }`
  - `getTracking(labOrderId) -> Promise<{ status, tracking }>` (`tracking` = `{ carrier, number, url } | null`)
  - Router: `getAdapterForCountry(country)` returns `prodigiAdapter` when `process.env.PRODIGI_API_KEY` set, else `mockLabAdapter`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/common/prodigiAdapter.test.js
jest.mock('../../common/fulfillment/prodigiClient', () => ({
  prodigiFetch: jest.fn(),
}))
import { prodigiFetch } from '../../common/fulfillment/prodigiClient'
import { prodigiAdapter } from '../../common/fulfillment/prodigi'
import { mockLabAdapter } from '../../common/fulfillment/mockLabAdapter'
import { getAdapterForCountry } from '../../common/fulfillment/router'

const sampleOrder = {
  id: 'ord_1', userId: 'u1',
  spec: { size: '16x20', finish: 'lustre', frame: 'none' },
  buyer: { name: 'Ada', email: 'ada@example.com', address: { line1: '1 St', townOrCity: 'NYC', stateOrCounty: 'NY', postalCode: '10001', country: 'US' } },
  print: { imageUrl: 'https://cdn.example.com/print.jpg' },
}

describe('prodigiAdapter pricing parity with mock', () => {
  it('getCost matches the mock (seed catalog)', () => {
    expect(prodigiAdapter.getCost(sampleOrder.spec)).toEqual(mockLabAdapter.getCost(sampleOrder.spec))
  })
  it('getShippingQuote matches the mock', () => {
    const addr = sampleOrder.buyer.address
    expect(prodigiAdapter.getShippingQuote(sampleOrder.spec, addr)).toEqual(mockLabAdapter.getShippingQuote(sampleOrder.spec, addr))
  })
})

describe('prodigiAdapter.placeOrder', () => {
  beforeEach(() => prodigiFetch.mockReset())

  it('POSTs an order with merchantReference, recipient, and asset URL, returns labOrderId', async () => {
    prodigiFetch.mockResolvedValue({ order: { id: 'ord_prodigi_9', status: { stage: 'InProgress' } } })
    const out = await prodigiAdapter.placeOrder(sampleOrder)
    expect(out).toEqual({ labOrderId: 'ord_prodigi_9', status: 'placed' })

    const [path, opts] = prodigiFetch.mock.calls[0]
    expect(path).toBe('/v4.0/Orders')
    expect(opts.method).toBe('POST')
    expect(opts.body.merchantReference).toBe('u1:ord_1')
    expect(opts.body.recipient.email).toBe('ada@example.com')
    expect(opts.body.recipient.address.countryCode).toBe('US')
    expect(opts.body.items[0].sku).toBe('GLOBAL-FAP-16x20')
    expect(opts.body.items[0].assets[0].url).toBe('https://cdn.example.com/print.jpg')
  })
})

describe('prodigiAdapter.getTracking', () => {
  beforeEach(() => prodigiFetch.mockReset())

  it('reports shipped with carrier/number when a shipment exists', async () => {
    prodigiFetch.mockResolvedValue({
      order: { status: { stage: 'Complete' }, shipments: [{ carrier: { name: 'DHL' }, tracking: { number: 'TRK1', url: 'https://track/TRK1' } }] },
    })
    const out = await prodigiAdapter.getTracking('ord_prodigi_9')
    expect(prodigiFetch).toHaveBeenCalledWith('/v4.0/Orders/ord_prodigi_9')
    expect(out).toEqual({ status: 'shipped', tracking: { carrier: 'DHL', number: 'TRK1', url: 'https://track/TRK1' } })
  })

  it('reports in-progress with null tracking when no shipment yet', async () => {
    prodigiFetch.mockResolvedValue({ order: { status: { stage: 'InProgress' }, shipments: [] } })
    const out = await prodigiAdapter.getTracking('ord_prodigi_9')
    expect(out).toEqual({ status: 'placed', tracking: null })
  })
})

describe('getAdapterForCountry', () => {
  const OLD = process.env
  afterEach(() => { process.env = OLD })
  it('returns the mock when PRODIGI_API_KEY is unset', () => {
    process.env = { ...OLD }; delete process.env.PRODIGI_API_KEY
    expect(getAdapterForCountry('US')).toBe(mockLabAdapter)
  })
  it('returns the Prodigi adapter when PRODIGI_API_KEY is set', () => {
    process.env = { ...OLD, PRODIGI_API_KEY: 'k' }
    expect(getAdapterForCountry('US')).toBe(prodigiAdapter)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/prodigiAdapter.test.js`
Expected: FAIL — `common/fulfillment/prodigi` not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/fulfillment/prodigi.js
// Real Prodigi adapter. Pricing (getCost/getShippingQuote/getCatalog) delegates
// to the seed catalog for deterministic, offline-safe quotes — identical to the
// mock. Wiring live Prodigi quotes is a GO-LIVE gate (needs confirmed catalog
// pricing). placeOrder/getTracking hit the live sandbox API.
import { mockLabAdapter } from './mockLabAdapter'
import { mapSpecToProdigi } from './prodigiSkuMap'
import { prodigiFetch } from './prodigiClient'

// Prodigi shipment stage -> our fulfillment status.
function mapStage(stage) {
  if (stage === 'Complete' || stage === 'Shipped') return 'shipped'
  if (stage === 'Cancelled') return 'canceled'
  return 'placed'
}

function toRecipient(buyer) {
  const a = buyer.address || {}
  return {
    name: buyer.name || '',
    email: buyer.email || '',
    address: {
      line1: a.line1 || '',
      line2: a.line2 || '',
      postalOrZipCode: a.postalCode || '',
      countryCode: (a.country || 'US').toUpperCase(),
      townOrCity: a.townOrCity || a.city || '',
      stateOrCounty: a.stateOrCounty || a.region || '',
    },
  }
}

export const prodigiAdapter = {
  getCatalog: (...args) => mockLabAdapter.getCatalog(...args),
  getCost: (...args) => mockLabAdapter.getCost(...args),
  getShippingQuote: (...args) => mockLabAdapter.getShippingQuote(...args),

  async placeOrder(order) {
    const mapped = mapSpecToProdigi(order.spec)
    const body = {
      merchantReference: `${order.userId}:${order.id}`,
      shippingMethod: 'Standard',
      recipient: toRecipient(order.buyer),
      items: [
        {
          sku: mapped.sku,
          copies: mapped.copies,
          sizing: mapped.sizing,
          attributes: mapped.attributes,
          assets: [{ printArea: 'default', url: order.print?.imageUrl }],
        },
      ],
    }
    const out = await prodigiFetch('/v4.0/Orders', { method: 'POST', body })
    return { labOrderId: out.order.id, status: 'placed' }
  },

  async getTracking(labOrderId) {
    const out = await prodigiFetch(`/v4.0/Orders/${labOrderId}`)
    const order = out.order || {}
    const status = mapStage(order.status?.stage)
    const shipment = (order.shipments || [])[0]
    const tracking = shipment
      ? {
          carrier: shipment.carrier?.name || null,
          number: shipment.tracking?.number || null,
          url: shipment.tracking?.url || null,
        }
      : null
    return { status, tracking }
  },
}
```

- [ ] **Step 4: Update the router**

```javascript
// common/fulfillment/router.js
// Selects a lab adapter. Returns the real Prodigi adapter when PRODIGI_API_KEY
// is configured (Prodigi ships worldwide); otherwise the deterministic mock so
// dev/test work offline. WHCC (US) can be added later behind the same interface.
import { mockLabAdapter } from './mockLabAdapter'
import { prodigiAdapter } from './prodigi'

export function getAdapterForCountry(_country) {
  return process.env.PRODIGI_API_KEY ? prodigiAdapter : mockLabAdapter
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- __tests__/common/prodigiAdapter.test.js __tests__/common/quoteOrder.test.js`
Expected: PASS — new adapter tests pass AND the existing `quoteOrder` test still passes (parity preserved).

- [ ] **Step 6: Commit**

```bash
git add common/fulfillment/prodigi.js common/fulfillment/router.js __tests__/common/prodigiAdapter.test.js
git commit -m "feat(print-fulfillment): Prodigi adapter (placeOrder/getTracking) + router wiring"
```

---

## Task 4: Persist the print image URL on the order at checkout

Prodigi fetches the print file from a public URL. The webhook must have that URL without re-resolving the asset, so store it on the order at creation. Add a pure `printImageRef(asset)` helper and wire it into the checkout route.

**Files:**
- Modify: `common/print/publicPrint.js`
- Modify: `pages/api/print/checkout.js:41-52` (the `order` object literal)
- Test: `__tests__/common/printImageRef.test.js`

**Interfaces:**
- Consumes: an asset with `print.masterStorageKey`; `PUBLIC_URL` from `common/gcsClient`.
- Produces: `printImageRef(asset) -> { masterStorageKey, imageUrl } | null`; the checkout order gains `print: { masterStorageKey, imageUrl }`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/common/printImageRef.test.js
jest.mock('../../common/gcsClient', () => ({ PUBLIC_URL: 'https://cdn.example.com' }))
import { printImageRef } from '../../common/print/publicPrint'

describe('printImageRef', () => {
  it('builds a public URL from the master storage key', () => {
    const asset = { print: { sellable: true, masterStorageKey: 'users/u1/print-masters/pic.jpg' } }
    expect(printImageRef(asset)).toEqual({
      masterStorageKey: 'users/u1/print-masters/pic.jpg',
      imageUrl: 'https://cdn.example.com/users/u1/print-masters/pic.jpg',
    })
  })

  it('returns null when there is no master storage key', () => {
    expect(printImageRef({ print: { sellable: true } })).toBeNull()
    expect(printImageRef(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/printImageRef.test.js`
Expected: FAIL — `printImageRef` is not exported.

- [ ] **Step 3: Add the helper to `common/print/publicPrint.js`**

Add this import at the top of the file and the exported function at the end:

```javascript
import { PUBLIC_URL } from '../gcsClient'

// Server-safe reference to the high-res print file for fulfillment.
export function printImageRef(asset) {
  const key = asset && asset.print && asset.print.masterStorageKey
  if (!key) return null
  return { masterStorageKey: key, imageUrl: `${PUBLIC_URL}/${key}` }
}
```

- [ ] **Step 4: Wire it into `pages/api/print/checkout.js`**

Add the import near the other `common/print` imports:

```javascript
import { publicPrintForAsset, printImageRef } from '../../../common/print/publicPrint'
```

(Remove the now-duplicate `publicPrintForAsset` import line so it's imported once.) Then, in the `order` object literal, add a `print` field right after `spec`:

```javascript
    const order = {
      id: newOrderId(),
      userId: lookup.userId,
      status: 'pending',
      assetId,
      spec,
      print: printImageRef(asset),
      buyer,
      amounts,
      stripe: { sessionId: null, paymentIntentId: null, connectedAccountId: ps.stripeConnectAccountId },
      fulfillment: { lab: 'prodigi', labOrderId: null, status: 'none', tracking: null },
      createdAt: new Date().toISOString(),
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- __tests__/common/printImageRef.test.js __tests__/common/publicPrint.test.js`
Expected: PASS — new helper test passes and existing `publicPrint` tests still pass.

- [ ] **Step 6: Commit**

```bash
git add common/print/publicPrint.js pages/api/print/checkout.js __tests__/common/printImageRef.test.js
git commit -m "feat(print-fulfillment): persist print image URL on the order at checkout"
```

---

## Task 5: Email mailer

A single `sendMail` entry point over nodemailer. When SMTP creds are absent (current state), it logs and returns `{ sent: false }` instead of throwing — email is best-effort and must never break fulfillment. Uses `createTransport` (note: the existing `pages/api/contact.js` calls `createTransporter`, which is a bug; do not copy it).

**Files:**
- Create: `common/email/mailer.js`
- Test: `__tests__/common/mailer.test.js`

**Interfaces:**
- Consumes: `process.env.SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_PASS`, `process.env.MAIL_FROM` (default `"Sepia" <SMTP_USER>`).
- Produces: `sendMail({ to, subject, html, text }) -> Promise<{ sent: boolean }>`.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/common/mailer.test.js
const sendMailInner = jest.fn().mockResolvedValue({ messageId: 'm1' })
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: sendMailInner })),
}))
import nodemailer from 'nodemailer'
import { sendMail } from '../../common/email/mailer'

const OLD = process.env
beforeEach(() => { jest.clearAllMocks(); process.env = { ...OLD } })
afterEach(() => { process.env = OLD })

describe('sendMail', () => {
  it('no-ops (does not throw) when SMTP is unconfigured', async () => {
    delete process.env.SMTP_USER; delete process.env.SMTP_PASS
    const out = await sendMail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' })
    expect(out).toEqual({ sent: false })
    expect(nodemailer.createTransport).not.toHaveBeenCalled()
  })

  it('sends via nodemailer when configured', async () => {
    process.env.SMTP_USER = 'u@sepia.so'; process.env.SMTP_PASS = 'pw'
    const out = await sendMail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' })
    expect(out).toEqual({ sent: true })
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1)
    expect(sendMailInner).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com', subject: 'Hi' }))
  })

  it('swallows transport errors and returns sent:false', async () => {
    process.env.SMTP_USER = 'u@sepia.so'; process.env.SMTP_PASS = 'pw'
    sendMailInner.mockRejectedValueOnce(new Error('smtp down'))
    const out = await sendMail({ to: 'a@b.com', subject: 'Hi', html: 'x', text: 'x' })
    expect(out).toEqual({ sent: false })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/mailer.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/email/mailer.js
// Best-effort transactional email. No-ops (never throws) when SMTP is
// unconfigured or the transport fails — email must not break fulfillment.
import nodemailer from 'nodemailer'

export async function sendMail({ to, subject, html, text }) {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) {
    console.warn('sendMail skipped: SMTP not configured')
    return { sent: false }
  }
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    })
    await transport.sendMail({
      from: process.env.MAIL_FROM || `"Sepia" <${user}>`,
      to,
      subject,
      text,
      html,
    })
    return { sent: true }
  } catch (err) {
    console.error('sendMail failed', err.message)
    return { sent: false }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/mailer.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add common/email/mailer.js __tests__/common/mailer.test.js
git commit -m "feat(print-fulfillment): best-effort email mailer"
```

---

## Task 6: Email templates

Pure functions returning `{ subject, html, text }`. Buyer gets a shipped/tracking email (Stripe already sends the payment receipt). Photographer gets a "you sold a print" email with profit. HTML-escape all interpolated buyer/order strings.

**Files:**
- Create: `common/email/templates.js`
- Test: `__tests__/common/emailTemplates.test.js`

**Interfaces:**
- Consumes: an `order` (see §6 data model) and derived values.
- Produces:
  - `photographerSaleEmail({ order, siteName }) -> { subject, html, text }`
  - `buyerShippedEmail({ order, tracking, siteName }) -> { subject, html, text }`

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/common/emailTemplates.test.js
import { photographerSaleEmail, buyerShippedEmail } from '../../common/email/templates'

const order = {
  id: 'ord_1',
  spec: { size: '16x20', finish: 'lustre', frame: 'wood' },
  buyer: { name: 'Ada <b>', email: 'ada@example.com' },
  amounts: { profit: 10500, currency: 'USD' },
}

describe('photographerSaleEmail', () => {
  it('states the profit in dollars and the print size', () => {
    const m = photographerSaleEmail({ order, siteName: 'Ada Photo' })
    expect(m.subject).toMatch(/sold a print/i)
    expect(m.text).toMatch(/\$105\.00/)
    expect(m.text).toMatch(/16x20/)
  })
  it('escapes buyer name in HTML', () => {
    const m = photographerSaleEmail({ order, siteName: 'Ada Photo' })
    expect(m.html).toContain('Ada &lt;b&gt;')
    expect(m.html).not.toContain('Ada <b>')
  })
})

describe('buyerShippedEmail', () => {
  it('includes carrier, tracking number and a link', () => {
    const m = buyerShippedEmail({
      order, siteName: 'Ada Photo',
      tracking: { carrier: 'DHL', number: 'TRK1', url: 'https://track/TRK1' },
    })
    expect(m.subject).toMatch(/shipped/i)
    expect(m.text).toMatch(/DHL/)
    expect(m.text).toMatch(/TRK1/)
    expect(m.html).toContain('https://track/TRK1')
  })
  it('handles missing tracking gracefully', () => {
    const m = buyerShippedEmail({ order, siteName: 'Ada Photo', tracking: null })
    expect(m.subject).toMatch(/shipped/i)
    expect(m.text).toMatch(/on its way/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/emailTemplates.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/email/templates.js
// Pure transactional email builders -> { subject, html, text }.

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function dollars(cents, currency = 'USD') {
  const v = (cents / 100).toFixed(2)
  return currency === 'USD' ? `$${v}` : `${v} ${currency}`
}

function specLine(spec) {
  const frame = spec.frame && spec.frame !== 'none' ? `, ${spec.frame} frame` : ''
  return `${spec.size} ${spec.finish}${frame}`
}

export function photographerSaleEmail({ order, siteName }) {
  const profit = dollars(order.amounts.profit, order.amounts.currency)
  const line = specLine(order.spec)
  const subject = `You sold a print (+${profit})`
  const text = `Great news — someone bought a print from ${siteName}.\n\n` +
    `Print: ${line}\nYour profit: ${profit}\n\n` +
    `Prodigi prints and ships it automatically. Track it in your Orders view.`
  const html = `<div style="font-family:-apple-system,sans-serif;max-width:560px;color:#1a1410;line-height:1.6;">` +
    `<p>Great news — someone bought a print from <strong>${esc(siteName)}</strong>.</p>` +
    `<p><strong>Print:</strong> ${esc(line)}<br><strong>Your profit:</strong> ${esc(profit)}</p>` +
    `<p>Prodigi prints and ships it automatically. Track it in your Orders view.</p></div>`
  return { subject, html, text }
}

export function buyerShippedEmail({ order, tracking, siteName }) {
  const line = specLine(order.spec)
  const subject = `Your print has shipped`
  let trackText, trackHtml
  if (tracking && tracking.number) {
    const carrier = tracking.carrier || 'the carrier'
    trackText = `Carrier: ${carrier}\nTracking: ${tracking.number}` +
      (tracking.url ? `\nTrack it: ${tracking.url}` : '')
    trackHtml = `<p><strong>Carrier:</strong> ${esc(carrier)}<br><strong>Tracking:</strong> ${esc(tracking.number)}` +
      (tracking.url ? `<br><a href="${esc(tracking.url)}">Track your package</a>` : '') + `</p>`
  } else {
    trackText = `Your order is on its way; tracking details will follow.`
    trackHtml = `<p>Your order is on its way; tracking details will follow.</p>`
  }
  const text = `Your print from ${siteName} has shipped.\n\nPrint: ${line}\n\n${trackText}`
  const html = `<div style="font-family:-apple-system,sans-serif;max-width:560px;color:#1a1410;line-height:1.6;">` +
    `<p>Your print from <strong>${esc(siteName)}</strong> has shipped.</p>` +
    `<p><strong>Print:</strong> ${esc(line)}</p>${trackHtml}</div>`
  return { subject, html, text }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/emailTemplates.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add common/email/templates.js __tests__/common/emailTemplates.test.js
git commit -m "feat(print-fulfillment): buyer-shipped and photographer-sale email templates"
```

---

## Task 7: Idempotent order-placement orchestrator

The pure-ish function the Stripe webhook calls after a payment. It places the Prodigi order once (idempotent on `fulfillment.labOrderId`), advances status, persists, and emails the photographer. On adapter failure it records `fulfillment_failed` (buyer already paid — retryable, never auto-refund) and still returns without throwing so the webhook can 200.

**Files:**
- Create: `common/fulfillment/placeOrderForPaidOrder.js`
- Test: `__tests__/common/placeOrderForPaidOrder.test.js`

**Interfaces:**
- Consumes: `getAdapterForCountry` (Task 3), `saveOrder` (`common/orders`), `sendMail` (Task 5), `photographerSaleEmail` (Task 6).
- Produces: `placeOrderForPaidOrder(order, { photographerEmail, siteName }) -> Promise<order>` — returns the updated order. Sets `order.status` to `placed` (success) or `fulfillment_failed` (error). Idempotent: if `order.fulfillment.labOrderId` already set, returns unchanged.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/common/placeOrderForPaidOrder.test.js
jest.mock('../../common/orders', () => ({ saveOrder: jest.fn(async (_u, o) => o) }))
jest.mock('../../common/email/mailer', () => ({ sendMail: jest.fn(async () => ({ sent: true })) }))
const placeOrder = jest.fn()
jest.mock('../../common/fulfillment/router', () => ({ getAdapterForCountry: () => ({ placeOrder }) }))

import { saveOrder } from '../../common/orders'
import { sendMail } from '../../common/email/mailer'
import { placeOrderForPaidOrder } from '../../common/fulfillment/placeOrderForPaidOrder'

function baseOrder() {
  return {
    id: 'ord_1', userId: 'u1', status: 'paid',
    spec: { size: '16x20', finish: 'lustre', frame: 'none' },
    buyer: { name: 'Ada', email: 'ada@example.com', address: { country: 'US' } },
    amounts: { profit: 10500, currency: 'USD' },
    print: { imageUrl: 'https://cdn/x.jpg' },
    fulfillment: { lab: 'prodigi', labOrderId: null, status: 'none', tracking: null },
  }
}

beforeEach(() => { jest.clearAllMocks() })

describe('placeOrderForPaidOrder', () => {
  it('places the order, stores labOrderId, sets status placed, and emails the photographer', async () => {
    placeOrder.mockResolvedValue({ labOrderId: 'p_9', status: 'placed' })
    const out = await placeOrderForPaidOrder(baseOrder(), { photographerEmail: 'me@sepia.so', siteName: 'Ada Photo' })
    expect(out.status).toBe('placed')
    expect(out.fulfillment.labOrderId).toBe('p_9')
    expect(out.fulfillment.status).toBe('placed')
    expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'placed' }))
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'me@sepia.so' }))
  })

  it('is idempotent — does nothing if labOrderId is already set', async () => {
    const o = baseOrder(); o.fulfillment.labOrderId = 'p_existing'; o.status = 'placed'
    const out = await placeOrderForPaidOrder(o, { photographerEmail: 'me@sepia.so', siteName: 'Ada Photo' })
    expect(placeOrder).not.toHaveBeenCalled()
    expect(saveOrder).not.toHaveBeenCalled()
    expect(out.fulfillment.labOrderId).toBe('p_existing')
  })

  it('records fulfillment_failed (does not throw) when placement fails', async () => {
    placeOrder.mockRejectedValue(new Error('prodigi 422: bad sku'))
    const out = await placeOrderForPaidOrder(baseOrder(), { photographerEmail: 'me@sepia.so', siteName: 'Ada Photo' })
    expect(out.status).toBe('fulfillment_failed')
    expect(out.fulfillment.status).toBe('failed')
    expect(out.fulfillment.error).toMatch(/bad sku/)
    expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'fulfillment_failed' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/placeOrderForPaidOrder.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// common/fulfillment/placeOrderForPaidOrder.js
// Idempotent: place a paid order with the lab, persist, notify the photographer.
// Never throws — the buyer already paid; failures are recorded for retry.
import { getAdapterForCountry } from './router'
import { saveOrder } from '../orders'
import { sendMail } from '../email/mailer'
import { photographerSaleEmail } from '../email/templates'

export async function placeOrderForPaidOrder(order, { photographerEmail, siteName } = {}) {
  if (order.fulfillment && order.fulfillment.labOrderId) return order // already placed

  const adapter = getAdapterForCountry(order.buyer?.address?.country)
  try {
    const { labOrderId, status } = await adapter.placeOrder(order)
    order.status = 'placed'
    order.fulfillment = { ...(order.fulfillment || {}), lab: 'prodigi', labOrderId, status: status || 'placed' }
    await saveOrder(order.userId, order)
    if (photographerEmail) {
      const msg = photographerSaleEmail({ order, siteName: siteName || 'your portfolio' })
      await sendMail({ to: photographerEmail, ...msg })
    }
    return order
  } catch (err) {
    console.error('prodigi placement failed', err.message)
    order.status = 'fulfillment_failed'
    order.fulfillment = { ...(order.fulfillment || {}), status: 'failed', error: err.message }
    await saveOrder(order.userId, order)
    return order
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/placeOrderForPaidOrder.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add common/fulfillment/placeOrderForPaidOrder.js __tests__/common/placeOrderForPaidOrder.test.js
git commit -m "feat(print-fulfillment): idempotent order-placement orchestrator"
```

---

## Task 8: Wire the Stripe webhook to place the order

Extend the existing `checkout.session.completed` handler: after flipping `pending -> paid`, resolve the photographer's email + site name and call `placeOrderForPaidOrder`. Keep the handler idempotent and always 200 on handled events (Stripe retries otherwise).

**Files:**
- Modify: `pages/api/stripe/webhook.js`
- Test: `__tests__/api/stripe-webhook.test.js`

**Interfaces:**
- Consumes: `placeOrderForPaidOrder` (Task 7), `readSiteConfig` (`common/siteConfig`), `readUserProfile` (`common/userProfile`).
- Produces: on a paid session, the order is advanced to `placed`/`fulfillment_failed` with `labOrderId` set.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/api/stripe-webhook.test.js
const constructEvent = jest.fn()
jest.mock('../../common/stripe/client', () => ({ getStripe: () => ({ webhooks: { constructEvent } }) }))
jest.mock('../../common/orders', () => ({ getOrder: jest.fn(), saveOrder: jest.fn(async (_u, o) => o) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(async () => ({ siteName: 'Ada Photo', contact: {}, clientDefaults: { notificationEmail: 'me@sepia.so' } })) }))
jest.mock('../../common/userProfile', () => ({ readUserProfile: jest.fn(async () => ({ email: 'prof@sepia.so' })) }))
const placeOrderForPaidOrder = jest.fn(async (o) => { o.status = 'placed'; return o })
jest.mock('../../common/fulfillment/placeOrderForPaidOrder', () => ({ placeOrderForPaidOrder }))

import { getOrder } from '../../common/orders'
import handler from '../../pages/api/stripe/webhook'

function mockRes() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
}
async function mockReq() {
  const req = { method: 'POST', headers: { 'stripe-signature': 'sig' } }
  req[Symbol.asyncIterator] = async function* () { yield Buffer.from('{}') }
  return req
}

const OLD = process.env
beforeEach(() => { jest.clearAllMocks(); process.env = { ...OLD, STRIPE_WEBHOOK_SECRET: 'whsec' } })
afterEach(() => { process.env = OLD })

it('places the Prodigi order after a paid checkout session', async () => {
  constructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: { metadata: { orderId: 'ord_1', userId: 'u1' }, payment_intent: 'pi_1' } } })
  getOrder.mockResolvedValue({ id: 'ord_1', userId: 'u1', status: 'pending', buyer: { address: { country: 'US' } }, amounts: {}, fulfillment: {} })
  const res = mockRes()
  await handler(await mockReq(), res)
  expect(res.statusCode).toBe(200)
  expect(placeOrderForPaidOrder).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'paid' }),
    expect.objectContaining({ photographerEmail: 'me@sepia.so', siteName: 'Ada Photo' }),
  )
})

it('ignores an already-paid order (idempotent) and still 200s', async () => {
  constructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: { metadata: { orderId: 'ord_1', userId: 'u1' } } } })
  getOrder.mockResolvedValue({ id: 'ord_1', userId: 'u1', status: 'placed', fulfillment: { labOrderId: 'p_9' } })
  const res = mockRes()
  await handler(await mockReq(), res)
  expect(res.statusCode).toBe(200)
  expect(placeOrderForPaidOrder).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/api/stripe-webhook.test.js`
Expected: FAIL — handler does not call `placeOrderForPaidOrder`.

- [ ] **Step 3: Update the handler**

In `pages/api/stripe/webhook.js`, add imports:

```javascript
import { readSiteConfig } from '../../../common/siteConfig'
import { readUserProfile } from '../../../common/userProfile'
import { placeOrderForPaidOrder } from '../../../common/fulfillment/placeOrderForPaidOrder'
```

Replace the `if (event.type === 'checkout.session.completed')` block body with:

```javascript
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { orderId, userId } = session.metadata || {}
      if (orderId && userId) {
        const order = await getOrder(userId, orderId)
        if (order && order.status === 'pending') {
          order.status = 'paid'
          if (!order.stripe) order.stripe = {}
          order.stripe.paymentIntentId = session.payment_intent || null
          await saveOrder(userId, order)

          // Resolve where to notify the photographer, then place the lab order.
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
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/api/stripe-webhook.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add pages/api/stripe/webhook.js __tests__/api/stripe-webhook.test.js
git commit -m "feat(print-fulfillment): place Prodigi order + notify photographer on paid webhook"
```

---

## Task 9: Prodigi tracking webhook

A callback endpoint Prodigi POSTs on order status changes. It parses `merchantReference` (`userId:orderId`, set in Task 3) to locate the order, applies status/tracking, and emails the buyer once when shipped. Optional shared-secret gate via `?token=<PRODIGI_WEBHOOK_SECRET>`. Idempotent on `order.status === 'shipped'`.

**Files:**
- Create: `pages/api/prodigi/webhook.js`
- Test: `__tests__/api/prodigi-webhook.test.js`

**Interfaces:**
- Consumes: Prodigi callback body `{ order: { merchantReference, status: { stage }, shipments: [...] } }`; `getOrder`/`saveOrder`, `sendMail`, `buyerShippedEmail`, `readSiteConfig`.
- Produces: order advanced to `shipped` with `fulfillment.tracking = { carrier, number, url }`; buyer emailed once.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/api/prodigi-webhook.test.js
jest.mock('../../common/orders', () => ({ getOrder: jest.fn(), saveOrder: jest.fn(async (_u, o) => o) }))
jest.mock('../../common/email/mailer', () => ({ sendMail: jest.fn(async () => ({ sent: true })) }))
jest.mock('../../common/siteConfig', () => ({ readSiteConfig: jest.fn(async () => ({ siteName: 'Ada Photo' })) }))
import { getOrder, saveOrder } from '../../common/orders'
import { sendMail } from '../../common/email/mailer'
import handler from '../../pages/api/prodigi/webhook'

function res() { return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } } }
function shippedBody() {
  return { order: {
    merchantReference: 'u1:ord_1',
    status: { stage: 'Complete' },
    shipments: [{ carrier: { name: 'DHL' }, tracking: { number: 'TRK1', url: 'https://track/TRK1' } }],
  } }
}
const OLD = process.env
beforeEach(() => { jest.clearAllMocks(); process.env = { ...OLD }; delete process.env.PRODIGI_WEBHOOK_SECRET })
afterEach(() => { process.env = OLD })

it('marks the order shipped, stores tracking, and emails the buyer', async () => {
  getOrder.mockResolvedValue({ id: 'ord_1', userId: 'u1', status: 'placed', spec: { size: '16x20', finish: 'lustre', frame: 'none' }, buyer: { email: 'ada@example.com' }, amounts: { currency: 'USD' }, fulfillment: {} })
  const r = res()
  await handler({ method: 'POST', query: {}, body: shippedBody() }, r)
  expect(r.statusCode).toBe(200)
  expect(saveOrder).toHaveBeenCalledWith('u1', expect.objectContaining({ status: 'shipped' }))
  const saved = saveOrder.mock.calls[0][1]
  expect(saved.fulfillment.tracking).toEqual({ carrier: 'DHL', number: 'TRK1', url: 'https://track/TRK1' })
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'ada@example.com' }))
})

it('is idempotent — skips an already-shipped order', async () => {
  getOrder.mockResolvedValue({ id: 'ord_1', userId: 'u1', status: 'shipped', spec: {}, buyer: {}, fulfillment: {} })
  const r = res()
  await handler({ method: 'POST', query: {}, body: shippedBody() }, r)
  expect(r.statusCode).toBe(200)
  expect(saveOrder).not.toHaveBeenCalled()
  expect(sendMail).not.toHaveBeenCalled()
})

it('rejects a bad token when PRODIGI_WEBHOOK_SECRET is set', async () => {
  process.env.PRODIGI_WEBHOOK_SECRET = 'sekret'
  const r = res()
  await handler({ method: 'POST', query: { token: 'wrong' }, body: shippedBody() }, r)
  expect(r.statusCode).toBe(401)
  expect(getOrder).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/api/prodigi-webhook.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// pages/api/prodigi/webhook.js
// Prodigi status/tracking callback. Locate the order via merchantReference
// ("userId:orderId"), apply status + tracking, email the buyer once on ship.
// Optional shared-secret gate: register the callback URL with ?token=<secret>.
import { getOrder, saveOrder } from '../../../common/orders'
import { sendMail } from '../../../common/email/mailer'
import { readSiteConfig } from '../../../common/siteConfig'
import { buyerShippedEmail } from '../../../common/email/templates'

function mapStage(stage) {
  if (stage === 'Complete' || stage === 'Shipped') return 'shipped'
  if (stage === 'Cancelled') return 'canceled'
  return 'placed'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.PRODIGI_WEBHOOK_SECRET
  if (secret && req.query.token !== secret) return res.status(401).json({ error: 'unauthorized' })

  try {
    const pOrder = req.body?.order || {}
    const ref = pOrder.merchantReference || ''
    const [userId, orderId] = ref.split(':')
    if (!userId || !orderId) return res.status(200).json({ received: true, ignored: 'no merchantReference' })

    const order = await getOrder(userId, orderId)
    if (!order || order.status === 'shipped' || order.status === 'canceled') {
      return res.status(200).json({ received: true }) // unknown or terminal → idempotent no-op
    }

    const status = mapStage(pOrder.status?.stage)
    if (status !== 'shipped') {
      return res.status(200).json({ received: true }) // not shipped yet
    }

    const shipment = (pOrder.shipments || [])[0]
    const tracking = shipment
      ? { carrier: shipment.carrier?.name || null, number: shipment.tracking?.number || null, url: shipment.tracking?.url || null }
      : null

    order.status = 'shipped'
    order.fulfillment = { ...(order.fulfillment || {}), status: 'shipped', tracking }
    await saveOrder(userId, order)

    const config = await readSiteConfig(userId).catch(() => null)
    if (order.buyer?.email) {
      const msg = buyerShippedEmail({ order, tracking, siteName: config?.siteName || 'the shop' })
      await sendMail({ to: order.buyer.email, ...msg })
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('prodigi webhook handler error', err)
    return res.status(500).json({ error: 'Webhook handler error' })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/api/prodigi-webhook.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add pages/api/prodigi/webhook.js __tests__/api/prodigi-webhook.test.js
git commit -m "feat(print-fulfillment): Prodigi tracking webhook + buyer shipped email"
```

---

## Task 10: Admin Orders view (API + page + settings link)

Per-photographer Orders list. The API returns the photographer's orders (via existing `listOrders`); a page renders them; the print settings popover links to it. Passive — no fulfillment action needed.

**Files:**
- Create: `pages/api/admin/print/orders.js`
- Create: `pages/admin/orders.js`
- Modify: `components/admin/platform/SiteSettingsPopover.js` (PrintView, after the payouts row)
- Test: `__tests__/api/admin-orders.test.js`

**Interfaces:**
- Consumes: `withAuth` (`common/withAuth`), `listOrders` (`common/orders`).
- Produces: `GET /api/admin/print/orders -> { orders: Order[] }` (auth-scoped to the caller); a `/admin/orders` page.

- [ ] **Step 1: Write the failing test**

```javascript
// __tests__/api/admin-orders.test.js
jest.mock('../../common/withAuth', () => ({ withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }) }))
jest.mock('../../common/orders', () => ({ listOrders: jest.fn() }))
import { listOrders } from '../../common/orders'
import handler from '../../pages/api/admin/print/orders'

function res() { return { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } } }

beforeEach(() => jest.clearAllMocks())

it('returns the caller\'s orders', async () => {
  listOrders.mockResolvedValue([{ id: 'ord_1', status: 'placed' }])
  const r = res()
  await handler({ method: 'GET' }, r)
  expect(listOrders).toHaveBeenCalledWith('u1')
  expect(r.statusCode).toBe(200)
  expect(r.body).toEqual({ orders: [{ id: 'ord_1', status: 'placed' }] })
})

it('405s on non-GET', async () => {
  const r = res()
  await handler({ method: 'POST' }, r)
  expect(r.statusCode).toBe(405)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/api/admin-orders.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the API route**

```javascript
// pages/api/admin/print/orders.js
import { withAuth } from '../../../../common/withAuth'
import { listOrders } from '../../../../common/orders'

async function handler(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const orders = await listOrders(user.id)
    return res.status(200).json({ orders })
  } catch (err) {
    console.error('list orders error', err)
    return res.status(500).json({ error: 'Could not load orders' })
  }
}

export default withAuth(handler)
```

- [ ] **Step 4: Run the API test to verify it passes**

Run: `npm test -- __tests__/api/admin-orders.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the Orders page**

```javascript
// pages/admin/orders.js
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

function money(cents, currency = 'USD') {
  if (typeof cents !== 'number') return '—'
  const v = (cents / 100).toFixed(2)
  return currency === 'USD' ? `$${v}` : `${v} ${currency}`
}

const STATUS_LABEL = {
  pending: 'Pending', paid: 'Paid', placed: 'In production',
  shipped: 'Shipped', fulfillment_failed: 'Needs attention', canceled: 'Canceled',
}

export default function OrdersPage() {
  const { status: authStatus } = useSession()
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authStatus !== 'authenticated') return
    fetch('/api/admin/print/orders')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => setOrders(d.orders || []))
      .catch(() => setError('Could not load orders.'))
  }, [authStatus])

  if (authStatus === 'loading') return <main style={{ padding: 32 }}>Loading…</main>
  if (authStatus !== 'authenticated') return <main style={{ padding: 32 }}>Please sign in.</main>

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, sans-serif', color: '#1a1410' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Orders</h1>
      <p style={{ color: '#7a6f5f', fontSize: 14, marginTop: 0 }}>Prints sell and ship automatically. This is a record of your sales.</p>
      {error && <p style={{ color: '#b00' }}>{error}</p>}
      {!orders && !error && <p>Loading orders…</p>}
      {orders && orders.length === 0 && <p style={{ color: '#7a6f5f' }}>No orders yet.</p>}
      {orders && orders.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e0d8cc', color: '#7a6f5f' }}>
              <th style={{ padding: '8px 6px' }}>Date</th>
              <th style={{ padding: '8px 6px' }}>Print</th>
              <th style={{ padding: '8px 6px' }}>Buyer</th>
              <th style={{ padding: '8px 6px' }}>Status</th>
              <th style={{ padding: '8px 6px' }}>Profit</th>
              <th style={{ padding: '8px 6px' }}>Tracking</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const t = o.fulfillment?.tracking
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f0ebe2' }}>
                  <td style={{ padding: '8px 6px' }}>{(o.createdAt || '').slice(0, 10)}</td>
                  <td style={{ padding: '8px 6px' }}>{o.spec?.size} {o.spec?.finish}{o.spec?.frame && o.spec.frame !== 'none' ? `, ${o.spec.frame}` : ''}</td>
                  <td style={{ padding: '8px 6px' }}>{o.buyer?.name || o.buyer?.email || '—'}</td>
                  <td style={{ padding: '8px 6px' }}>{STATUS_LABEL[o.status] || o.status}</td>
                  <td style={{ padding: '8px 6px' }}>{money(o.amounts?.profit, o.amounts?.currency)}</td>
                  <td style={{ padding: '8px 6px' }}>{t?.url ? <a href={t.url} target="_blank" rel="noreferrer">{t.number || 'Track'}</a> : t?.number || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}
```

- [ ] **Step 6: Add a "View orders" link in the print settings popover**

In `components/admin/platform/SiteSettingsPopover.js`, inside `PrintView`, add a link row after the payouts row block (after the closing `</div>` of the `{/* Payouts row */}` section, before the shell closes). Match the existing link styling used elsewhere in the file:

```javascript
        {/* Orders link */}
        <div style={{ marginTop: 4 }}>
          <a
            href="/admin/orders"
            style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            View orders →
          </a>
        </div>
```

- [ ] **Step 7: Verify the app compiles and existing tests pass**

Run: `npm test -- __tests__/api/admin-orders.test.js`
Expected: PASS.

Manually verify the page compiles without touching the running dev server (do NOT run `next build` over the live dev server — see project memory). Confirm no import/syntax errors by running the full suite in Step-8's command below; the page is exercised at runtime.

- [ ] **Step 8: Run the full test suite (regression gate)**

Run: `npm test`
Expected: PASS — all Phase 2 tests plus the pre-existing suite are green.

- [ ] **Step 9: Commit**

```bash
git add pages/api/admin/print/orders.js pages/admin/orders.js components/admin/platform/SiteSettingsPopover.js __tests__/api/admin-orders.test.js
git commit -m "feat(print-fulfillment): admin Orders view (API + page + settings link)"
```

---

## Owner action items (Swami) — gates for the live sandbox smoke

These are **not** build blockers (everything above is unit-tested with mocked network/transport), but the end-to-end sandbox demo needs:

1. **Prodigi sandbox account** → set `PRODIGI_API_KEY` (and optionally `PRODIGI_WEBHOOK_SECRET`) in `~/.secrets/portfolio-builder-v1.env`. Without it the router falls back to the mock and no real Prodigi order is placed.
2. **Confirm SKUs/attributes** in `common/fulfillment/prodigiSkuMap.js` against the real Prodigi catalog (the standing pricing/catalog blocker). Unmapped combos → `fulfillment_failed`.
3. **SMTP creds** → `SMTP_USER` / `SMTP_PASS` (Gmail app password or provider) for real email; until then the mailer no-ops cleanly.
4. **Register the Prodigi callback** URL (`https://<host>/api/prodigi/webhook?token=<PRODIGI_WEBHOOK_SECRET>`) on the Prodigi account, or use their dashboard/test tooling to fire a status change.
5. **Stripe Connect webhook** must already be Connect-scoped (Phase 1 gate). Re-confirm the paid → placed transition end-to-end once `PRODIGI_API_KEY` is set.

## Deferred / out of scope (unchanged from the design's §9)

Cart/multi-item, discounts, automated tax, refunds UI, embedded Payment Element, photoreal wall preview, WHCC/US routing, a tracking **poll fallback** (webhook-only for now), and live Prodigi quote wiring for `getCost`/`getShippingQuote` (go-live gate — Phase 2 keeps deterministic seed-catalog pricing).

---

## Self-Review

**Spec coverage (design §4–6):**
- §4 real `prodigi.js` adapter (X-API-Key, env base URL, spec→SKU, getCost/getShippingQuote/placeOrder/getTracking) → Tasks 1–3. Router returns Prodigi → Task 3.
- §4 order placement trigger on `checkout.session.completed`, idempotent on session/order → Tasks 7–8 (idempotent on `labOrderId`; webhook also guards on `status==='pending'`).
- §4 tracking via `/api/prodigi/webhook` → Task 9.
- §5 Orders view (status, buyer, spec, amounts/profit, tracking) → Task 10. Emails: buyer shipped (Task 6/9) + photographer sale (Task 6/7). *Buyer payment receipt is Stripe-native (design §2), not rebuilt.*
- §6 data model: order already matches; added `print` ref (Task 4) and `fulfillment.tracking/error` population. `chargesEnabled` already exists (Phase 1).

**Placeholder scan:** No TBD/TODO/"handle edge cases" — every code step is complete. The one explicit "CONFIRM BEFORE GO-LIVE" is a labeled data-accuracy gate, not missing code.

**Type consistency:** `mapSpecToProdigi -> { sku, copies, sizing, attributes }` (Task 1) consumed identically in Task 3. `placeOrder(order) -> { labOrderId, status }` and `getTracking(id) -> { status, tracking }` (Task 3) consumed in Tasks 7/9. `printImageRef -> { masterStorageKey, imageUrl }` (Task 4) read as `order.print.imageUrl` in Task 3's `placeOrder`. `sendMail({to,subject,html,text})` (Task 5) called with `{ to, ...msg }` where templates return `{ subject, html, text }` (Task 6). `placeOrderForPaidOrder(order, { photographerEmail, siteName })` (Task 7) called with those exact keys in Task 8. `merchantReference = 'userId:orderId'` written in Task 3, parsed in Task 9. All consistent.

**Known deviation (surfaced at handoff):** `getCost`/`getShippingQuote` delegate to the seed catalog rather than calling Prodigi's live quote API, to preserve deterministic offline pricing, keep existing checkout tests green, and respect the standing "real pricing needs an approved account" blocker. Live quote wiring is listed as a go-live gate.
