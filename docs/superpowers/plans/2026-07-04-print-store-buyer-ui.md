# Print Store Buyer UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the visible buyer-facing print experience on the public site — an "Available as a print" affordance, an in-lightbox size/finish/framing configurator, a live in-situ CSS framed preview, and real browser-computed prices — gated behind the store's `enabled` flag, ending at a placeholder Buy CTA (no checkout).

**Architecture:** Pure helpers (`framePreview`, `buyerPricing`, `publicPrint`) compute styles/prices/public-safe data. Presentational components (`FramedImage`, `PrintPurchasePanel`, `PrintAffordance`) render the buyer UI. The public data path threads each sellable image's `print` data and the site's `printStore` subset from `getServerSideProps` → `resolveBlock` → `normalizeImageRef` → `Gallery` → `PhotoLightbox`, which mounts the buyer UI when the store is enabled and the image is sellable. An admin control in `SiteSettingsPopover` turns the store on and sets the markup.

**Tech Stack:** Next.js (pages router), React, Jest + jest-environment-jsdom, existing `common/print/pricing.js` + `common/fulfillment/seedCatalog.js` (import-safe in the browser).

## Global Constraints

- JavaScript only (no TypeScript). Match existing module/component style.
- Tests live in `__tests__/**/*.test.js` and run with `npm test`. `@/` maps to repo root.
- The buyer UI renders ONLY when `printStore.enabled === true` AND the image's `print.sellable === true`.
- Prices are computed in the browser from `SEED_CATALOG` + `pricing.js` — no new pricing endpoint.
- The frame spec shape is exactly `{ frame, frameColor, matte }` where `frame` ∈ `none|wood|metal`.
- This plan has NO checkout: the terminal action is a placeholder CTA ("Buy this print — $X", with "checkout coming soon"), non-functional by design.
- Never expose `stripeConnectAccountId` or internal `printStore` fields to public page props — only `{ enabled, markup, currency, showPriceOnImage }`.
- Retail prices already round up to the nearest 5 (in `pricing.js`); do not re-round.
- Spec: `docs/superpowers/specs/2026-07-04-print-store-buyer-ui-design.md`.
- Pre-existing unrelated test failures (`siteConfig` ×2/3, `CrossBlockDrag` ×1) predate this work — do not attribute them to these tasks; just don't add new failures.

---

### Task 1: Frame preview style resolver (pure)

**Files:**
- Create: `common/print/framePreview.js`
- Test: `__tests__/common/framePreview.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `frameColorToCss(frame, color) => string | null`
  - `frameStyles(spec) => { framed, bandColor, bandRatio, matted, matRatio, matColor }` where `spec = { frame, frameColor, matte }`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/framePreview.test.js
import { frameStyles, frameColorToCss } from '../../common/print/framePreview'

describe('frameColorToCss', () => {
  it('maps wood + metal colors, falling back per material', () => {
    expect(frameColorToCss('wood', 'walnut')).toBe('#5a3d2b')
    expect(frameColorToCss('wood', 'nope')).toBe('#c8a87a') // natural fallback
    expect(frameColorToCss('metal', 'silver')).toBe('#c9ccce')
    expect(frameColorToCss('none', 'black')).toBe(null)
  })
})

describe('frameStyles', () => {
  it('returns an unframed descriptor for frame=none', () => {
    expect(frameStyles({ frame: 'none' })).toEqual({
      framed: false, bandColor: null, bandRatio: 0, matted: false, matRatio: 0, matColor: null,
    })
  })

  it('returns a framed descriptor for wood with a color', () => {
    const s = frameStyles({ frame: 'wood', frameColor: 'black' })
    expect(s.framed).toBe(true)
    expect(s.bandColor).toBe('#2b2b2b')
    expect(s.bandRatio).toBeGreaterThan(0)
    expect(s.matted).toBe(false)
  })

  it('adds a mat when matte is true (only when framed)', () => {
    const s = frameStyles({ frame: 'metal', frameColor: 'silver', matte: true })
    expect(s.matted).toBe(true)
    expect(s.matRatio).toBeGreaterThan(0)
    expect(s.matColor).toBe('#f7f4ee')
    // matte on an unframed print is ignored
    expect(frameStyles({ frame: 'none', matte: true }).matted).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- framePreview`
Expected: FAIL — cannot find module `common/print/framePreview`.

- [ ] **Step 3: Write minimal implementation**

```js
// common/print/framePreview.js
// Pure: maps a frame spec to concrete style ratios/colors for the CSS preview.
// This is the v1 renderer's data source; a photoreal renderer would replace
// FramedImage, not this contract.

const WOOD = { black: '#2b2b2b', white: '#f2efe9', natural: '#c8a87a', walnut: '#5a3d2b' }
const METAL = { black: '#3a3a3a', silver: '#c9ccce' }

export function frameColorToCss(frame, color) {
  if (frame === 'wood') return WOOD[color] || WOOD.natural
  if (frame === 'metal') return METAL[color] || METAL.silver
  return null
}

export function frameStyles(spec = {}) {
  const { frame = 'none', frameColor, matte = false } = spec
  if (frame === 'none') {
    return { framed: false, bandColor: null, bandRatio: 0, matted: false, matRatio: 0, matColor: null }
  }
  const matted = !!matte
  return {
    framed: true,
    bandColor: frameColorToCss(frame, frameColor),
    bandRatio: 0.055,
    matted,
    matRatio: matted ? 0.06 : 0,
    matColor: matted ? '#f7f4ee' : null,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- framePreview`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/print/framePreview.js __tests__/common/framePreview.test.js
git commit -m "feat(print): frame preview style resolver (pure)"
```

---

### Task 2: Buyer pricing helpers (pure)

**Files:**
- Create: `common/print/buyerPricing.js`
- Test: `__tests__/common/buyerPricing.test.js`

**Interfaces:**
- Consumes: `lineCost`, `computeRetail` from `common/print/pricing.js`; a catalog with the `SEED_CATALOG` shape.
- Produces:
  - `optionPrice(catalog, spec, markup) => number` where `spec = { size, finish, frame, matte }`.
  - `startingPrice(catalog, availableSizeIds, markup) => number | null` (cheapest unframed option across sizes/finishes).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/buyerPricing.test.js
import { optionPrice, startingPrice } from '../../common/print/buyerPricing'
import { computeRetail, lineCost } from '../../common/print/pricing'
import { SEED_CATALOG } from '../../common/fulfillment/seedCatalog'

describe('optionPrice', () => {
  it('equals computeRetail(lineCost(spec), markup)', () => {
    const spec = { size: '16x24', finish: 'lustre', frame: 'wood', matte: true }
    expect(optionPrice(SEED_CATALOG, spec, 3)).toBe(computeRetail(lineCost(SEED_CATALOG, spec), 3))
  })
})

describe('startingPrice', () => {
  it('is the cheapest unframed option across sizes and finishes', () => {
    const price = startingPrice(SEED_CATALOG, ['8x10', '16x24'], 3)
    // cheapest is the smallest size, cheapest finish, no frame, no mat
    const cheapest = Math.min(
      ...['8x10', '16x24'].flatMap(size =>
        SEED_CATALOG.finishes.map(f => optionPrice(SEED_CATALOG, { size, finish: f.id, frame: 'none', matte: false }, 3))
      )
    )
    expect(price).toBe(cheapest)
  })

  it('returns null when there are no available sizes', () => {
    expect(startingPrice(SEED_CATALOG, [], 3)).toBe(null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- buyerPricing`
Expected: FAIL — cannot find module `common/print/buyerPricing`.

- [ ] **Step 3: Write minimal implementation**

```js
// common/print/buyerPricing.js
// Pure buyer-facing price helpers built on the shared pricing module.
import { lineCost, computeRetail } from './pricing'

export function optionPrice(catalog, spec, markup) {
  return computeRetail(lineCost(catalog, spec), markup)
}

export function startingPrice(catalog, availableSizeIds, markup) {
  if (!availableSizeIds || availableSizeIds.length === 0) return null
  let min = Infinity
  for (const size of availableSizeIds) {
    for (const finish of catalog.finishes) {
      const p = optionPrice(catalog, { size, finish: finish.id, frame: 'none', matte: false }, markup)
      if (p < min) min = p
    }
  }
  return min === Infinity ? null : min
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- buyerPricing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/print/buyerPricing.js __tests__/common/buyerPricing.test.js
git commit -m "feat(print): buyer pricing helpers (optionPrice, startingPrice)"
```

---

### Task 3: Public-safe print data helpers (pure)

**Files:**
- Create: `common/print/publicPrint.js`
- Test: `__tests__/common/publicPrint.test.js`

**Interfaces:**
- Consumes: a library asset (`asset.print`) and a site config (`siteConfig.printStore`).
- Produces:
  - `publicPrintForAsset(asset) => { sellable, availableSizes, maxSharpSize } | null` (null when not sellable).
  - `publicPrintStore(siteConfig) => { enabled, markup, currency, showPriceOnImage }` (safe subset, never internal fields).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/publicPrint.test.js
import { publicPrintForAsset, publicPrintStore } from '../../common/print/publicPrint'

describe('publicPrintForAsset', () => {
  it('returns null when the asset is not sellable', () => {
    expect(publicPrintForAsset({ print: { sellable: false } })).toBe(null)
    expect(publicPrintForAsset({})).toBe(null)
  })

  it('returns the public subset when sellable', () => {
    const asset = { print: { sellable: true, availableSizes: ['8x10'], maxSharpSize: '8x10', masterStorageKey: 'secret/x.jpg' } }
    expect(publicPrintForAsset(asset)).toEqual({ sellable: true, availableSizes: ['8x10'], maxSharpSize: '8x10' })
  })
})

describe('publicPrintStore', () => {
  it('returns only public fields with defaults, never internal ones', () => {
    const cfg = { printStore: { enabled: true, markup: 2.5, currency: 'USD', showPriceOnImage: true, stripeConnectAccountId: 'acct_secret', platformFeePct: 0 } }
    expect(publicPrintStore(cfg)).toEqual({ enabled: true, markup: 2.5, currency: 'USD', showPriceOnImage: true })
  })

  it('applies safe defaults when printStore is missing', () => {
    expect(publicPrintStore({})).toEqual({ enabled: false, markup: 3, currency: 'USD', showPriceOnImage: false })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- publicPrint`
Expected: FAIL — cannot find module `common/print/publicPrint`.

- [ ] **Step 3: Write minimal implementation**

```js
// common/print/publicPrint.js
// Pure: derive the minimal, public-safe print data exposed to the site render.

export function publicPrintForAsset(asset) {
  const p = asset && asset.print
  if (!p || !p.sellable) return null
  return {
    sellable: true,
    availableSizes: p.availableSizes || [],
    maxSharpSize: p.maxSharpSize || null,
  }
}

export function publicPrintStore(siteConfig) {
  const ps = (siteConfig && siteConfig.printStore) || {}
  return {
    enabled: !!ps.enabled,
    markup: typeof ps.markup === 'number' && ps.markup > 0 ? ps.markup : 3,
    currency: ps.currency || 'USD',
    showPriceOnImage: !!ps.showPriceOnImage,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- publicPrint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add common/print/publicPrint.js __tests__/common/publicPrint.test.js
git commit -m "feat(print): public-safe print data helpers"
```

---

### Task 4: Preserve `print` through `normalizeImageRef`

**Files:**
- Modify: `common/assetRefs.js` (`normalizeImageRef`, ~lines 16-30)
- Test: `__tests__/common/assetRefs.print.test.js`

**Interfaces:**
- Consumes: existing `normalizeImageRef`.
- Produces: `normalizeImageRef(value)` preserves a `print` field when present (`ref.print = value.print`), and omits it otherwise.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/assetRefs.print.test.js
import { normalizeImageRef } from '../../common/assetRefs'

describe('normalizeImageRef print passthrough', () => {
  it('preserves a print field when present', () => {
    const ref = normalizeImageRef({ url: 'https://x/a.jpg', print: { sellable: true, availableSizes: ['8x10'] } })
    expect(ref.print).toEqual({ sellable: true, availableSizes: ['8x10'] })
  })

  it('omits print when the input has none', () => {
    const ref = normalizeImageRef({ url: 'https://x/a.jpg' })
    expect('print' in ref).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- assetRefs.print`
Expected: FAIL — `ref.print` is undefined.

- [ ] **Step 3: Write minimal implementation**

In `common/assetRefs.js`, inside `normalizeImageRef`, add the `print` passthrough right after the existing caption passthrough. The block currently reads:

```js
  const ref = { assetId: value.assetId || null, url };
  if (value.caption !== undefined) ref.caption = value.caption;
  return ref;
```

Change it to:

```js
  const ref = { assetId: value.assetId || null, url };
  if (value.caption !== undefined) ref.caption = value.caption;
  if (value.print !== undefined) ref.print = value.print;
  return ref;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- assetRefs`
Expected: PASS (new print test and the pre-existing assetRefs tests).

- [ ] **Step 5: Commit**

```bash
git add common/assetRefs.js __tests__/common/assetRefs.print.test.js
git commit -m "feat(print): preserve print field through normalizeImageRef"
```

---

### Task 5: `FramedImage` — the v1 CSS framed preview renderer

**Files:**
- Create: `components/image-displays/print/FramedImage.js`
- Test: `__tests__/components/FramedImage.test.js`

**Interfaces:**
- Consumes: `frameStyles` (Task 1).
- Produces: `<FramedImage src alt spec className />` — renders a plain `<img>` when `spec.frame === 'none'`, otherwise wraps the image in a frame band (+ mat when `spec.matte`). The framed wrapper carries `data-testid="framed-image"`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/FramedImage.test.js
import React from 'react'
import { render, screen } from '@testing-library/react'
import FramedImage from '../../components/image-displays/print/FramedImage'

describe('FramedImage', () => {
  it('renders a plain image when unframed', () => {
    render(<FramedImage src="/a.jpg" alt="a" spec={{ frame: 'none' }} />)
    expect(screen.queryByTestId('framed-image')).toBeNull()
    expect(screen.getByRole('img')).toHaveAttribute('src', '/a.jpg')
  })

  it('wraps the image in a frame band when framed', () => {
    render(<FramedImage src="/a.jpg" alt="a" spec={{ frame: 'wood', frameColor: 'black' }} />)
    const band = screen.getByTestId('framed-image')
    expect(band).toBeInTheDocument()
    expect(band).toHaveStyle({ background: '#2b2b2b' })
    expect(screen.getByRole('img')).toHaveAttribute('src', '/a.jpg')
  })

  it('adds a mat layer when matte is on', () => {
    render(<FramedImage src="/a.jpg" alt="a" spec={{ frame: 'wood', frameColor: 'black', matte: true }} />)
    expect(screen.getByTestId('framed-image-mat')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- FramedImage`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```jsx
// components/image-displays/print/FramedImage.js
import React from 'react'
import { frameStyles } from '../../../common/print/framePreview'

export default function FramedImage({ src, alt = '', spec, className }) {
  const s = frameStyles(spec || {})
  if (!s.framed) {
    return <img src={src} alt={alt} className={className} />
  }
  const pad = `${(s.bandRatio * 100).toFixed(2)}%`
  const matPad = s.matted ? `${(s.matRatio * 100).toFixed(2)}%` : 0
  return (
    <div
      data-testid="framed-image"
      style={{ display: 'inline-block', background: s.bandColor, padding: pad, boxShadow: '0 12px 34px rgba(0,0,0,0.55)' }}
    >
      <div
        data-testid={s.matted ? 'framed-image-mat' : undefined}
        style={{ background: s.matted ? s.matColor : s.bandColor, padding: matPad }}
      >
        <img src={src} alt={alt} className={className} style={{ display: 'block', maxWidth: '100%', maxHeight: '78vh' }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- FramedImage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/print/FramedImage.js __tests__/components/FramedImage.test.js
git commit -m "feat(print): FramedImage v1 CSS framed preview renderer"
```

---

### Task 6: `PrintAffordance` — the "Available as a print" line

**Files:**
- Create: `components/image-displays/print/PrintAffordance.js`
- Test: `__tests__/components/PrintAffordance.test.js`

**Interfaces:**
- Consumes: `startingPrice` (Task 2), `SEED_CATALOG`.
- Produces: `<PrintAffordance print printStore onOpen />` — renders a button reading "Available as a print"; when `printStore.showPriceOnImage`, appends "· from $X" using the lowest available price. Clicking calls `onOpen`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/PrintAffordance.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PrintAffordance from '../../components/image-displays/print/PrintAffordance'

const print = { sellable: true, availableSizes: ['8x10', '16x24'], maxSharpSize: '16x24' }

it('shows the affordance and calls onOpen when clicked', () => {
  const onOpen = jest.fn()
  render(<PrintAffordance print={print} printStore={{ markup: 3, showPriceOnImage: false }} onOpen={onOpen} />)
  const btn = screen.getByRole('button', { name: /available as a print/i })
  fireEvent.click(btn)
  expect(onOpen).toHaveBeenCalled()
})

it('appends a starting price when showPriceOnImage is on', () => {
  render(<PrintAffordance print={print} printStore={{ markup: 3, showPriceOnImage: true }} onOpen={() => {}} />)
  expect(screen.getByText(/from \$/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PrintAffordance`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```jsx
// components/image-displays/print/PrintAffordance.js
import React from 'react'
import { SEED_CATALOG } from '../../../common/fulfillment/seedCatalog'
import { startingPrice } from '../../../common/print/buyerPricing'

export default function PrintAffordance({ print, printStore, onOpen }) {
  const from = printStore?.showPriceOnImage
    ? startingPrice(SEED_CATALOG, print?.availableSizes || [], printStore?.markup || 3)
    : null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-3 text-white/70 hover:text-white text-sm tracking-wide underline underline-offset-4 decoration-white/30"
    >
      Available as a print{from != null ? ` · from $${from}` : ''}
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- PrintAffordance`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/print/PrintAffordance.js __tests__/components/PrintAffordance.test.js
git commit -m "feat(print): PrintAffordance available-as-a-print line"
```

---

### Task 7: `PrintPurchasePanel` — the configurator

**Files:**
- Create: `components/image-displays/print/PrintPurchasePanel.js`
- Test: `__tests__/components/PrintPurchasePanel.test.js`

**Interfaces:**
- Consumes: `SEED_CATALOG`, `optionPrice` (Task 2).
- Produces: `<PrintPurchasePanel print printStore spec onSpecChange />` where `spec = { size, finish, frame, frameColor, matte }`.
  - Renders Size options (from `print.availableSizes`), Finish options (`SEED_CATALOG.finishes`), Framing (None/Wood/Metal); when a material frame is chosen, renders its color swatches (`SEED_CATALOG.frames[].colors`) and a "With mat" toggle.
  - Shows the current total price via `optionPrice`.
  - Renders a placeholder CTA button "Buy this print — $X" that is `disabled` with a "checkout coming soon" note.
  - Every option change calls `onSpecChange` with the next spec.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/PrintPurchasePanel.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PrintPurchasePanel from '../../components/image-displays/print/PrintPurchasePanel'

const print = { sellable: true, availableSizes: ['8x10', '16x24'], maxSharpSize: '16x24' }
const printStore = { markup: 3, currency: 'USD' }
const baseSpec = { size: '8x10', finish: 'lustre', frame: 'none', frameColor: null, matte: false }

it('lists available sizes and reports a size change', () => {
  const onSpecChange = jest.fn()
  render(<PrintPurchasePanel print={print} printStore={printStore} spec={baseSpec} onSpecChange={onSpecChange} />)
  fireEvent.click(screen.getByRole('button', { name: /16 × 24/i }))
  expect(onSpecChange).toHaveBeenCalledWith(expect.objectContaining({ size: '16x24' }))
})

it('reveals frame colors when a wood frame is chosen', () => {
  const onSpecChange = jest.fn()
  const spec = { ...baseSpec, frame: 'wood', frameColor: 'black' }
  render(<PrintPurchasePanel print={print} printStore={printStore} spec={spec} onSpecChange={onSpecChange} />)
  expect(screen.getByRole('button', { name: /walnut/i })).toBeInTheDocument()
})

it('renders a disabled placeholder Buy CTA with a coming-soon note', () => {
  render(<PrintPurchasePanel print={print} printStore={printStore} spec={baseSpec} onSpecChange={() => {}} />)
  const cta = screen.getByRole('button', { name: /buy this print/i })
  expect(cta).toBeDisabled()
  expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PrintPurchasePanel`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```jsx
// components/image-displays/print/PrintPurchasePanel.js
import React from 'react'
import { SEED_CATALOG } from '../../../common/fulfillment/seedCatalog'
import { optionPrice } from '../../../common/print/buyerPricing'

const pretty = (id) => id.replace('x', ' × ')

function Chip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        active ? 'bg-white text-black border-white' : 'text-white/80 border-white/25 hover:border-white/60'
      }`}
    >
      {label}
    </button>
  )
}

export default function PrintPurchasePanel({ print, printStore, spec, onSpecChange }) {
  const markup = printStore?.markup || 3
  const set = (patch) => onSpecChange({ ...spec, ...patch })
  const sizes = (print?.availableSizes || [])
  const frame = SEED_CATALOG.frames.find((f) => f.id === spec.frame) || SEED_CATALOG.frames[0]
  const framed = spec.frame !== 'none'
  const price = optionPrice(SEED_CATALOG, { size: spec.size, finish: spec.finish, frame: spec.frame, matte: spec.matte }, markup)

  return (
    <div className="text-white/90 w-full max-w-sm space-y-5">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-white/40">Size</p>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <Chip key={s} active={spec.size === s} label={`${pretty(s)} in`} onClick={() => set({ size: s })} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-white/40">Finish</p>
        <div className="flex flex-wrap gap-2">
          {SEED_CATALOG.finishes.map((f) => (
            <Chip key={f.id} active={spec.finish === f.id} label={f.label} onClick={() => set({ finish: f.id })} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-white/40">Framing</p>
        <div className="flex flex-wrap gap-2">
          {SEED_CATALOG.frames.map((f) => (
            <Chip
              key={f.id}
              active={spec.frame === f.id}
              label={f.label}
              onClick={() => set({ frame: f.id, frameColor: f.colors[0] || null, matte: f.id === 'none' ? false : spec.matte })}
            />
          ))}
        </div>
      </div>

      {framed && (
        <>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-white/40">Frame color</p>
            <div className="flex flex-wrap gap-2">
              {frame.colors.map((c) => (
                <Chip key={c} active={spec.frameColor === c} label={c} onClick={() => set({ frameColor: c })} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={!!spec.matte} onChange={(e) => set({ matte: e.target.checked })} />
            With mat
          </label>
        </>
      )}

      <div className="pt-2 border-t border-white/15 space-y-2">
        <button
          type="button"
          disabled
          className="w-full py-3 rounded-md bg-white/90 text-black font-medium opacity-70 cursor-not-allowed"
        >
          Buy this print — ${price}
        </button>
        <p className="text-center text-xs text-white/40">Checkout coming soon</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- PrintPurchasePanel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/print/PrintPurchasePanel.js __tests__/components/PrintPurchasePanel.test.js
git commit -m "feat(print): PrintPurchasePanel configurator with placeholder CTA"
```

---

### Task 8: Mount the buyer UI in `PhotoLightbox`

**Files:**
- Modify: `components/image-displays/PhotoLightbox.js`
- Test: `__tests__/components/PhotoLightboxPrint.test.js`

**Interfaces:**
- Consumes: `PrintAffordance` (Task 6), `PrintPurchasePanel` (Task 7), `FramedImage` (Task 5).
- Produces: `PhotoLightbox` accepts a new `printStore` prop. When `printStore?.enabled && image.print?.sellable`, it renders (a) the `PrintAffordance` beneath the image, (b) on open, the `PrintPurchasePanel` beside/below the image, and (c) the image wrapped in `FramedImage` using the current spec. Default spec: `{ size: image.print.maxSharpSize || firstAvailable, finish: 'lustre', frame: 'none', frameColor: null, matte: false }`. Selecting the panel open/closed is local state.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/PhotoLightboxPrint.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PhotoLightbox from '../../components/image-displays/PhotoLightbox'

const sellable = { url: 'https://x/a.jpg', caption: 'A', print: { sellable: true, availableSizes: ['8x10', '16x24'], maxSharpSize: '16x24' } }
const plain = { url: 'https://x/b.jpg', caption: 'B' }

it('shows the print affordance for a sellable image when the store is enabled', () => {
  render(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />)
  expect(screen.getByRole('button', { name: /available as a print/i })).toBeInTheDocument()
})

it('hides the affordance when the store is disabled', () => {
  render(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: false, markup: 3 }} />)
  expect(screen.queryByRole('button', { name: /available as a print/i })).toBeNull()
})

it('hides the affordance for a non-sellable image', () => {
  render(<PhotoLightbox images={[plain]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />)
  expect(screen.queryByRole('button', { name: /available as a print/i })).toBeNull()
})

it('opens the configurator when the affordance is clicked', () => {
  render(<PhotoLightbox images={[sellable]} index={0} onClose={() => {}} onNavigate={() => {}} printStore={{ enabled: true, markup: 3 }} />)
  fireEvent.click(screen.getByRole('button', { name: /available as a print/i }))
  expect(screen.getByRole('button', { name: /buy this print/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PhotoLightboxPrint`
Expected: FAIL — `printStore`/affordance not rendered.

- [ ] **Step 3: Write minimal implementation**

Rewrite `components/image-displays/PhotoLightbox.js` to add the print UI. The full file:

```jsx
import { useEffect, useState } from "react";
import { getSizedUrl } from "../../common/imageUtils";
import PrintAffordance from "./print/PrintAffordance";
import PrintPurchasePanel from "./print/PrintPurchasePanel";
import FramedImage from "./print/FramedImage";

function defaultSpec(print) {
  const size = print?.maxSharpSize || (print?.availableSizes || [])[0] || null;
  return { size, finish: 'lustre', frame: 'none', frameColor: null, matte: false };
}

export default function PhotoLightbox({ images, index, onClose, onNavigate, printStore }) {
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const sellable = !!(printStore?.enabled && image?.print?.sellable);
  const [panelOpen, setPanelOpen] = useState(false);
  const [spec, setSpec] = useState(defaultSpec(image?.print));

  // Reset the print UI when the viewed image changes.
  useEffect(() => {
    setPanelOpen(false);
    setSpec(defaultSpec(image?.print));
  }, [index, image?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, hasPrev, hasNext, onClose, onNavigate]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="lightbox-backdrop"
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      <button
        aria-label="Close lightbox"
        autoFocus
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white text-3xl leading-none"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        ×
      </button>

      {hasPrev && (
        <button
          aria-label="Previous image"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white text-4xl leading-none px-2"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
        >
          ‹
        </button>
      )}

      <div
        className="flex flex-col md:flex-row items-center gap-6 max-w-[92vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          {sellable ? (
            <FramedImage src={getSizedUrl(image.url, 'display')} alt={image.caption || ''} spec={spec} className="max-w-full max-h-[80vh] object-contain" />
          ) : (
            <img src={getSizedUrl(image.url, 'display')} alt={image.caption || ''} className="max-w-full max-h-[80vh] object-contain" />
          )}
          {image.caption && (
            <p className="mt-3 text-white/70 text-sm italic text-center max-w-xl">{image.caption}</p>
          )}
          {sellable && !panelOpen && (
            <PrintAffordance print={image.print} printStore={printStore} onOpen={() => setPanelOpen(true)} />
          )}
        </div>

        {sellable && panelOpen && (
          <PrintPurchasePanel print={image.print} printStore={printStore} spec={spec} onSpecChange={setSpec} />
        )}
      </div>

      {hasNext && (
        <button
          aria-label="Next image"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white text-4xl leading-none px-2"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
        >
          ›
        </button>
      )}

      <div className="absolute bottom-4 text-white/40 text-xs">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- PhotoLightboxPrint PhotoLightbox`
Expected: PASS (new print tests and the pre-existing `PhotoLightbox.test.js`, since the non-sellable path is unchanged behavior).

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/PhotoLightbox.js __tests__/components/PhotoLightboxPrint.test.js
git commit -m "feat(print): mount buyer affordance + configurator + framed preview in PhotoLightbox"
```

---

### Task 9: Thread print data through the public render

**Files:**
- Modify: `pages/sites/[username]/[slug].js` (`getServerSideProps` `assetsByUrl` build; `resolveBlock`; pass `printStore` to `Gallery`)
- Modify: `components/image-displays/gallery/Gallery.js` (pass `printStore` to `PhotoLightbox`)

**Interfaces:**
- Consumes: `publicPrintForAsset`, `publicPrintStore` (Task 3); `print` passthrough (Task 4); `PhotoLightbox` `printStore` prop (Task 8).
- Produces: sellable images carry `print` from `getServerSideProps` all the way to `PhotoLightbox`, and `Gallery` passes the site's public `printStore` subset to `PhotoLightbox`.

> This is integration wiring across two files that compose already-tested units; verification is the manual smoke test in Step 4. Keep the logic minimal.

- [ ] **Step 1: Extend `assetsByUrl` and `resolveBlock` in `pages/sites/[username]/[slug].js`**

Add the import near the other `common` imports:

```js
import { publicPrintForAsset, publicPrintStore } from '../../../common/print/publicPrint'
```

In `getServerSideProps`, change the `assetsByUrl` build to also carry print for sellable assets:

```js
  const assetsByUrl = {}
  for (const a of Object.values(libraryConfig?.assets || {})) {
    if (!a?.publicUrl) continue
    const entry = { assetId: a.assetId, caption: a.caption }
    const print = publicPrintForAsset(a)
    if (print) entry.print = print
    assetsByUrl[a.publicUrl] = entry
  }
  const printStore = publicPrintStore(siteConfig)
```

Add `printStore` to the returned props:

```js
  return {
    props: {
      siteConfig: JSON.parse(JSON.stringify(siteConfig)),
      page: JSON.parse(JSON.stringify(page)),
      assetsByUrl,
      printStore,
      username,
      basePath,
    },
  }
```

Update `resolveBlock` to attach `print` onto each image ref (multi-image blocks) and the single-photo block, from `assetsByUrl`:

```js
function resolveBlock(block, assetsByUrl) {
  if (!assetsByUrl) return block
  if (block.type === 'photo') {
    const ref = { url: block.imageUrl, caption: block.caption }
    const entry = assetsByUrl[block.imageUrl]
    const resolved = { ...block, caption: resolveCaption(ref, assetsByUrl) }
    if (entry?.print) resolved.print = entry.print
    return resolved
  }
  if (block.type === 'photos' || block.type === 'stacked' || block.type === 'masonry') {
    const refs = (block.images || []).length
      ? block.images
      : (block.imageUrls || []).map(url => ({ url }))
    const images = refs.map(r => {
      const entry = assetsByUrl[r.url]
      const out = { ...r, caption: resolveCaption(r, assetsByUrl) }
      if (entry?.print) out.print = entry.print
      return out
    })
    return { ...block, images, imageUrls: images.map(i => i.url) }
  }
  return block
}
```

Accept `printStore` in the component signature and pass it to `Gallery`:

```js
export default function PublicPage({ siteConfig, page, assetsByUrl, printStore, username, basePath }) {
```

and on the `<Gallery ... />` element add:

```js
          printStore={printStore}
```

> Note the `photo`-block case: `resolveBlock` attaches `print` to the block, but `Gallery`'s `allImages` builder reads `block.image || block.imageUrl` for `photo` blocks and constructs `{ url, caption }` without print. To keep this task minimal and correct, ALSO carry print into that path in Step 2.

- [ ] **Step 2: Pass `printStore` from `Gallery` to `PhotoLightbox`, and carry print on the single-photo path**

In `components/image-displays/gallery/Gallery.js`:

Add `printStore` to the destructured props:

```js
const Gallery = ({ name, description, blocks, enableSlideshow, enableClientView, pages, childPages, activeChildId, username, basePath, onBackClick, onSlideshowClick, onClientLoginClick, onChildPageClick, showPlaceholders, onBlockHover, onBlockClick, siteConfig, printStore }) => {
```

In the `allImages` builder, carry `print` on the single-photo branch (the multi-image branch already flows through `normalizeImageRefs`, which now preserves print):

```js
      } else if (block.type === "photo") {
        const url = getImageRefUrl(block.image || block.imageUrl);
        if (url) allImages.push({ url, caption: block.caption || "", ...(block.print ? { print: block.print } : {}) });
      }
```

Pass `printStore` to the lightbox:

```js
      {lightboxIndex !== null && (
        <PhotoLightbox
          images={allImages}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
          printStore={printStore}
        />
      )}
```

- [ ] **Step 3: Run the suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS (no new failures beyond the pre-existing ones).

- [ ] **Step 4: Manual smoke test against the live dev server**

> Do NOT run `next build` — this workspace runs `next dev` on port 3000.

1. Mark an image sellable (Plan 1 flow), then temporarily enable the store: in admin site settings turn the print store on (Task 10 builds this UI; until then, you can flip `printStore.enabled` via the settings API or the Task 10 toggle).
2. Visit the public page, open that image in the lightbox → confirm "Available as a print" appears.
3. Click it → the configurator opens; pick a wood frame + color + mat → the lightbox image gains the frame and mat in place; the price updates.
4. Confirm a non-sellable image (or store disabled) shows no affordance.

- [ ] **Step 5: Commit**

```bash
git add "pages/sites/[username]/[slug].js" components/image-displays/gallery/Gallery.js
git commit -m "feat(print): thread print data + printStore through public render to lightbox"
```

---

### Task 10: Admin — Print store settings in `SiteSettingsPopover`

**Files:**
- Modify: `components/admin/platform/SiteSettingsPopover.js`

**Interfaces:**
- Consumes: the existing `update(patch)` helper (merges into site config and calls `onUpdate`, which persists via the site-config PUT) and the existing `inputCls`/`inputStyle`/`Field` patterns in the file.
- Produces: a "Print store" section (a drill-in view like `payments`) exposing an **Enable** toggle, a **Markup** number input, and a **Show price on images** toggle, each writing through `updatePrintStore`.

> Integration into a large existing file (662 lines). Follow the existing `analytics`/`payments` view pattern exactly; verification is the manual smoke test.

- [ ] **Step 1: Locate the settings-view pattern**

Run: `grep -n "view === 'analytics'\|view === 'payments'\|setView(\|const inputCls\|const inputStyle\|function Field" components/admin/platform/SiteSettingsPopover.js`
Read the `analytics` view block and the `Field`/`inputCls`/`inputStyle` definitions to match their markup.

- [ ] **Step 2: Add the `updatePrintStore` helper**

Next to the other `update*` helpers (after `updateClientDefaults`), add:

```js
  function updatePrintStore(patch) {
    update({ printStore: { ...(config.printStore || {}), ...patch } })
  }
```

- [ ] **Step 3: Add a "Print store" drill-in view**

Following the exact structure of the existing `analytics` view (a `PopoverShell`/section wrapper with `Field` rows — match whatever the file uses), add a `view === 'print'` block that renders:

```jsx
  if (view === 'print') {
    const ps = config.printStore || {}
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={320} title="Print store" onBack={() => setView('main')}>
        <div style={{ padding: '14px 14px 16px' }} className="space-y-5">
          <label className="flex items-center justify-between text-sm">
            <span>Enable print store</span>
            <input type="checkbox" checked={!!ps.enabled} onChange={(e) => updatePrintStore({ enabled: e.target.checked })} />
          </label>
          <Field label="Markup (× lab cost)">
            <input
              className={inputCls}
              style={inputStyle}
              type="number"
              min="1"
              step="0.1"
              placeholder="3"
              value={ps.markup ?? 3}
              onChange={(e) => { const n = parseFloat(e.target.value); if (!Number.isNaN(n) && n > 0) updatePrintStore({ markup: n }) }}
            />
          </Field>
          <label className="flex items-center justify-between text-sm">
            <span>Show starting price on images</span>
            <input type="checkbox" checked={!!ps.showPriceOnImage} onChange={(e) => updatePrintStore({ showPriceOnImage: e.target.checked })} />
          </label>
          <p className="text-xs text-stone-400">Checkout isn’t live yet — buyers can preview and configure prints, but can’t purchase until checkout ships.</p>
        </div>
      </PopoverShell>
    )
  }
```

> If the file's existing views use a different shell/`Field` component than shown, match the file's actual pattern (from Step 1) rather than the illustrative names here — the required behavior is the three controls writing through `updatePrintStore`.

- [ ] **Step 4: Add a "Print store" entry to the main settings menu**

In the `main` view's list of settings rows (where "Analytics"/"Payments" rows call `setView(...)`), add a row that calls `setView('print')`, matching the existing rows' markup.

- [ ] **Step 5: Manual smoke test**

> Do NOT run `next build`.

1. Open admin site settings → "Print store".
2. Toggle **Enable** on, set a markup, toggle **Show price on images**.
3. Confirm the values persist (reload the popover) and that, with a sellable image, the public lightbox now shows the affordance (ties Task 9 together).

- [ ] **Step 6: Commit**

```bash
git add components/admin/platform/SiteSettingsPopover.js
git commit -m "feat(print): print store settings (enable, markup, show-price) in site settings"
```

---

## What this plan delivers

With the store enabled, a public visitor opens a for-sale image, sees "Available as a print," opens an in-lightbox configurator (size/finish/framing/color/mat), watches the lightbox image gain the chosen frame and mat in place with a live price, and reaches a placeholder Buy CTA. With the store disabled (default), no print UI appears anywhere. No checkout, payment, or fulfillment.

## Deferred to later plans

- **Plan 2b:** cart/checkout, shipping address, shipping quote, Stripe Connect, order records — replaces the placeholder CTA.
- **Plan 3:** live WHCC/Prodigi adapters, order placement, webhooks/tracking, Orders view. Also the photoreal preview upgrade (swap `FramedImage` behind the renderer boundary; evaluate the lab's mockup API).

## Self-review notes

- **Spec coverage:** §1 data flow → Tasks 3, 4, 9. §2 buyer experience → Tasks 6, 7, 8. §3 live preview (swappable renderer) → Tasks 1, 5. §4 photographer side → Task 10. §5 components → all. Gating (`enabled` + `sellable`) → Task 8 (render condition) + Task 3 (`publicPrintStore`). Pricing in the browser → Tasks 2, 6, 7. Out-of-scope items (checkout/fulfillment/photoreal) are not built.
- **Type consistency:** the spec shape `{ size, finish, frame, frameColor, matte }` is consistent across Tasks 5, 7, 8; `frameStyles`/`optionPrice`/`startingPrice`/`publicPrintForAsset`/`publicPrintStore` signatures match between definition and use; `PhotoLightbox`'s new `printStore` prop matches what `Gallery` passes (Task 9) and what `publicPrintStore` produces (Task 3).
- **No placeholders:** every code step shows complete code; the two integration tasks (9, 10) are explicitly justified as wiring over tested units and are covered by manual smoke tests.
