# Packages Presentation & Config Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present packages to clients via a right-side "Packages" drawer opened from a hero "View Packages" button (floating fallback when a page has no hero), and configure them via a "Configure" drill-in — with currency moved to global Site Settings.

**Architecture:** Reuse the Print Store's drawer + drill-in patterns. The client `ClientEngagementProvider` lifts to wrap the hero so `PageCover` can open the drawer; hero buttons get position-based styling (first = chosen style, rest = auto-complement). Enforcement, money math, entitlements, checkout, and the webhook are untouched.

**Tech Stack:** Next.js (pages router), React, Tailwind + inline styles, Jest + jsdom + React Testing Library.

## Global Constraints

- Naming is **"Packages"** in all user-facing labels; stored config keys stay `clientFeatures.purchase.*` (no data migration).
- Money is INTEGER CENTS; the admin price input converts dollars↔cents via the existing `purchasePackages` helpers.
- Currency is global: read from `printStore.currency` (default `'USD'`); no per-page currency.
- Client-side gating is UX only; the download route stays the real server gate (do NOT change `pages/api/client/download.js`, `resolveDownloadAccess`, the checkout route core, or the webhook).
- Test components by mocking modules with `jest.mock(...)` FACTORIES (NOT `jest.spyOn` on named exports — it fails under this project's SWC transform). See `__tests__/client-engagement/purchaseSheet.test.js` for the pattern. Do NOT modify `jest.config.js`.
- Run tests with `npm test -- <path>`. Never `next build` over the live dev server (port 3000).
- Copy reads like real prose — no fragment-stacks, no tricolons.

---

## File Structure

**Create:**
- `common/coverButtons.js` — pure `secondaryButtonStyle(primary)` (the complement).
- `components/image-displays/engagement/PackagesDrawer.js` — right-side drawer (replaces `PurchaseSheet.js`).
- Test files mirroring each change.

**Modify:**
- `components/image-displays/page/PageCover.js` — action buttons, position-based style, "View Packages" via context.
- `components/image-displays/engagement/ClientEngagementContext.js` — `heroPresent`+`currency` props, identity-gated `buyPackage`, currency source, floating-fallback gating, render `PackagesDrawer`.
- `pages/sites/[username]/[slug].js` — lift provider around `PageCover`; pass `heroPresent`+`currency`.
- `components/image-displays/engagement/PurchasePrompt.js` — relabel "View Packages", drop the per-client `all` hide.
- `common/clientPurchase.js` + `common/siteConfig.js` + `common/assetRefs.js` — drop `currency` from purchase config.
- `components/admin/platform/PageDesignPopover.js` — title "Design"; show Button Style when packages exist.
- `components/admin/platform/PageSettingsPopover.js` — Packages "Configure" drill-in + auto-enable Downloads; remove per-page currency.
- `components/admin/platform/SiteSettingsPopover.js` — currency selector in Print store.

**Delete:** `components/image-displays/engagement/PurchaseSheet.js` (replaced by `PackagesDrawer.js`) and its test `__tests__/client-engagement/purchaseSheet.test.js` (replaced).

---

## Task 1: `secondaryButtonStyle` pure helper

**Files:**
- Create: `common/coverButtons.js`
- Test: `__tests__/common/coverButtons.test.js`

**Interfaces:**
- Produces: `secondaryButtonStyle(primary: 'solid'|'outline') -> 'solid'|'outline'` — the complement.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/common/coverButtons.test.js
import { secondaryButtonStyle } from '@/common/coverButtons'

describe('secondaryButtonStyle', () => {
  it('returns the complement of the primary style', () => {
    expect(secondaryButtonStyle('solid')).toBe('outline')
    expect(secondaryButtonStyle('outline')).toBe('solid')
  })
  it('defaults a missing/garbage primary to outline (so a secondary button is visible over a solid-less hero)', () => {
    expect(secondaryButtonStyle(undefined)).toBe('outline')
    expect(secondaryButtonStyle('nonsense')).toBe('outline')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/coverButtons.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `common/coverButtons.js`**

```js
// common/coverButtons.js
// Pure: the "secondary" hero button style is the complement of the chosen
// (primary) style — solid pairs with outline and vice versa. Any non-'outline'
// input resolves to 'outline' so a secondary button stays visible.
export function secondaryButtonStyle(primary) {
  return primary === 'outline' ? 'solid' : 'outline'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/common/coverButtons.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add common/coverButtons.js __tests__/common/coverButtons.test.js
git commit -m "feat(packages): secondaryButtonStyle complement helper"
```

---

## Task 2: PageCover — action buttons, position-based style, "View Packages"

**Files:**
- Modify: `components/image-displays/page/PageCover.js`
- Test: `__tests__/components/pageCover.packages.test.js`

**Interfaces:**
- Consumes: `secondaryButtonStyle` (Task 1); `useClientEngagement()` returning `{ features: { purchase }, packages: [], openPurchase() }` or `null`.
- Behavior: first hero button keeps `cover.buttonStyle`; every later button uses the complement. A "View Packages" **action** button (a `<button>` calling `openPurchase`) is appended after "View Music Show" when `ctx.features.purchase` and `ctx.packages.length > 0`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/pageCover.packages.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/components/image-displays/engagement/ClientEngagementContext', () => ({
  useClientEngagement: jest.fn(),
}))
jest.mock('@/common/imageUtils', () => ({ getSizedUrl: (u) => u }))
import { useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'
import PageCover from '@/components/image-displays/page/PageCover'

const cover = { imageUrl: 'https://cdn/x.jpg', height: 'partial', buttonStyle: 'solid' }

afterEach(() => jest.clearAllMocks())

it('renders a View Packages action button when packages are configured, and opens the drawer on click', () => {
  const openPurchase = jest.fn()
  useClientEngagement.mockReturnValue({ features: { purchase: true }, packages: [{ id: 'p1' }], openPurchase })
  render(<PageCover cover={cover} title="Redwoods" slideshowHref="/redwoods/slideshow" />)
  const btn = screen.getByRole('button', { name: /view packages/i })
  fireEvent.click(btn)
  expect(openPurchase).toHaveBeenCalled()
})

it('the secondary (non-first) button uses the complement style (outline classes when primary is solid)', () => {
  useClientEngagement.mockReturnValue({ features: { purchase: true }, packages: [{ id: 'p1' }], openPurchase: () => {} })
  render(<PageCover cover={cover} title="Redwoods" slideshowHref="/redwoods/slideshow" />)
  // First button is "View Music Show" (solid); "View Packages" is later -> outline
  const pkg = screen.getByRole('button', { name: /view packages/i })
  expect(pkg.className).toMatch(/border/) // outline map uses `border border-white`
  const music = screen.getByRole('link', { name: /view music show/i })
  expect(music.className).toMatch(/bg-white/) // solid map
})

it('renders no View Packages button when purchase is off or context is absent', () => {
  useClientEngagement.mockReturnValue(null)
  render(<PageCover cover={cover} title="Redwoods" slideshowHref="/redwoods/slideshow" />)
  expect(screen.queryByRole('button', { name: /view packages/i })).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/components/pageCover.packages.test.js`
Expected: FAIL — no View Packages button / not an action button.

- [ ] **Step 3: Rewrite `components/image-displays/page/PageCover.js`**

```jsx
// components/image-displays/page/PageCover.js
import { getSizedUrl } from '../../../common/imageUtils'
import { secondaryButtonStyle } from '../../../common/coverButtons'
import { useClientEngagement } from '../engagement/ClientEngagementContext'

const BUTTON_STYLE_MAP = {
  solid: 'bg-white text-stone-900 hover:bg-stone-100',
  outline: 'border border-white text-white hover:bg-white/10',
}

function CtaButton({ label, href, onClick, style }) {
  if (!label) return null
  const cls = `inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors ${BUTTON_STYLE_MAP[style] || BUTTON_STYLE_MAP.solid}`
  if (onClick) {
    return <button type="button" onClick={onClick} className={cls}>{label}</button>
  }
  const isExternal = href?.startsWith('http')
  return (
    <a href={href || '#'} className={cls} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {label}
    </a>
  )
}

export default function PageCover({ cover, title, description, slideshowHref, clientFeaturesEnabled, primaryButton, navLinks = [] }) {
  const ctx = useClientEngagement()
  if (!cover || !cover.imageUrl) return null
  const isFull = cover.height === 'full'
  const heightClass = isFull ? 'h-screen' : 'h-[60vh]'
  const primaryStyle = cover.buttonStyle === 'outline' ? 'outline' : 'solid'
  const secondaryStyle = secondaryButtonStyle(primaryStyle)

  const showPackages = !!(ctx?.features?.purchase && (ctx.packages || []).length)

  const buttons = []
  if (primaryButton?.label) buttons.push(primaryButton)
  if (slideshowHref) buttons.push({ label: 'View Music Show', href: slideshowHref })
  if (showPackages) buttons.push({ label: 'View Packages', onClick: () => ctx.openPurchase() })
  if (clientFeaturesEnabled) buttons.push({ label: 'Client Login', href: '#client-login' })

  return (
    <section className={`relative w-full ${heightClass} overflow-hidden`}>
      <img
        src={getSizedUrl(cover.imageUrl, 'display') || cover.imageUrl}
        alt={cover.overlayText || title || ''}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
        {title && <h2 className="text-4xl md:text-6xl font-light tracking-tight mb-3">{title}</h2>}
        {description && <p className="text-base md:text-lg text-white/80 max-w-xl mb-6">{description}</p>}
        {navLinks.length > 0 && (
          <nav className="flex flex-wrap items-center justify-center gap-6 mb-8">
            {navLinks.map((l, i) => (
              <a key={i} href={l.href} className="text-sm text-white/90 hover:text-white transition-colors">{l.label}</a>
            ))}
          </nav>
        )}
        {buttons.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {buttons.map((btn, i) => (
              <CtaButton key={i} label={btn.label} href={btn.href} onClick={btn.onClick} style={i === 0 ? primaryStyle : secondaryStyle} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/components/pageCover.packages.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/page/PageCover.js __tests__/components/pageCover.packages.test.js
git commit -m "feat(packages): hero View Packages action button + position-based styles"
```

---

## Task 3: Provider — currency/heroPresent props, identity-gated buyPackage, floating gating

**Files:**
- Modify: `components/image-displays/engagement/ClientEngagementContext.js`
- Test: `__tests__/client-engagement/engagementContext.purchase.test.js`

**Interfaces:**
- Consumes: `PackagesDrawer` (Task 5 — import path `./PackagesDrawer`; create a temporary shim if building this task first, but Task 5 lands the real file).
- Produces (on ctx): `purchaseCurrency` (from `currency` prop), `buyPackage(packageId)` (identity-gated), `openPurchase()`, `packages`, `purchaseState`. New provider props: `heroPresent`, `currency`. Floating `PurchasePrompt` renders only when `features.purchase && !heroPresent`.

**Note:** This task imports `./PackagesDrawer`, which Task 5 creates. To keep this task's tests green, Task 5 must land the file. If implementing strictly in order, replace the `PurchaseSheet` import/usage with `PackagesDrawer` here and create a minimal `PackagesDrawer.js` stub in Task 3 that Task 5 fleshes out. Simplest: do the import swap here and let Task 5 replace the file body. Since the test below does not mount `PackagesDrawer`, importing the existing `PurchaseSheet` temporarily is fine — but rename the render to `PackagesDrawer` in Task 5.

To avoid a dangling import, in THIS task keep rendering the existing `PurchaseSheet` (do not change the import yet); Task 5 renames the file and swaps the import. Everything else in this task is independent of the drawer's internals.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/client-engagement/engagementContext.purchase.test.js
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ClientEngagementProvider, useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'

jest.mock('@/common/clientIdentity', () => ({
  getClientIdentity: jest.fn(() => ({ deviceId: 'd1', name: 'Mia', email: 'mia@x.com' })),
  saveClientIdentity: jest.fn((u, v) => ({ deviceId: 'd1', ...v })),
}))

const CF = { enabled: true, purchase: { enabled: true, packages: [{ id: 'pkg_a', label: 'Ten', credits: 10, price: 4000 }] } }

function Probe() {
  const ctx = useClientEngagement()
  return (
    <div>
      <span data-testid="cur">{ctx.purchaseCurrency}</span>
      <button onClick={() => ctx.buyPackage('pkg_a')}>buy</button>
    </div>
  )
}

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ url: 'https://stripe/cs_1' }) }))
  delete window.location
  window.location = { pathname: '/gallery', search: '', href: '' }
})

it('exposes currency from the currency prop and checks out an identified buyer', async () => {
  render(
    <ClientEngagementProvider username="ada" pageId="p1" pageSlug="gallery" clientFeatures={CF} paymentsReady currency="EUR" heroPresent>
      <Probe />
    </ClientEngagementProvider>
  )
  expect(screen.getByTestId('cur').textContent).toBe('EUR')
  await act(async () => { fireEvent.click(screen.getByText('buy')); await Promise.resolve() })
  const call = global.fetch.mock.calls.find(c => c[0] === '/api/client/purchase/checkout')
  expect(call).toBeTruthy()
  expect(JSON.parse(call[1].body)).toMatchObject({ username: 'ada', pageId: 'p1', packageId: 'pkg_a', buyer: { email: 'mia@x.com' } })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/client-engagement/engagementContext.purchase.test.js`
Expected: FAIL — `purchaseCurrency` is `'USD'` (not from prop) and/or `buyPackage` undefined.

- [ ] **Step 3: Edit `ClientEngagementContext.js`**

**(a)** Provider signature (line 17) — add `currency` and `heroPresent`:

```js
export function ClientEngagementProvider({ username, pageId, pageSlug, clientFeatures, paymentsReady, currency, heroPresent, branding, children }) {
```

**(b)** Add `performCheckout` near `completeIdentity` (after the `completeIdentity` useCallback, ~line 125):

```js
  const performCheckout = useCallback(async (id, packageId) => {
    const res = await fetch('/api/client/purchase/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pageId, packageId, buyer: { email: id?.email, name: id?.name }, returnPath: window.location.pathname }),
    })
    const body = await res.json().catch(() => null)
    if (body?.url) {
      window.location.href = body.url
    } else {
      setError('Could not start checkout — try again')
      setTimeout(() => setError(null), 2500)
    }
  }, [username, pageId])
```

**(c)** Extend `needsIdentity` so `purchase` requires an email like `download` does. Find the line `if (kind === 'download') return !identity.email` and change it to:

```js
    if (kind === 'download' || kind === 'purchase') return !identity.email
```

**(d)** In the `ctx` memo, set `purchaseCurrency` from the prop and replace `startCheckout` with `buyPackage`:

```js
    purchaseCurrency: currency || 'USD',
```

Replace the whole `startCheckout: async (packageId) => { ... },` block with:

```js
    buyPackage: (packageId) => runOrPrompt('purchase', (id) => performCheckout(id, packageId)),
```

**(e)** Add `currency`, `heroPresent`, `performCheckout` to the `ctx` `useMemo` dependency array (the array currently ending `...purchaseState, purchaseOpen, paymentsReady, purchaseCfg]`):

```js
  }, [enabled, features, branding, identity, data, myFavorites, submitted, runOrPrompt, performFavorite, performComment, post, downloadUrl, username, pageId, pageSlug, purchaseState, purchaseOpen, paymentsReady, purchaseCfg, currency, heroPresent, performCheckout])
```

**(f)** In the `IdentityPrompt` `requireEmail` prop, treat `purchase` like `download`. Change:

```js
            pendingAction.kind === 'download'
```
to:
```js
            pendingAction.kind === 'download' || pendingAction.kind === 'purchase'
```

**(g)** Gate the floating fallback on `!heroPresent`. Change the line `{features.purchase && <PurchasePrompt />}` to:

```js
      {features.purchase && !heroPresent && <PurchasePrompt />}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/client-engagement/engagementContext.purchase.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full engagement suite (no regressions)**

Run: `npm test -- __tests__/client-engagement`
Expected: PASS (existing suites still green; the old `purchaseSheet.test.js` still passes since the drawer is unchanged this task).

- [ ] **Step 6: Commit**

```bash
git add components/image-displays/engagement/ClientEngagementContext.js __tests__/client-engagement/engagementContext.purchase.test.js
git commit -m "feat(packages): provider currency/heroPresent props + identity-gated buyPackage"
```

---

## Task 4: Lift the provider around the hero; thread heroPresent + currency

**Files:**
- Modify: `pages/sites/[username]/[slug].js`

**Interfaces:**
- Consumes: provider props `currency`, `heroPresent` (Task 3).

- [ ] **Step 1: Move `PageCover` inside the provider and pass the new props**

In `pages/sites/[username]/[slug].js`, the `<main>` currently renders `<PageCover .../>` then a `<ClientEngagementProvider>` wrapping only `<Gallery/>`. Restructure so the provider wraps BOTH `PageCover` and `Gallery`, and add `currency` + `heroPresent`. Replace the block from `<PageCover` through the closing `</ClientEngagementProvider>` with:

```jsx
        <ClientEngagementProvider
          username={username}
          pageId={page.id}
          pageSlug={page.slug || page.id}
          clientFeatures={page.clientFeatures}
          paymentsReady={printStore.paymentsReady}
          currency={printStore.currency}
          heroPresent={hasCover}
          branding={{ siteName: siteConfig.siteName, logo: siteConfig.logoType === 'image' ? siteConfig.logo : '', logoFont: siteConfig.logoFont || 'theme' }}
        >
          <PageCover
            cover={page.cover}
            title={page.title}
            description={page.description}
            slideshowHref={slideshowHref}
            clientFeaturesEnabled={!!page.clientFeatures?.enabled}
            navLinks={coverNavLinks}
          />
          <Gallery
            name={page.title}
            description={page.description}
            blocks={resolvedBlocks}
            pages={siteConfig.pages}
            childPages={subNavPages}
            activeChildId={activeSubNavId}
            username={username}
            basePath={basePath}
            enableSlideshow={!!slideshowHref}
            onSlideshowClick={() => { if (slideshowHref) window.location.href = slideshowHref }}
            siteConfig={siteConfig}
            printStore={printStore}
            coverHeight={page.cover?.height || 'partial'}
            coverButtonStyle={page.cover?.buttonStyle || 'solid'}
            themeId={theme.id}
            hasCover={hasCover}
          />
        </ClientEngagementProvider>
```

(Confirm against the current file: keep every `PageCover`/`Gallery` prop that is already passed; the only structural change is that `PageCover` now sits inside the provider, plus the two new provider props. `printStore.currency` comes from `publicPrintStore()` which already includes `currency`.)

- [ ] **Step 2: Verify the page compiles and renders (dev server on :3000)**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/sites/swamiphoto/portfolio`
Expected: `200` (password gate renders; no server error). Also confirm no new errors in the dev log.

- [ ] **Step 3: Run the full suite to confirm no import/type regressions**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "pages/sites/[username]/[slug].js"
git commit -m "feat(packages): lift engagement provider around the hero; thread currency + heroPresent"
```

---

## Task 5: PurchaseSheet → PackagesDrawer (right-side drawer)

**Files:**
- Create: `components/image-displays/engagement/PackagesDrawer.js`
- Delete: `components/image-displays/engagement/PurchaseSheet.js`, `__tests__/client-engagement/purchaseSheet.test.js`
- Modify: `components/image-displays/engagement/ClientEngagementContext.js` (import + render)
- Test: `__tests__/client-engagement/packagesDrawer.test.js`

**Interfaces:**
- Consumes ctx: `packages`, `purchaseCurrency`, `buyPackage(id)`, `identity`.
- Behavior: a right-side drawer titled "Packages", no unlocked-count header; each row shows label + grant line + price + Buy; Buy calls `ctx.buyPackage(id)`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/client-engagement/packagesDrawer.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/components/image-displays/engagement/ClientEngagementContext', () => ({
  useClientEngagement: jest.fn(),
}))
import { useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'
import PackagesDrawer from '@/components/image-displays/engagement/PackagesDrawer'

afterEach(() => jest.clearAllMocks())

it('shows "Packages", lists grants + prices, and buys via buyPackage — with no unlocked-count header', () => {
  const buyPackage = jest.fn()
  useClientEngagement.mockReturnValue({
    identity: { email: 'mia@x.com' },
    purchaseCurrency: 'USD',
    packages: [
      { id: 'pkg_a', label: 'Add-on pack', credits: 10, price: 4000 },
      { id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 },
    ],
    buyPackage,
  })
  render(<PackagesDrawer open onClose={() => {}} />)
  expect(screen.getByText('Packages')).toBeInTheDocument()
  expect(screen.getByText('10 more photos')).toBeInTheDocument()
  expect(screen.getByText('Everything in this gallery')).toBeInTheDocument()
  expect(screen.getByText('$150.00')).toBeInTheDocument()
  expect(screen.queryByText(/unlocked/i)).toBeNull()
  fireEvent.click(screen.getByText('Entire gallery'))
  expect(buyPackage).toHaveBeenCalledWith('pkg_all')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/client-engagement/packagesDrawer.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/image-displays/engagement/PackagesDrawer.js`**

```jsx
// components/image-displays/engagement/PackagesDrawer.js
// Right-side drawer listing purchasable packages — mirrors PrintConfigurator's
// slide-out so prints and packages feel like one system. No per-client unlock
// state is shown; it simply lists what's for sale.
import { useEffect, useState } from 'react'
import { useClientEngagement } from './ClientEngagementContext'

const PANEL_WIDTH = 460

function formatPrice(cents, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100)
  } catch {
    return `${((cents || 0) / 100).toFixed(2)} ${currency || 'USD'}`
  }
}

export default function PackagesDrawer({ open, onClose }) {
  const ctx = useClientEngagement()
  const [loading, setLoading] = useState(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!ctx) return null
  const { packages, purchaseCurrency } = ctx

  function buy(id) {
    if (ctx.identity?.email) setLoading(id) // only show the redirect state when checkout will go straight through
    ctx.buyPackage(id)
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,14,8,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.25s ease' }}
      />
      <aside
        role="dialog"
        aria-label="Packages"
        aria-hidden={!open}
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 81, width: PANEL_WIDTH, maxWidth: '92vw', background: '#f4efe8', boxShadow: '-24px 0 60px rgba(20,14,8,0.4)', transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#2c2416', letterSpacing: '-0.01em' }}>Packages</span>
          <button type="button" aria-label="Close packages" onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#7a6b55' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(160,140,110,0.14)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 20px 24px' }}>
          {(packages || []).map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              disabled={loading === pkg.id}
              onClick={() => buy(pkg.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#fdf9f4', border: '1px solid rgba(160,140,110,0.22)', borderRadius: 10, cursor: 'pointer', width: '100%' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fbf4ea' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fdf9f4' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416' }}>{pkg.label}</div>
                <div style={{ fontSize: 12, color: '#a8967a', marginTop: 2 }}>
                  {pkg.credits === 'all' ? 'Everything in this gallery' : `${pkg.credits} more photo${pkg.credits === 1 ? '' : 's'}`}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416' }}>
                {loading === pkg.id ? 'Redirecting…' : formatPrice(pkg.price, purchaseCurrency)}
              </div>
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/client-engagement/packagesDrawer.test.js`
Expected: PASS.

- [ ] **Step 5: Swap the drawer in the provider and delete PurchaseSheet**

In `ClientEngagementContext.js`, change the import `import PurchaseSheet from './PurchaseSheet'` to `import PackagesDrawer from './PackagesDrawer'`, and change the render line `{purchaseOpen && <PurchaseSheet onClose={() => setPurchaseOpen(false)} />}` to:

```js
      <PackagesDrawer open={purchaseOpen} onClose={() => setPurchaseOpen(false)} />
```

(The drawer stays mounted and animates via `open`; the old modal was conditionally mounted.) Then delete the old files:

```bash
git rm components/image-displays/engagement/PurchaseSheet.js __tests__/client-engagement/purchaseSheet.test.js
```

- [ ] **Step 6: Run the full engagement suite**

Run: `npm test -- __tests__/client-engagement`
Expected: PASS (new drawer test green; old sheet test gone; context test still green).

- [ ] **Step 7: Commit**

```bash
git add components/image-displays/engagement/PackagesDrawer.js components/image-displays/engagement/ClientEngagementContext.js __tests__/client-engagement/packagesDrawer.test.js
git commit -m "feat(packages): replace PurchaseSheet modal with a right-side Packages drawer"
```

---

## Task 6: PurchasePrompt → floating "View Packages" fallback

**Files:**
- Modify: `components/image-displays/engagement/PurchasePrompt.js`
- Test: `__tests__/client-engagement/purchasePrompt.test.js` (update existing)

**Interfaces:**
- Behavior: label is "View Packages"; it no longer hides when the client owns everything (the provider decides visibility by `!heroPresent`).

- [ ] **Step 1: Update the test**

Replace `__tests__/client-engagement/purchasePrompt.test.js` with:

```js
// __tests__/client-engagement/purchasePrompt.test.js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/components/image-displays/engagement/ClientEngagementContext', () => ({
  useClientEngagement: jest.fn(),
}))
import { useClientEngagement } from '@/components/image-displays/engagement/ClientEngagementContext'
import PurchasePrompt from '@/components/image-displays/engagement/PurchasePrompt'

const base = (over) => ({
  features: { purchase: true },
  packages: [{ id: 'pkg_all', label: 'Entire gallery', credits: 'all', price: 15000 }],
  purchaseState: { all: false },
  openPurchase: jest.fn(),
  ...over,
})
afterEach(() => jest.clearAllMocks())

it('renders "View Packages" and opens the drawer', () => {
  const ctx = base()
  useClientEngagement.mockReturnValue(ctx)
  render(<PurchasePrompt />)
  fireEvent.click(screen.getByRole('button', { name: /view packages/i }))
  expect(ctx.openPurchase).toHaveBeenCalled()
})

it('still shows even when the client already owns everything (no per-client hide)', () => {
  useClientEngagement.mockReturnValue(base({ purchaseState: { all: true } }))
  render(<PurchasePrompt />)
  expect(screen.getByRole('button', { name: /view packages/i })).toBeInTheDocument()
})

it('hides when purchase is not active or no packages', () => {
  useClientEngagement.mockReturnValue(base({ features: { purchase: false } }))
  const { container } = render(<PurchasePrompt />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/client-engagement/purchasePrompt.test.js`
Expected: FAIL — label is still "Get the full set" and the all-owned case still hides.

- [ ] **Step 3: Edit `PurchasePrompt.js`**

Remove the `if (ctx.purchaseState?.all) return null` line (line 11), and change the button label text `Get the full set` (line 23) to `View Packages`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/client-engagement/purchasePrompt.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/image-displays/engagement/PurchasePrompt.js __tests__/client-engagement/purchasePrompt.test.js
git commit -m "feat(packages): floating fallback becomes View Packages, no per-client hide"
```

---

## Task 7: Drop `currency` from per-page purchase config

**Files:**
- Modify: `common/clientPurchase.js` (`normalizePurchaseConfig`), `common/siteConfig.js` (default), `common/assetRefs.js` (normalizePageEntity)
- Test: `__tests__/common/clientPurchase.normalize.test.js` (update)

**Interfaces:**
- Produces: `normalizePurchaseConfig(purchase) -> { enabled, freeAllowance, packages }` (no `currency`).

- [ ] **Step 1: Update the normalize test**

In `__tests__/common/clientPurchase.normalize.test.js`, the "fills defaults" case currently expects `{ enabled: false, freeAllowance: 0, currency: 'USD', packages: [] }`. Change the expectation to drop `currency`:

```js
  it('fills defaults from empty/undefined', () => {
    expect(normalizePurchaseConfig(undefined)).toEqual({
      enabled: false, freeAllowance: 0, packages: [],
    })
  })
```

Also, in the "keeps well-formed packages" case, remove `currency: 'EUR'` from the input and drop the `expect(p.currency).toBe('EUR')` assertion (currency is no longer part of this config).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/common/clientPurchase.normalize.test.js`
Expected: FAIL — output still contains `currency`.

- [ ] **Step 3: Remove currency from `normalizePurchaseConfig`**

In `common/clientPurchase.js`, the `return` of `normalizePurchaseConfig` currently includes `currency: p.currency || 'USD',`. Remove that line so it returns `{ enabled, freeAllowance, packages }`.

- [ ] **Step 4: Update the config defaults**

In `common/siteConfig.js`, the `purchase` default (currently `purchase: { enabled: false, freeAllowance: 0, currency: 'USD', packages: [] },`) becomes:

```js
      purchase: { enabled: false, freeAllowance: 0, packages: [] },
```

In `common/assetRefs.js`, `normalizePageEntity` delegates purchase to `normalizePurchaseConfig(cf.purchase)` already (no `currency` handling there), so no change is needed — confirm by reading the `purchase:` line in that file.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- __tests__/common/clientPurchase.normalize.test.js __tests__/common`
Expected: PASS (normalize green; no other `common` regressions).

- [ ] **Step 6: Commit**

```bash
git add common/clientPurchase.js common/siteConfig.js __tests__/common/clientPurchase.normalize.test.js
git commit -m "feat(packages): drop per-page currency from purchase config (currency is global)"
```

---

## Task 8: PageDesignPopover — rename to "Design"; show Button Style when packages exist

**Files:**
- Modify: `components/admin/platform/PageDesignPopover.js`
- Test: `__tests__/components/pageDesignPopover.test.js`

**Interfaces:**
- Behavior: popover title is "Design"; the Button Style control shows when slideshow OR clientFeatures OR purchase is enabled.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/components/pageDesignPopover.test.js
import React from 'react'
import { render, screen } from '@testing-library/react'
jest.mock('@/components/admin/platform/PopoverShell', () => ({ __esModule: true, default: ({ title, children }) => <div><h1>{title}</h1>{children}</div> }))
import PageDesignPopover from '@/components/admin/platform/PageDesignPopover'

it('titles the popover "Design" and shows Button style when packages are enabled', () => {
  const page = { cover: { imageUrl: 'x', height: 'partial', buttonStyle: 'solid' }, clientFeatures: { enabled: true, purchase: { enabled: true } } }
  render(<PageDesignPopover page={page} onUpdate={() => {}} onClose={() => {}} anchorEl={null} />)
  expect(screen.getByText('Design')).toBeInTheDocument()
  expect(screen.getByText('Button style')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/components/pageDesignPopover.test.js`
Expected: FAIL — title is "Page Design".

- [ ] **Step 3: Edit `PageDesignPopover.js`**

Change the `PopoverShell` `title="Page Design"` (line 15) to `title="Design"`. Change the `showButtonStyle` line (line 12) to also include purchase:

```js
  const showButtonStyle = !!(page.slideshow?.enabled || page.clientFeatures?.enabled || page.clientFeatures?.purchase?.enabled)
```

(`clientFeatures.enabled` already covers the client-login button; the extra `purchase` clause is harmless and explicit.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/components/pageDesignPopover.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/admin/platform/PageDesignPopover.js __tests__/components/pageDesignPopover.test.js
git commit -m "feat(packages): rename hero design popover to Design"
```

---

## Task 9: Packages "Configure" drill-in + auto-enable Downloads; remove per-page currency

**Files:**
- Modify: `components/admin/platform/PageSettingsPopover.js`

**Interfaces:**
- Behavior: Client Features shows a **"Packages"** `ToggleRow` (toggle + "Configure" chevron → `setView('packages')`); toggling it on also sets `downloads.enabled`. A new `view === 'packages'` renders free-allowance + package editor (no currency). The old inline "Purchase" `FeatureBlock` is removed.

**Note:** `ToggleRow` (with `actionLabel`/`onDrillIn` chevron) and `updateCf`, `setView`, `paymentsReady`, and the `purchasePackages` helpers already exist in this file.

- [ ] **Step 1: Replace the Purchase FeatureBlock with a Packages ToggleRow**

In the `view === 'client'` block, delete the entire `<FeatureBlock label="Purchase" ...> ... </FeatureBlock>` (the block spanning the current lines ~381–464) and replace it with a Packages `ToggleRow`. Since the surrounding container is `<div className="px-3 py-3 space-y-3">` (FeatureBlocks), and `ToggleRow` renders its own full-width row with padding/border, render it as a sibling that visually matches — use a compact toggle row consistent with the other FeatureBlocks:

```jsx
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Packages</span>
              <ToggleSwitch
                on={cf.purchase?.enabled || false}
                onChange={(v) => {
                  // Delivery depends on downloads; enabling Packages enables Downloads too.
                  const patch = { clientFeatures: { ...cf, purchase: { ...(cf.purchase || {}), enabled: v } } }
                  if (v) patch.clientFeatures.downloads = { ...(cf.downloads || {}), enabled: true }
                  update(patch)
                }}
                ariaLabel="Packages"
              />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 3 }}>
              Sell downloads in packages. Clients buy from your gallery; checkout is handled for you.
            </div>
            {cf.purchase?.enabled && (
              <button
                type="button"
                onClick={() => setView('packages')}
                className="flex items-center gap-0.5 text-xs mt-2"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                Configure
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
            {cf.purchase?.enabled && !paymentsReady && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Connect a payout account in Site Settings → Print store to accept payments.</p>
            )}
          </div>
```

(`update` is the existing whole-page updater; using it directly lets the toggle set both `purchase.enabled` and `downloads.enabled` in one write.)

- [ ] **Step 2: Add the `packages` drill-in view**

Add a new view block right before the `view === 'client'` block (so it's a sibling `if`):

```jsx
  // ── Packages drill-in ─────────────────────────────────────────────────────
  if (view === 'packages') {
    const purchase = cf.purchase || {}
    return (
      <PopoverShell anchorEl={anchorEl} onClose={onClose} width={300} title="Packages" onBack={() => setView('client')}>
        <div className="px-3 py-3 space-y-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: 'var(--text-muted)' }}>Free downloads</div>
            <input
              type="number" min="0" step="1"
              className="w-20 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent"
              value={purchase.freeAllowance ?? 0}
              onChange={(e) => updateCf('purchase', { freeAllowance: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>How many photos each client can download for free before paying.</p>
          </div>
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>Packages</div>
            {(purchase.packages || []).map((pkg) => (
              <div key={pkg.id} className="rounded-md p-2 space-y-1.5" style={{ border: '1px solid rgba(160,140,110,0.22)' }}>
                <input
                  type="text" placeholder="Package name"
                  className="w-full border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent"
                  value={pkg.label}
                  onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { label: e.target.value }) })}
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={pkg.credits === 'all'}
                      onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { credits: e.target.checked ? 'all' : 10 }) })}
                    />
                    Entire gallery
                  </label>
                  {pkg.credits !== 'all' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="1" step="1" title="Photos"
                        className="w-14 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent text-center"
                        value={pkg.credits}
                        onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { credits: Math.max(1, parseInt(e.target.value, 10) || 1) }) })}
                      />
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>photos</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{siteConfig?.printStore?.currency || 'USD'}</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      className="w-16 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent"
                      value={centsToDollars(pkg.price)}
                      onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { price: dollarsToCents(e.target.value) }) })}
                    />
                  </div>
                  <button type="button" aria-label="Remove package" className="px-1" style={{ color: 'var(--text-muted)' }} onClick={() => updateCf('purchase', { packages: removePackage(purchase.packages, pkg.id) })}>×</button>
                </div>
              </div>
            ))}
            <button type="button" className="text-[11px] font-mono uppercase tracking-[0.07em]" style={{ color: '#8b6f47' }} onClick={() => updateCf('purchase', { packages: addPackage(purchase.packages) })}>+ Add package</button>
          </div>
        </div>
      </PopoverShell>
    )
  }
```

- [ ] **Step 3: Verify the components suite (no syntax/regression)**

Run: `npm test -- __tests__/components`
Expected: PASS. Also confirm the file parses (no unbalanced JSX) — a failing parse shows as a suite load error.

- [ ] **Step 4: Manual smoke check (dev server on :3000)**

Open a gallery's Page Settings → Client Features. Confirm a "Packages" row with a toggle; enabling it also flips Downloads on; a "Configure" chevron opens the Packages drill-in with free-allowance + package cards (name / Entire-gallery checkbox or photo count / price in the site currency / remove / add); no currency selector in the drill-in.

- [ ] **Step 5: Commit**

```bash
git add components/admin/platform/PageSettingsPopover.js
git commit -m "feat(packages): Packages Configure drill-in + auto-enable Downloads"
```

---

## Task 10: Site Settings — currency selector in Print store

**Files:**
- Modify: `components/admin/platform/SiteSettingsPopover.js`

**Interfaces:**
- Behavior: the Print store `PrintView` gains a currency `<select>` that writes `printStore.currency` (options USD/EUR/GBP/CAD/AUD).

- [ ] **Step 1: Add the currency field to `PrintView`**

In `components/admin/platform/SiteSettingsPopover.js`, inside `PrintView`'s Pricing section (the `<div className="space-y-4" ...>` that holds the markup `Field` and the "Show starting price" toggle), add a currency `Field` after the markup `Field`:

```jsx
                <Field label="Currency">
                  <select
                    className={inputCls}
                    style={inputStyle}
                    value={ps.currency || 'USD'}
                    onChange={(e) => updatePrintStore({ currency: e.target.value })}
                  >
                    {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
                    Used for prints and package sales.
                  </p>
                </Field>
```

(`Field`, `inputCls`, `inputStyle`, and `updatePrintStore`/`ps` are already in scope in `PrintView`.)

- [ ] **Step 2: Verify the components suite**

Run: `npm test -- __tests__/components`
Expected: PASS.

- [ ] **Step 3: Manual smoke check**

Open Site Settings → Print store. Confirm a Currency selector appears in Pricing and persists on reload (writes `printStore.currency`). Confirm a package price in a gallery's Packages drawer displays in the chosen currency.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/SiteSettingsPopover.js
git commit -m "feat(packages): global currency selector in Print store settings"
```

---

## Task 11: Full-suite verification + manual dogfood

**Files:** none (verification only)

- [ ] **Step 1: Run the entire suite**

Run: `npm test`
Expected: PASS — all suites green. Fix any regression before proceeding.

- [ ] **Step 2: Manual end-to-end (dev server on :3000, authenticated)**

On a gallery with a hero cover, Packages enabled with a couple of packages and a connected Stripe test account:
1. Admin: enabling Packages flips Downloads on; "Configure" opens the Packages drill-in; currency comes from Site Settings.
2. Client (fresh profile): the hero shows a **"View Packages"** button (secondary/outline next to "View Music Show"). Clicking it opens the right-side **"Packages"** drawer titled "Packages" with no "unlocked X of Y" line.
3. On a page WITHOUT a hero, the floating "View Packages" button appears instead; never both.
4. Clicking Buy with no email first prompts for name/email, then redirects to Stripe test checkout; prices show in the Site-Settings currency.
5. Existing download paywall (402), re-download, favorites/comments still behave as before.

- [ ] **Step 3: Note any gaps** for the final review (e.g. hero button contrast on light cover images).

---

## Self-Review Notes (author)

- **Spec coverage:** drawer (T5), hero button + styles (T1,T2), provider lift + currency + identity gate (T3,T4), floating fallback (T6), currency drop from config (T7) + Site Settings currency (T10), Design rename (T8), Configure drill-in + auto-enable Downloads (T9), verification (T11). Every spec section maps to a task.
- **Deferred per spec (no tasks):** photo-stack thumbnails, product types (mugs/prints/tees), per-theme placement logic.
- **Type consistency:** `buyPackage(packageId)` (T3) is what `PackagesDrawer` (T5) and the hero flow call; `purchaseCurrency` sourced from the `currency` prop (T3) is read by the drawer (T5); `secondaryButtonStyle` (T1) is used by `PageCover` (T2). Provider props `heroPresent`/`currency` (T3) are passed by `[slug].js` (T4).
- **Enforcement untouched:** no task edits the download route, `resolveDownloadAccess`, the checkout route core, or the webhook — only presentation/config and the client-side identity gate on Buy.
