# Print Store Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the photographer-side foundation of the public print store — mark an image sellable from the library, resolve its available print sizes from resolution, price them with one global markup, all behind a swappable lab-adapter interface — with zero payments or live fulfillment.

**Architecture:** Pure logic modules (`common/print/`) compute available sizes and retail prices. A fulfillment adapter interface (`common/fulfillment/`) hides the print lab; a seeded mock adapter supplies a real catalog and costs so nothing depends on a lab account yet. The library asset model gains a `print` object and the site config gains a `printStore` object; API routes and a library sidebar panel let the photographer enable the store, set the markup, upload a high-res master when needed, and mark images sellable.

**Tech Stack:** Next.js (pages router), React, Jest + jest-environment-jsdom, `sharp` for image metadata, AWS SDK S3 client against Cloudflare R2, GCS/R2 JSON configs.

## Global Constraints

- JavaScript only (no TypeScript). Match existing `common/` module style.
- Tests live in `__tests__/**/*.test.js` and run with `npm test`. `@/` maps to repo root.
- All admin API routes are wrapped with `withAuth(handler)`; the handler signature is `(req, res, user)` and the authenticated user id is `user.id`.
- Per-user storage paths come from `common/gcsUser.js`; JSON read/write uses `downloadJSON` / `uploadJSON` from `common/gcsClient.js`.
- Editing invariant: all edits are initiated from the admin sidebar; the public preview is read-only. Stored data is theme-independent.
- DPI floor for "prints sharply" is **240**.
- Currency default is `USD`. Platform fee default is `0`.
- Retail prices round **up to the nearest 5** currency units.
- Spec: `docs/superpowers/specs/2026-07-04-public-print-store-design.md`.

---

### Task 1: Print-size resolver (pure module)

**Files:**
- Create: `common/print/printSizeResolver.js`
- Test: `__tests__/common/printSizeResolver.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `sizeFitsResolution(size, imgWidth, imgHeight, minDpi = 240) => boolean` where `size` is `{ id, wIn, hIn }`.
  - `availableSizes(imgWidth, imgHeight, sizes, minDpi = 240) => string[]` (size ids that fit, in input order).
  - `maxSharpSize(imgWidth, imgHeight, sizes, minDpi = 240) => string | null` (id of the largest-area size that fits).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/printSizeResolver.test.js
import {
  sizeFitsResolution,
  availableSizes,
  maxSharpSize,
} from '../../common/print/printSizeResolver'

const SIZES = [
  { id: '8x10', wIn: 8, hIn: 10 },
  { id: '16x24', wIn: 16, hIn: 24 },
  { id: '24x36', wIn: 24, hIn: 36 },
]

describe('sizeFitsResolution', () => {
  it('is orientation-agnostic (landscape image, portrait size spec)', () => {
    // 3600x2400 landscape vs 16x24 portrait spec: long edges 3600/24=150dpi -> fails at 240
    expect(sizeFitsResolution({ id: '16x24', wIn: 16, hIn: 24 }, 3600, 2400)).toBe(false)
    // 5760x3840 landscape vs 16x24: 5760/24=240, 3840/16=240 -> exactly fits
    expect(sizeFitsResolution({ id: '16x24', wIn: 16, hIn: 24 }, 5760, 3840)).toBe(true)
  })

  it('honors a custom minDpi', () => {
    expect(sizeFitsResolution({ id: '8x10', wIn: 8, hIn: 10 }, 1200, 960, 120)).toBe(true)
    expect(sizeFitsResolution({ id: '8x10', wIn: 8, hIn: 10 }, 1200, 960, 240)).toBe(false)
  })
})

describe('availableSizes', () => {
  it('returns only sizes that meet the dpi floor', () => {
    // 6000x4000: 8x10 ok, 16x24 (needs 5760x3840) ok, 24x36 (needs 8640x5760) fails
    expect(availableSizes(6000, 4000, SIZES)).toEqual(['8x10', '16x24'])
  })

  it('returns [] when the image is too small for anything', () => {
    expect(availableSizes(800, 600, SIZES)).toEqual([])
  })
})

describe('maxSharpSize', () => {
  it('returns the largest-area size that fits', () => {
    expect(maxSharpSize(6000, 4000, SIZES)).toBe('16x24')
  })

  it('returns null when nothing fits', () => {
    expect(maxSharpSize(800, 600, SIZES)).toBe(null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- printSizeResolver`
Expected: FAIL — cannot find module `common/print/printSizeResolver`.

- [ ] **Step 3: Write minimal implementation**

```js
// common/print/printSizeResolver.js
// Pure functions — no I/O. Determine which print sizes an image can render
// sharply given its pixel dimensions and a DPI floor.

function edges(px1, px2) {
  return px1 >= px2 ? [px1, px2] : [px2, px1]
}

export function sizeFitsResolution(size, imgWidth, imgHeight, minDpi = 240) {
  if (!size || !imgWidth || !imgHeight) return false
  const [pxLong, pxShort] = edges(imgWidth, imgHeight)
  const [inLong, inShort] = edges(size.wIn, size.hIn)
  const dpi = Math.min(pxLong / inLong, pxShort / inShort)
  return dpi >= minDpi
}

export function availableSizes(imgWidth, imgHeight, sizes, minDpi = 240) {
  return (sizes || [])
    .filter((s) => sizeFitsResolution(s, imgWidth, imgHeight, minDpi))
    .map((s) => s.id)
}

export function maxSharpSize(imgWidth, imgHeight, sizes, minDpi = 240) {
  const fitting = (sizes || []).filter((s) =>
    sizeFitsResolution(s, imgWidth, imgHeight, minDpi)
  )
  if (fitting.length === 0) return null
  return fitting.reduce((best, s) =>
    s.wIn * s.hIn > best.wIn * best.hIn ? s : best
  ).id
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- printSizeResolver`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add common/print/printSizeResolver.js __tests__/common/printSizeResolver.test.js
git commit -m "feat(print): print-size resolver for DPI-based available sizes"
```

---

### Task 2: Seed catalog

**Files:**
- Create: `common/fulfillment/seedCatalog.js`
- Test: `__tests__/common/seedCatalog.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `SEED_CATALOG` object with shape `{ currency, finishes[], sizes[], frames[], matte }`. Each size is `{ id, label, wIn, hIn, cost: { [finishId]: number } }`. Each frame is `{ id, label, colors[], cost }`. `matte` is `{ available, cost }`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/seedCatalog.test.js
import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'

describe('SEED_CATALOG', () => {
  it('has a currency and non-empty finishes, sizes, frames', () => {
    expect(SEED_CATALOG.currency).toBe('USD')
    expect(SEED_CATALOG.finishes.length).toBeGreaterThan(0)
    expect(SEED_CATALOG.sizes.length).toBeGreaterThan(0)
    expect(SEED_CATALOG.frames.length).toBeGreaterThan(0)
  })

  it('gives every size a cost for every finish', () => {
    const finishIds = SEED_CATALOG.finishes.map((f) => f.id)
    for (const size of SEED_CATALOG.sizes) {
      expect(typeof size.wIn).toBe('number')
      expect(typeof size.hIn).toBe('number')
      for (const fid of finishIds) {
        expect(typeof size.cost[fid]).toBe('number')
      }
    }
  })

  it('includes a "none" frame with zero cost', () => {
    const none = SEED_CATALOG.frames.find((f) => f.id === 'none')
    expect(none).toBeTruthy()
    expect(none.cost).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- seedCatalog`
Expected: FAIL — cannot find module `common/fulfillment/seedCatalog`.

- [ ] **Step 3: Write minimal implementation**

```js
// common/fulfillment/seedCatalog.js
// Curated placeholder catalog with representative costs. Plan 3 replaces the
// data source with live WHCC/Prodigi catalogs behind the same shape.

export const SEED_CATALOG = {
  currency: 'USD',
  finishes: [
    { id: 'lustre', label: 'Lustre paper' },
    { id: 'matte', label: 'Matte paper' },
    { id: 'metal', label: 'Metal' },
  ],
  sizes: [
    { id: '8x10', label: '8 × 10 in', wIn: 8, hIn: 10, cost: { lustre: 6, matte: 6, metal: 24 } },
    { id: '11x14', label: '11 × 14 in', wIn: 11, hIn: 14, cost: { lustre: 10, matte: 10, metal: 40 } },
    { id: '16x20', label: '16 × 20 in', wIn: 16, hIn: 20, cost: { lustre: 18, matte: 18, metal: 70 } },
    { id: '16x24', label: '16 × 24 in', wIn: 16, hIn: 24, cost: { lustre: 22, matte: 22, metal: 85 } },
    { id: '24x36', label: '24 × 36 in', wIn: 24, hIn: 36, cost: { lustre: 40, matte: 40, metal: 150 } },
  ],
  frames: [
    { id: 'none', label: 'No frame', colors: [], cost: 0 },
    { id: 'wood', label: 'Wood frame', colors: ['black', 'white', 'natural', 'walnut'], cost: 35 },
    { id: 'metal', label: 'Metal frame', colors: ['black', 'silver'], cost: 45 },
  ],
  matte: { available: true, cost: 8 },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- seedCatalog`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/fulfillment/seedCatalog.js __tests__/common/seedCatalog.test.js
git commit -m "feat(print): seed print catalog (finishes, sizes, frames, matte)"
```

---

### Task 3: Pricing engine (pure module)

**Files:**
- Create: `common/print/pricing.js`
- Test: `__tests__/common/pricing.test.js`

**Interfaces:**
- Consumes: `SEED_CATALOG` shape from Task 2 (any catalog with the same shape).
- Produces:
  - `roundPrice(n) => number` (round up to nearest 5).
  - `computeRetail(labCost, markup) => number` (`roundPrice(labCost * markup)`).
  - `lineCost(catalog, spec) => number` where `spec = { size, finish, frame, matte }`; throws on unknown ids.
  - `buildPriceMatrix(catalog, availableSizeIds, markup) => Array<{ size, finish, frame, matte, labCost, retail }>`. Matte variants are only included when `frame !== 'none'`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/pricing.test.js
import {
  roundPrice,
  computeRetail,
  lineCost,
  buildPriceMatrix,
} from '../../common/print/pricing'
import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'

describe('roundPrice', () => {
  it('rounds up to the nearest 5', () => {
    expect(roundPrice(31)).toBe(35)
    expect(roundPrice(35)).toBe(35)
    expect(roundPrice(0)).toBe(0)
  })
})

describe('computeRetail', () => {
  it('applies markup then rounds up to nearest 5', () => {
    expect(computeRetail(22, 3)).toBe(70) // 66 -> 70
  })
})

describe('lineCost', () => {
  it('sums size finish cost + frame cost + matte cost', () => {
    // 16x24 lustre (22) + wood (35) + matte (8) = 65
    expect(lineCost(SEED_CATALOG, { size: '16x24', finish: 'lustre', frame: 'wood', matte: true })).toBe(65)
  })

  it('ignores matte cost when unframed', () => {
    // matte flag ignored because frame none has no mat -> 22 + 0
    expect(lineCost(SEED_CATALOG, { size: '16x24', finish: 'lustre', frame: 'none', matte: true })).toBe(22)
  })

  it('throws on an unknown size', () => {
    expect(() => lineCost(SEED_CATALOG, { size: '99x99', finish: 'lustre', frame: 'none', matte: false })).toThrow('unknown size')
  })
})

describe('buildPriceMatrix', () => {
  it('produces one row per size x finish x frame (+ matte only when framed)', () => {
    const rows = buildPriceMatrix(SEED_CATALOG, ['8x10'], 3)
    // 3 finishes x [none, wood(no-mat), wood(mat), metal(no-mat), metal(mat)] = 3 x 5 = 15
    expect(rows.length).toBe(15)
    const noneRow = rows.find((r) => r.finish === 'lustre' && r.frame === 'none')
    expect(noneRow.labCost).toBe(6)
    expect(noneRow.retail).toBe(computeRetail(6, 3))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- pricing`
Expected: FAIL — cannot find module `common/print/pricing`.

- [ ] **Step 3: Write minimal implementation**

```js
// common/print/pricing.js
// Pure pricing math. Turns lab cost + a single markup into retail prices.

export function roundPrice(n) {
  return Math.ceil(n / 5) * 5
}

export function computeRetail(labCost, markup) {
  return roundPrice(labCost * markup)
}

export function lineCost(catalog, spec) {
  const size = catalog.sizes.find((s) => s.id === spec.size)
  if (!size) throw new Error(`unknown size: ${spec.size}`)
  const finishCost = size.cost[spec.finish]
  if (typeof finishCost !== 'number') throw new Error(`unknown finish: ${spec.finish}`)
  const frame = catalog.frames.find((f) => f.id === spec.frame)
  if (!frame) throw new Error(`unknown frame: ${spec.frame}`)
  const framed = frame.id !== 'none'
  const matteCost = framed && spec.matte && catalog.matte.available ? catalog.matte.cost : 0
  return finishCost + frame.cost + matteCost
}

export function buildPriceMatrix(catalog, availableSizeIds, markup) {
  const rows = []
  for (const sizeId of availableSizeIds) {
    for (const finish of catalog.finishes) {
      for (const frame of catalog.frames) {
        const matteOptions = frame.id === 'none' ? [false] : [false, true]
        for (const matte of matteOptions) {
          const spec = { size: sizeId, finish: finish.id, frame: frame.id, matte }
          const labCost = lineCost(catalog, spec)
          rows.push({ ...spec, labCost, retail: computeRetail(labCost, markup) })
        }
      }
    }
  }
  return rows
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- pricing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/print/pricing.js __tests__/common/pricing.test.js
git commit -m "feat(print): pricing engine (single-markup retail + price matrix)"
```

---

### Task 4: Fulfillment adapter interface + mock adapter + router

**Files:**
- Create: `common/fulfillment/mockLabAdapter.js`
- Create: `common/fulfillment/router.js`
- Test: `__tests__/common/mockLabAdapter.test.js`

**Interfaces:**
- Consumes: `SEED_CATALOG` (Task 2), `lineCost` (Task 3).
- Produces the adapter contract every lab must implement:
  - `getCatalog() => catalog`
  - `getCost(spec) => { cost, currency }`
  - `getShippingQuote(spec, address) => { cost, currency, etaDays }` (`address` has `{ country }`)
  - `placeOrder(spec, address, branding) => Promise` — **throws in v1** (Plan 3).
  - `getTracking(labOrderId) => Promise` — **throws in v1** (Plan 3).
  - `router.getAdapterForCountry(country) => adapter` — returns the mock for every country in v1.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/mockLabAdapter.test.js
import { mockLabAdapter } from '../../common/fulfillment/mockLabAdapter'
import { getAdapterForCountry } from '../../common/fulfillment/router'

describe('mockLabAdapter', () => {
  it('returns the seed catalog', () => {
    expect(mockLabAdapter.getCatalog().currency).toBe('USD')
  })

  it('prices a line item', () => {
    const { cost, currency } = mockLabAdapter.getCost({ size: '8x10', finish: 'lustre', frame: 'none', matte: false })
    expect(cost).toBe(6)
    expect(currency).toBe('USD')
  })

  it('quotes cheaper domestic than international shipping', () => {
    const us = mockLabAdapter.getShippingQuote({}, { country: 'US' })
    const intl = mockLabAdapter.getShippingQuote({}, { country: 'JP' })
    expect(us.cost).toBeLessThan(intl.cost)
  })

  it('throws on placeOrder (not implemented in v1)', () => {
    expect(() => mockLabAdapter.placeOrder({}, {}, {})).toThrow('not implemented')
  })
})

describe('getAdapterForCountry', () => {
  it('returns the mock adapter for any country in v1', () => {
    expect(getAdapterForCountry('US')).toBe(mockLabAdapter)
    expect(getAdapterForCountry('FR')).toBe(mockLabAdapter)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mockLabAdapter`
Expected: FAIL — cannot find module `common/fulfillment/mockLabAdapter`.

- [ ] **Step 3: Write minimal implementation**

```js
// common/fulfillment/mockLabAdapter.js
// Implements the fulfillment adapter contract against the seed catalog.
// Order placement / tracking are intentionally unimplemented until Plan 3.
import { SEED_CATALOG } from './seedCatalog'
import { lineCost } from '../print/pricing'

export const mockLabAdapter = {
  getCatalog() {
    return SEED_CATALOG
  },
  getCost(spec) {
    return { cost: lineCost(SEED_CATALOG, spec), currency: SEED_CATALOG.currency }
  },
  getShippingQuote(spec, address) {
    const domestic = (address?.country || 'US').toUpperCase() === 'US'
    return domestic
      ? { cost: 12, currency: SEED_CATALOG.currency, etaDays: 5 }
      : { cost: 30, currency: SEED_CATALOG.currency, etaDays: 12 }
  },
  placeOrder() {
    throw new Error('placeOrder not implemented in v1 foundation')
  },
  getTracking() {
    throw new Error('getTracking not implemented in v1 foundation')
  },
}
```

```js
// common/fulfillment/router.js
// Selects a lab adapter by destination country. Plan 3 will route
// US -> WHCC and everything else -> Prodigi. v1 always returns the mock.
import { mockLabAdapter } from './mockLabAdapter'

export function getAdapterForCountry(_country) {
  return mockLabAdapter
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- mockLabAdapter`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/fulfillment/mockLabAdapter.js common/fulfillment/router.js __tests__/common/mockLabAdapter.test.js
git commit -m "feat(print): fulfillment adapter contract, mock adapter, country router"
```

---

### Task 5: Add `print` object to the library asset model

**Files:**
- Modify: `common/adminConfig.js` (`createAssetRecord`, lines ~163-227)
- Test: `__tests__/common/adminConfig.test.js` (add a describe block)

**Interfaces:**
- Consumes: existing `createAssetRecord` / `normalizeLibraryConfig`.
- Produces: every normalized asset has a `print` object:
  `{ sellable, masterStorageKey, masterWidth, masterHeight, minDpi, availableSizes, maxSharpSize, focalPoint }`, and `forSale` mirrors `print.sellable`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/adminConfig.test.js  (append)
import { normalizeLibraryConfig } from '../../common/adminConfig'

describe('asset.print defaults', () => {
  it('adds a print object with safe defaults to a bare asset', () => {
    const config = {
      assets: {
        a1: { assetId: 'a1', publicUrl: 'https://x/a.jpg', width: 6000, height: 4000 },
      },
      assetOrder: ['a1'],
    }
    const out = normalizeLibraryConfig(config, [])
    const print = out.assets.a1.print
    expect(print).toEqual({
      sellable: false,
      masterStorageKey: null,
      masterWidth: null,
      masterHeight: null,
      minDpi: 240,
      availableSizes: [],
      maxSharpSize: null,
      focalPoint: null,
    })
    expect(out.assets.a1.forSale).toBe(false)
  })

  it('preserves an existing sellable print object and mirrors forSale', () => {
    const config = {
      assets: {
        a1: {
          assetId: 'a1', publicUrl: 'https://x/a.jpg', width: 6000, height: 4000,
          print: { sellable: true, availableSizes: ['8x10'], maxSharpSize: '8x10', minDpi: 240 },
        },
      },
      assetOrder: ['a1'],
    }
    const out = normalizeLibraryConfig(config, [])
    expect(out.assets.a1.print.sellable).toBe(true)
    expect(out.assets.a1.print.availableSizes).toEqual(['8x10'])
    expect(out.assets.a1.forSale).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- adminConfig`
Expected: FAIL — `print` is undefined on the asset.

- [ ] **Step 3: Write minimal implementation**

In `common/adminConfig.js`, inside the object returned by `createAssetRecord`, replace the existing `forSale: existingAsset.forSale ?? false,` line with the following two-field block (keep everything else identical):

```js
    forSale: existingAsset.print?.sellable ?? existingAsset.forSale ?? false,
    print: {
      sellable: existingAsset.print?.sellable ?? existingAsset.forSale ?? false,
      masterStorageKey: existingAsset.print?.masterStorageKey ?? null,
      masterWidth: existingAsset.print?.masterWidth ?? null,
      masterHeight: existingAsset.print?.masterHeight ?? null,
      minDpi: existingAsset.print?.minDpi ?? 240,
      availableSizes: uniqueStrings(existingAsset.print?.availableSizes),
      maxSharpSize: existingAsset.print?.maxSharpSize ?? null,
      focalPoint: existingAsset.print?.focalPoint ?? null,
    },
```

> `uniqueStrings` is already defined and used in this file (see `tags` / `setIds`), so no import is needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- adminConfig`
Expected: PASS (new block and pre-existing adminConfig tests).

- [ ] **Step 5: Commit**

```bash
git add common/adminConfig.js __tests__/common/adminConfig.test.js
git commit -m "feat(print): add print object to library asset model"
```

---

### Task 6: Add `printStore` to site config + print-master GCS path

**Files:**
- Modify: `common/siteConfig.js` (`createDefaultSiteConfig`; add `normalizePrintStore`; apply it in `readSiteConfig`)
- Modify: `common/gcsUser.js` (add `getUserPrintMasterPath`)
- Test: `__tests__/common/siteConfig.test.js` (add a describe block)
- Test: `__tests__/common/gcsUser.test.js` (add a describe block)

**Interfaces:**
- Consumes: existing `createDefaultSiteConfig`, `readSiteConfig`.
- Produces:
  - `createDefaultSiteConfig(userId).printStore = { enabled:false, markup:3, showPriceOnImage:false, currency:'USD', stripeConnectAccountId:null, platformFeePct:0 }`.
  - `normalizePrintStore(config) => config` (fills a missing/partial `printStore` with defaults). Applied inside `readSiteConfig`.
  - `getUserPrintMasterPath(userId, filename) => 'users/{userId}/photos/print-masters/{filename}'`.

- [ ] **Step 1: Write the failing tests**

```js
// __tests__/common/gcsUser.test.js  (append)
import { getUserPrintMasterPath } from '../../common/gcsUser'

describe('getUserPrintMasterPath', () => {
  it('returns the print-masters path for a filename', () => {
    expect(getUserPrintMasterPath('abc123', 'hero.jpg')).toBe('users/abc123/photos/print-masters/hero.jpg')
  })
  it('throws if filename is empty', () => {
    expect(() => getUserPrintMasterPath('abc123', '')).toThrow('filename is required')
  })
})
```

```js
// __tests__/common/siteConfig.test.js  (append — file already imports from siteConfig)
import { createDefaultSiteConfig, normalizePrintStore } from '../../common/siteConfig'

describe('printStore', () => {
  it('is present with defaults on a new site config', () => {
    const cfg = createDefaultSiteConfig('u1')
    expect(cfg.printStore).toEqual({
      enabled: false,
      markup: 3,
      showPriceOnImage: false,
      currency: 'USD',
      stripeConnectAccountId: null,
      platformFeePct: 0,
    })
  })

  it('normalizePrintStore backfills a missing printStore', () => {
    const cfg = normalizePrintStore({ userId: 'u1', pages: [] })
    expect(cfg.printStore.enabled).toBe(false)
    expect(cfg.printStore.markup).toBe(3)
  })

  it('normalizePrintStore preserves provided values', () => {
    const cfg = normalizePrintStore({ printStore: { enabled: true, markup: 2.5 } })
    expect(cfg.printStore.enabled).toBe(true)
    expect(cfg.printStore.markup).toBe(2.5)
    expect(cfg.printStore.platformFeePct).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- gcsUser siteConfig`
Expected: FAIL — `getUserPrintMasterPath` / `normalizePrintStore` undefined, `printStore` missing.

- [ ] **Step 3: Write minimal implementation**

Add to `common/gcsUser.js`:

```js
export function getUserPrintMasterPath(userId, filename) {
  if (!filename) throw new Error('filename is required')
  return `${getUserPhotosPrefix(userId)}print-masters/${filename}`
}
```

In `common/siteConfig.js`, add `printStore` to the object returned by `createDefaultSiteConfig` (place it right after the `clientDefaults` block):

```js
    printStore: {
      enabled: false,
      markup: 3,
      showPriceOnImage: false,
      currency: 'USD',
      stripeConnectAccountId: null,
      platformFeePct: 0,
    },
```

Add the normalizer (near the top-level exports in `common/siteConfig.js`):

```js
export function normalizePrintStore(config = {}) {
  const ps = (config && config.printStore) || {}
  return {
    ...config,
    printStore: {
      enabled: ps.enabled ?? false,
      markup: typeof ps.markup === 'number' && ps.markup > 0 ? ps.markup : 3,
      showPriceOnImage: ps.showPriceOnImage ?? false,
      currency: ps.currency || 'USD',
      stripeConnectAccountId: ps.stripeConnectAccountId ?? null,
      platformFeePct: typeof ps.platformFeePct === 'number' ? ps.platformFeePct : 0,
    },
  }
}
```

Apply it in `readSiteConfig` — change the returned object so it is wrapped:

```js
    return normalizePrintStore({
      ...config,
      pages: (config.pages || []).map((page) => normalizePageEntity(page)),
    })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- gcsUser siteConfig`
Expected: PASS (new blocks and pre-existing tests).

- [ ] **Step 5: Commit**

```bash
git add common/siteConfig.js common/gcsUser.js __tests__/common/siteConfig.test.js __tests__/common/gcsUser.test.js
git commit -m "feat(print): printStore site config + print-master storage path"
```

---

### Task 7: API — print store settings (enable + markup)

**Files:**
- Create: `pages/api/admin/print/settings.js`
- Test: `__tests__/api/print-settings.test.js`

**Interfaces:**
- Consumes: `readSiteConfig`, `writeSiteConfig`, `createDefaultSiteConfig`, `normalizePrintStore`, `withAuth`.
- Produces:
  - `GET /api/admin/print/settings` → `{ printStore }`.
  - `PUT /api/admin/print/settings` body `{ enabled?, markup?, showPriceOnImage? }` → validates `markup > 0`, merges into site config, saves, returns `{ printStore }`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/api/print-settings.test.js
import handler from '../../pages/api/admin/print/settings'
import * as siteConfig from '../../common/siteConfig'

jest.mock('../../common/withAuth', () => ({
  withAuth: (h) => (req, res) => h(req, res, { id: 'u1' }),
}))

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this },
  }
}

describe('PUT /api/admin/print/settings', () => {
  afterEach(() => jest.restoreAllMocks())

  it('rejects a non-positive markup', async () => {
    jest.spyOn(siteConfig, 'readSiteConfig').mockResolvedValue(siteConfig.createDefaultSiteConfig('u1'))
    const res = mockRes()
    await handler({ method: 'PUT', body: { markup: 0 } }, res)
    expect(res.statusCode).toBe(400)
  })

  it('saves enabled + markup and returns printStore', async () => {
    jest.spyOn(siteConfig, 'readSiteConfig').mockResolvedValue(siteConfig.createDefaultSiteConfig('u1'))
    const write = jest.spyOn(siteConfig, 'writeSiteConfig').mockResolvedValue()
    const res = mockRes()
    await handler({ method: 'PUT', body: { enabled: true, markup: 2.5 } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.printStore.enabled).toBe(true)
    expect(res.body.printStore.markup).toBe(2.5)
    expect(write).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- print-settings`
Expected: FAIL — cannot find module `pages/api/admin/print/settings`.

- [ ] **Step 3: Write minimal implementation**

```js
// pages/api/admin/print/settings.js
import { withAuth } from '../../../../common/withAuth'
import {
  readSiteConfig,
  writeSiteConfig,
  createDefaultSiteConfig,
  normalizePrintStore,
} from '../../../../common/siteConfig'

async function handler(req, res, user) {
  let config = await readSiteConfig(user.id)
  if (!config) {
    config = createDefaultSiteConfig(user.id)
    await writeSiteConfig(user.id, config)
  }
  config = normalizePrintStore(config)

  if (req.method === 'GET') {
    return res.status(200).json({ printStore: config.printStore })
  }

  if (req.method === 'PUT') {
    const { enabled, markup, showPriceOnImage } = req.body || {}
    if (markup !== undefined && !(typeof markup === 'number' && markup > 0)) {
      return res.status(400).json({ error: 'markup must be a positive number' })
    }
    const printStore = {
      ...config.printStore,
      ...(enabled !== undefined ? { enabled: !!enabled } : {}),
      ...(markup !== undefined ? { markup } : {}),
      ...(showPriceOnImage !== undefined ? { showPriceOnImage: !!showPriceOnImage } : {}),
    }
    await writeSiteConfig(user.id, { ...config, printStore })
    return res.status(200).json({ printStore })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- print-settings`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pages/api/admin/print/settings.js __tests__/api/print-settings.test.js
git commit -m "feat(print): API to enable print store and set markup"
```

---

### Task 8: API — mark asset sellable + resolve sizes + price preview

**Files:**
- Create: `common/print/sellAsset.js` (pure helper so the logic is unit-testable without mocking GCS)
- Create: `pages/api/admin/print/sell.js`
- Test: `__tests__/common/sellAsset.test.js`

**Interfaces:**
- Consumes: `SEED_CATALOG` (Task 2), `availableSizes`/`maxSharpSize` (Task 1), `buildPriceMatrix` (Task 3), `mockLabAdapter` (Task 4), library config read/write from `common/adminConfig.js` and `common/gcsUser.js`.
- Produces:
  - `resolveSellableAsset(asset, catalog, markup) => { print, priceMatrix }` — pure. Uses the print master dimensions when present, else `asset.width/height`.
  - `POST /api/admin/print/sell` body `{ assetId, sellable }` → updates the asset's `print`, writes library config, returns `{ print, priceMatrix }`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/sellAsset.test.js
import { resolveSellableAsset } from '../../common/print/sellAsset'
import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'

describe('resolveSellableAsset', () => {
  it('computes availableSizes + maxSharpSize + priceMatrix from asset dimensions', () => {
    const asset = { width: 6000, height: 4000, print: { sellable: false, minDpi: 240 } }
    const { print, priceMatrix } = resolveSellableAsset(asset, SEED_CATALOG, 3)
    expect(print.sellable).toBe(true)
    expect(print.availableSizes).toContain('8x10')
    expect(print.maxSharpSize).toBe('16x24')
    expect(priceMatrix.length).toBeGreaterThan(0)
  })

  it('prefers print-master dimensions over the asset dimensions', () => {
    const asset = {
      width: 1200, height: 800,
      print: { sellable: false, minDpi: 240, masterWidth: 8640, masterHeight: 5760 },
    }
    const { print } = resolveSellableAsset(asset, SEED_CATALOG, 3)
    expect(print.maxSharpSize).toBe('24x36')
  })

  it('unselling clears sizes and price matrix', () => {
    const asset = { width: 6000, height: 4000, print: { sellable: true, minDpi: 240 } }
    const { print, priceMatrix } = resolveSellableAsset({ ...asset }, SEED_CATALOG, 3, false)
    expect(print.sellable).toBe(false)
    expect(print.availableSizes).toEqual([])
    expect(print.maxSharpSize).toBe(null)
    expect(priceMatrix).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sellAsset`
Expected: FAIL — cannot find module `common/print/sellAsset`.

- [ ] **Step 3: Write minimal implementation (pure helper)**

```js
// common/print/sellAsset.js
// Pure: given an asset + catalog + markup, produce its updated print object
// and a price-preview matrix. No I/O.
import { availableSizes, maxSharpSize } from './printSizeResolver'
import { buildPriceMatrix } from './pricing'

export function resolveSellableAsset(asset, catalog, markup, sellable = true) {
  const prevPrint = asset.print || {}
  const minDpi = prevPrint.minDpi ?? 240
  const width = prevPrint.masterWidth || asset.width
  const height = prevPrint.masterHeight || asset.height

  if (!sellable) {
    return {
      print: { ...prevPrint, sellable: false, minDpi, availableSizes: [], maxSharpSize: null },
      priceMatrix: [],
    }
  }

  const sizes = availableSizes(width, height, catalog.sizes, minDpi)
  const max = maxSharpSize(width, height, catalog.sizes, minDpi)
  return {
    print: { ...prevPrint, sellable: true, minDpi, availableSizes: sizes, maxSharpSize: max },
    priceMatrix: buildPriceMatrix(catalog, sizes, markup),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- sellAsset`
Expected: PASS.

- [ ] **Step 5: Write the API route (no new test — logic covered by Task 8 unit test + Task 7 pattern)**

```js
// pages/api/admin/print/sell.js
import { withAuth } from '../../../../common/withAuth'
import { downloadJSON, uploadJSON } from '../../../../common/gcsClient'
import { getUserLibraryConfigPath } from '../../../../common/gcsUser'
import { normalizeLibraryConfig } from '../../../../common/adminConfig'
import {
  readSiteConfig,
  createDefaultSiteConfig,
  normalizePrintStore,
} from '../../../../common/siteConfig'
import { SEED_CATALOG } from '../../../../common/fulfillment/seedCatalog'
import { resolveSellableAsset } from '../../../../common/print/sellAsset'

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { assetId, sellable } = req.body || {}
  if (!assetId) return res.status(400).json({ error: 'assetId required' })

  let library
  try {
    library = normalizeLibraryConfig(await downloadJSON(getUserLibraryConfigPath(user.id)), [])
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.Code === 'NoSuchKey') {
      return res.status(404).json({ error: 'library not found' })
    }
    throw err
  }

  const asset = library.assets[assetId]
  if (!asset) return res.status(404).json({ error: 'asset not found' })

  const site = normalizePrintStore((await readSiteConfig(user.id)) || createDefaultSiteConfig(user.id))
  const markup = site.printStore.markup

  const { print, priceMatrix } = resolveSellableAsset(asset, SEED_CATALOG, markup, sellable !== false)
  library.assets[assetId] = { ...asset, print, forSale: print.sellable }
  await uploadJSON(getUserLibraryConfigPath(user.id), library)

  return res.status(200).json({ print, priceMatrix })
}

export default withAuth(handler)
```

- [ ] **Step 6: Run the full suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add common/print/sellAsset.js pages/api/admin/print/sell.js __tests__/common/sellAsset.test.js
git commit -m "feat(print): mark asset sellable, resolve sizes, price preview API"
```

---

### Task 9: API — upload print master (hi-res)

**Files:**
- Create: `pages/api/admin/print/upload-master.js`

**Interfaces:**
- Consumes: `sharp`, `s3`/`BUCKET`/`PUBLIC_URL` from `common/gcsClient.js`, `getUserPrintMasterPath` (Task 6), library read/write + `resolveSellableAsset` (Task 8).
- Produces: `POST /api/admin/print/upload-master?assetId=&filename=&contentType=` (raw body = file bytes) → stores the master under `photos/print-masters/`, records `masterStorageKey/masterWidth/masterHeight` on the asset, re-resolves sizes, returns `{ print, priceMatrix }`.

> No unit test here: this route is a thin composition of already-tested units (`resolveSellableAsset`) plus binary I/O against S3, which the suite mocks nowhere. It is verified during the manual smoke test in Task 11. Keep the logic minimal so all real decisions stay in the tested pure helpers.

- [ ] **Step 1: Write the route**

```js
// pages/api/admin/print/upload-master.js
import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3, BUCKET, PUBLIC_URL, downloadJSON, uploadJSON } from '../../../../common/gcsClient'
import { getUserPrintMasterPath, getUserLibraryConfigPath } from '../../../../common/gcsUser'
import { normalizeLibraryConfig } from '../../../../common/adminConfig'
import {
  readSiteConfig,
  createDefaultSiteConfig,
  normalizePrintStore,
} from '../../../../common/siteConfig'
import { SEED_CATALOG } from '../../../../common/fulfillment/seedCatalog'
import { resolveSellableAsset } from '../../../../common/print/sellAsset'
import { withAuth } from '../../../../common/withAuth'

export const config = { api: { bodyParser: false } }

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { assetId, filename, contentType } = req.query
  if (!assetId || !filename || !contentType) {
    return res.status(400).json({ error: 'assetId, filename, contentType required' })
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = getUserPrintMasterPath(user.id, safeName)

  let width = null, height = null
  try {
    const meta = await sharp(buffer).metadata()
    width = meta.width
    height = meta.height
  } catch (err) {
    return res.status(400).json({ error: 'unreadable image file' })
  }

  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }))

  const library = normalizeLibraryConfig(await downloadJSON(getUserLibraryConfigPath(user.id)), [])
  const asset = library.assets[assetId]
  if (!asset) return res.status(404).json({ error: 'asset not found' })

  const site = normalizePrintStore((await readSiteConfig(user.id)) || createDefaultSiteConfig(user.id))
  const withMaster = {
    ...asset,
    print: { ...(asset.print || {}), masterStorageKey: key, masterWidth: width, masterHeight: height },
  }
  const { print, priceMatrix } = resolveSellableAsset(withMaster, SEED_CATALOG, site.printStore.markup, true)
  library.assets[assetId] = { ...withMaster, print, forSale: print.sellable }
  await uploadJSON(getUserLibraryConfigPath(user.id), library)

  return res.status(200).json({ print, priceMatrix })
}

export default withAuth(handler)
```

- [ ] **Step 2: Confirm the suite still passes**

Run: `npm test`
Expected: PASS (no new tests; nothing regressed).

- [ ] **Step 3: Commit**

```bash
git add pages/api/admin/print/upload-master.js
git commit -m "feat(print): upload hi-res print master and re-resolve sizes"
```

---

### Task 10: Library UI — "Sell as print" panel

**Files:**
- Create: `components/admin/print/SellAsPrintPanel.js`
- Test: `__tests__/components/SellAsPrintPanel.test.js`

**Interfaces:**
- Consumes: props `{ asset, printStore, onSellChange, onUploadMaster }`.
  - `asset.print` shape from Task 5; `printStore` shape from Task 6.
  - `onSellChange(nextSellable: boolean)` — called when the sell toggle flips.
  - `onUploadMaster(file: File)` — called when a file is dropped/selected.
- Produces: a presentational sidebar panel. It renders (a) a sellable toggle, (b) a max-size line, (c) a "upload a higher-resolution file" prompt with a file input when `maxSharpSize` is below the catalog's largest size or null, (d) a compact price-range summary derived from `asset.print.availableSizes`.

> This panel is intentionally presentational — it takes state via props and reports intent via callbacks. The parent library screen (already the sidebar host) wires the callbacks to the Task 7–9 APIs. Wiring into the existing library screen is a follow-up integration step noted in Task 11; this task delivers the tested, self-contained component.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/SellAsPrintPanel.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SellAsPrintPanel from '../../components/admin/print/SellAsPrintPanel'

const printStore = { enabled: true, markup: 3, showPriceOnImage: false, currency: 'USD' }

function makeAsset(overrides = {}) {
  return {
    assetId: 'a1',
    width: 6000,
    height: 4000,
    print: { sellable: false, minDpi: 240, availableSizes: [], maxSharpSize: null, ...overrides },
  }
}

describe('SellAsPrintPanel', () => {
  it('calls onSellChange(true) when the toggle is turned on', () => {
    const onSellChange = jest.fn()
    render(<SellAsPrintPanel asset={makeAsset()} printStore={printStore} onSellChange={onSellChange} onUploadMaster={() => {}} />)
    fireEvent.click(screen.getByRole('switch', { name: /sell as print/i }))
    expect(onSellChange).toHaveBeenCalledWith(true)
  })

  it('shows the max sharp size when sellable', () => {
    const asset = makeAsset({ sellable: true, availableSizes: ['8x10', '16x24'], maxSharpSize: '16x24' })
    render(<SellAsPrintPanel asset={asset} printStore={printStore} onSellChange={() => {}} onUploadMaster={() => {}} />)
    expect(screen.getByText(/16x24/i)).toBeInTheDocument()
  })

  it('prompts for a higher-res upload and forwards the chosen file', () => {
    const onUploadMaster = jest.fn()
    const asset = makeAsset({ sellable: true, availableSizes: ['8x10'], maxSharpSize: '8x10' })
    render(<SellAsPrintPanel asset={asset} printStore={printStore} onSellChange={() => {}} onUploadMaster={onUploadMaster} />)
    expect(screen.getByText(/higher-resolution/i)).toBeInTheDocument()
    const file = new File(['x'], 'master.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText(/upload a higher-resolution file/i), { target: { files: [file] } })
    expect(onUploadMaster).toHaveBeenCalledWith(file)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SellAsPrintPanel`
Expected: FAIL — cannot find module `components/admin/print/SellAsPrintPanel`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// components/admin/print/SellAsPrintPanel.js
import React from 'react'

const LARGEST_SIZE_ID = '24x36' // matches the top of SEED_CATALOG.sizes

export default function SellAsPrintPanel({ asset, printStore, onSellChange, onUploadMaster }) {
  const print = asset?.print || {}
  const sellable = !!print.sellable
  const canGoBigger = !print.maxSharpSize || print.maxSharpSize !== LARGEST_SIZE_ID

  return (
    <div className="sell-as-print-panel">
      <label>
        <span>Sell as print</span>
        <button
          type="button"
          role="switch"
          aria-checked={sellable}
          aria-label="Sell as print"
          onClick={() => onSellChange(!sellable)}
        >
          {sellable ? 'On' : 'Off'}
        </button>
      </label>

      {sellable && (
        <>
          <p className="max-size">
            {print.maxSharpSize
              ? `Prints sharply up to ${print.maxSharpSize}.`
              : 'This image is too small to print sharply.'}
          </p>

          {canGoBigger && (
            <div className="upload-master">
              <p>Upload a higher-resolution file to offer larger sizes.</p>
              <input
                type="file"
                accept="image/*"
                aria-label="Upload a higher-resolution file"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0]
                  if (file) onUploadMaster(file)
                }}
              />
            </div>
          )}

          {print.availableSizes?.length > 0 && (
            <p className="sizes-summary">
              {print.availableSizes.length} size
              {print.availableSizes.length === 1 ? '' : 's'} available
            </p>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SellAsPrintPanel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/admin/print/SellAsPrintPanel.js __tests__/components/SellAsPrintPanel.test.js
git commit -m "feat(print): SellAsPrintPanel library sidebar component"
```

---

### Task 11: Integration wiring + smoke test

**Files:**
- Modify: the existing library detail/sidebar host (locate the component that renders per-asset sidebar controls — search `components/admin/AdminLibrary.js` and `components/admin/AdminPhotoLightbox.js` for where a selected asset's editable fields are shown) to mount `SellAsPrintPanel` and wire its callbacks to the APIs.

**Interfaces:**
- Consumes: `SellAsPrintPanel` (Task 10), `GET/PUT /api/admin/print/settings` (Task 7), `POST /api/admin/print/sell` (Task 8), `POST /api/admin/print/upload-master` (Task 9).
- Produces: a working end-to-end photographer flow (no automated test — manual smoke).

- [ ] **Step 1: Locate the sidebar host**

Run: `grep -rn "caption" components/admin/AdminLibrary.js components/admin/AdminPhotoLightbox.js`
Identify where a selected asset's editable controls render (the same place caption editing lives).

- [ ] **Step 2: Mount the panel and wire callbacks**

In that host, render `<SellAsPrintPanel asset={selectedAsset} printStore={printStore} onSellChange={...} onUploadMaster={...} />`, where:
- `printStore` is loaded once via `GET /api/admin/print/settings`.
- `onSellChange(next)` → `POST /api/admin/print/sell` with `{ assetId, sellable: next }`, then update local asset state from the response `print`.
- `onUploadMaster(file)` → `POST /api/admin/print/upload-master?assetId=&filename=&contentType=` with the file as the raw body, then update local asset state from the response `print`.

Follow the existing fetch/error patterns already used for caption edits in the same file. (Repeat those exact patterns — do not invent a new data-loading approach.)

- [ ] **Step 3: Manual smoke test against the live dev server**

> Do NOT run `next build` — this workspace runs `next dev` on port 3000; a build clobbers `.next`.

1. In the running app, open the library, select an image whose original is ≥ ~6000px.
2. Toggle **Sell as print** on → confirm the max-size line appears and no upload prompt shows for a size that already fits the largest catalog size.
3. Select a small image (< ~2000px) → toggle on → confirm the "upload a higher-resolution file" prompt appears; upload a large file → confirm the max-size line updates.
4. Reload → confirm `print.sellable` and sizes persisted (data survives in `library-config.json`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(print): wire SellAsPrintPanel into the library sidebar"
```

---

## What this plan delivers

At completion, a photographer can enable the print store, set one markup number, and mark any library image as sellable — the system resolves which sizes print sharply, prompts for a hi-res master only when needed, and computes a retail price preview — all behind a lab-adapter interface with a seeded catalog. No payments, no buyer UI, no live lab yet.

## Deferred to later plans

- **Plan 2 (Buyer flow):** lightbox "Available as a print" affordance, print picker with live frame/mat preview, single-item checkout, Stripe Connect onboarding, order creation, `printStore.showPriceOnImage` rendering.
- **Plan 3 (Live fulfillment):** real WHCC + Prodigi adapters (replacing the mock behind `router.js`), auto order placement (`placeOrder`), webhooks + tracking (`getTracking`), Orders admin view, refund policy handling.

## Self-review notes

- **Spec coverage (§ refs to the design doc):** §2 library mark-for-sale → Tasks 1, 5, 8, 9, 10, 11. §1/§2 size resolution → Task 1. §3 single-markup pricing → Tasks 3, 6, 7. §5 adapter interface + routing → Task 4. §8 data model (`asset.print`, `printStore`, master path) → Tasks 5, 6. Buyer experience (§4), money (§6), Orders (§7), live labs (§5) are explicitly deferred to Plans 2–3.
- **Type consistency:** `print` object fields are identical across Tasks 5, 8, 9, 10. `spec` shape `{ size, finish, frame, matte }` is identical across Tasks 3, 4. Adapter method names (`getCatalog/getCost/getShippingQuote/placeOrder/getTracking`) match between Task 4 and the deferred Plan 3 note.
- **No placeholders:** every code step shows complete code; the two I/O-only routes (Tasks 9, 11) are explicitly justified as thin compositions of already-tested pure helpers and are covered by the manual smoke test.
