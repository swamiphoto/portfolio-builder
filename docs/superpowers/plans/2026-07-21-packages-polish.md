# Packages Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the Packages admin config (Configure-on-the-right row, intro copy, labeled package-card editor with an offer-type dropdown) and add a stacked-photo thumbnail to each drawer package row.

**Architecture:** Admin changes are contained to `PageSettingsPopover.js`. The drawer thumbnail threads one representative gallery photo (`pageDisplayThumbnail`) through `ClientEngagementProvider` into `PackagesDrawer`. No enforcement/money/checkout/webhook changes.

**Tech Stack:** Next.js (pages router), React, Tailwind + inline styles, Jest + jsdom + React Testing Library.

**Scope note:** This is Plan 1 of two. Plan 2 (hero unification — collapsing `PageCover`/`GalleryCover` into one `Hero`) is a separate rendering refactor. This plan does NOT touch the hero; "View Packages" continues to show via the floating fallback until Plan 2 lands.

## Global Constraints

- Naming is **"Packages"** in user-facing labels; stored keys stay `clientFeatures.purchase.*`; the package shape stays `{ id, label, credits, price }` (credits = positive int OR `'all'`).
- Money is INTEGER CENTS; the price input converts dollars↔cents via the existing `purchasePackages` helpers.
- Currency is global — read from `siteConfig.printStore.currency` (default `'USD'`).
- Enabling Packages must still **auto-enable Downloads** in one atomic `update()` write; disabling Packages must leave Downloads alone.
- Test components with `jest.mock(...)` FACTORIES (NOT `jest.spyOn` on named exports). Do NOT modify `jest.config.js`.
- Run tests with `npm test -- <path>`. Never `next build` over the live dev server (port 3000).
- Copy reads like real prose — no fragment-stacks, no tricolons.

---

## File Structure

**Modify:**
- `components/admin/platform/PageSettingsPopover.js` — Packages row (Configure on the right); Packages drill-in (intro + labeled package cards + offer-type dropdown).
- `components/image-displays/engagement/ClientEngagementContext.js` — accept a `heroPhoto` prop, expose `packageThumb` on the context.
- `components/image-displays/engagement/PackagesDrawer.js` — render a stacked-photo thumbnail per package row.
- `pages/sites/[username]/[slug].js` and `pages/sites/[username]/index.js` — pass `heroPhoto={pageDisplayThumbnail(page)}` to the provider.

**Test:**
- `__tests__/client-engagement/packagesDrawer.test.js` (extend — thumbnail rendering).

---

## Task 1: Packages row — Configure on the right

**Files:**
- Modify: `components/admin/platform/PageSettingsPopover.js` (the Packages row in the `view === 'client'` block)

**Interfaces:**
- Uses existing in-scope helpers: `ToggleSwitch` (imported), `update`, `setView`, `paymentsReady`, `cf`.

**Design note:** The other client-feature rows (Downloads/Favorites/etc.) are `FeatureBlock`s with the toggle on the right. Keep the Packages toggle on the right too (sibling-consistent), and move **"Configure ▸" onto the same row, to the left of the toggle** — fixing the "Configure is below" anti-pattern the user flagged while matching the Site Settings "action on the right" convention.

- [ ] **Step 1: Replace the Packages row**

In `PageSettingsPopover.js`, find the current Packages row in the `view === 'client'` block — the `<div>` that renders a `Packages` label + `ToggleSwitch` in a `justify-between` row, a description, and a **Configure button on its own line below** (`onClick={() => setView('packages')}`), plus the paymentsReady hint. Replace that entire `<div>...</div>` with:

```jsx
          <div>
            <div className="flex items-center">
              <span className="text-xs font-medium flex-1" style={{ color: 'var(--text-secondary)' }}>Packages</span>
              {cf.purchase?.enabled && (
                <button
                  type="button"
                  onClick={() => setView('packages')}
                  className="flex items-center gap-0.5 text-xs mr-2"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  Configure
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
              <ToggleSwitch
                on={cf.purchase?.enabled || false}
                onChange={(v) => {
                  // Delivery depends on downloads; enabling Packages enables Downloads too (one atomic write).
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
            {cf.purchase?.enabled && !paymentsReady && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Connect a payout account in Site Settings → Print store to accept payments.</p>
            )}
          </div>
```

- [ ] **Step 2: Verify the components suite still passes**

Run: `npm test -- __tests__/components`
Expected: PASS (a JSX/parse error surfaces as a suite load failure).

- [ ] **Step 3: Manual smoke check (dev server on :3000)**

Open a gallery's Page Settings → Client Features. Confirm the Packages row shows the toggle on the right with a **"Configure ▸" inline to its left** when enabled (no button below); toggling Packages on still flips Downloads on.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/PageSettingsPopover.js
git commit -m "feat(packages): move Configure onto the Packages row (no more Configure-below)"
```

---

## Task 2: Packages drill-in — intro + labeled package cards

**Files:**
- Modify: `components/admin/platform/PageSettingsPopover.js` (the `view === 'packages'` block)

**Interfaces:**
- Uses existing in-scope helpers: `updateCf`, `siteConfig`, `addPackage`, `updatePackage`, `removePackage`, `dollarsToCents`, `centsToDollars`, `PopoverShell`, `setView`.

**Design note:** replace the cramped single-row package editor with an intro paragraph + one card per package, each field on its own labeled line, and the offer type chosen via a `<select>` dropdown.

- [ ] **Step 1: Replace the `view === 'packages'` block body**

In `PageSettingsPopover.js`, find `if (view === 'packages') { ... }`. Replace the inner `<div className="px-3 py-3 space-y-4">...</div>` (everything inside `PopoverShell`) with:

```jsx
        <div className="px-3 py-3 space-y-4">
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            Create one or more offers your clients can buy. Set how many photos they get free in <strong style={{ color: 'var(--text-secondary)' }}>Free downloads</strong> below; then add packages — a set number of extra photos, or the whole gallery.
          </p>

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

          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>Packages</div>
            {(purchase.packages || []).map((pkg) => {
              const isAll = pkg.credits === 'all'
              return (
                <div key={pkg.id} className="rounded-[10px] p-3 relative" style={{ border: '1px solid rgba(160,140,110,0.28)' }}>
                  <button
                    type="button" aria-label="Remove package"
                    className="absolute top-2 right-2 w-[22px] h-[22px] rounded-[5px] flex items-center justify-center"
                    style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,140,110,0.14)'; e.currentTarget.style.color = '#2c2416' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    onClick={() => updateCf('purchase', { packages: removePackage(purchase.packages, pkg.id) })}
                  >×</button>

                  <div className="mb-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: '#8b6f47' }}>Package name</div>
                    <input
                      type="text" placeholder="e.g. 10 more photos"
                      className="w-[calc(100%-26px)] border-b border-[rgba(160,140,110,0.3)] py-1 text-[13px] text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent"
                      value={pkg.label}
                      onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { label: e.target.value }) })}
                    />
                  </div>

                  <div className="mb-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: '#8b6f47' }}>What's the offer?</div>
                    <select
                      className="w-full text-xs text-[#2c2416] outline-none"
                      style={{ border: '1px solid rgba(160,140,110,0.28)', borderRadius: 8, background: '#fff', padding: '8px 10px' }}
                      value={isAll ? 'all' : 'number'}
                      onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { credits: e.target.value === 'all' ? 'all' : 10 }) })}
                    >
                      <option value="number">A set number of photos</option>
                      <option value="all">The entire gallery</option>
                    </select>
                  </div>

                  {!isAll && (
                    <div className="mb-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: '#8b6f47' }}>How many photos?</div>
                      <input
                        type="number" min="1" step="1"
                        className="w-16 border-b border-[rgba(160,140,110,0.3)] py-1 text-xs text-[#2c2416] outline-none focus:border-[#8b6f47] bg-transparent text-center"
                        value={pkg.credits}
                        onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { credits: Math.max(1, parseInt(e.target.value, 10) || 1) }) })}
                      />
                    </div>
                  )}

                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.07em] mb-1" style={{ color: '#8b6f47' }}>Price</div>
                    <div className="inline-flex items-baseline gap-1 border-b border-[rgba(160,140,110,0.3)] pb-1">
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{siteConfig?.printStore?.currency || 'USD'}</span>
                      <input
                        type="number" min="0" step="0.01" placeholder="0.00"
                        className="w-24 text-sm text-[#2c2416] outline-none bg-transparent"
                        value={centsToDollars(pkg.price)}
                        onChange={(e) => updateCf('purchase', { packages: updatePackage(purchase.packages, pkg.id, { price: dollarsToCents(e.target.value) }) })}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            <button
              type="button"
              className="w-full text-[11px] font-mono uppercase tracking-[0.07em] py-2 rounded-[8px]"
              style={{ color: '#8b6f47', background: 'none', border: '1px dashed rgba(160,140,110,0.4)', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#faf5ee' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              onClick={() => updateCf('purchase', { packages: addPackage(purchase.packages) })}
            >+ Add a package</button>
          </div>
        </div>
```

Confirm the `const purchase = cf.purchase || {}` line at the top of the `view === 'packages'` block is retained (the block uses `purchase.freeAllowance` and `purchase.packages`).

- [ ] **Step 2: Verify the components suite still passes**

Run: `npm test -- __tests__/components`
Expected: PASS.

- [ ] **Step 3: Manual smoke check (dev server on :3000)**

Open Page Settings → Client Features → Packages → Configure. Confirm: an intro paragraph at the top; a Free-downloads field; each package a card with **Package name**, **What's the offer?** dropdown, **How many photos?** (only when "a set number"), **Price** on its own line, and an **×** in the top-right; **+ Add a package** at the bottom. Switching the dropdown to "The entire gallery" hides the count; switching back restores it (credits default 10). Nothing wraps or overflows.

- [ ] **Step 4: Commit**

```bash
git add components/admin/platform/PageSettingsPopover.js
git commit -m "feat(packages): labeled package-card editor with offer-type dropdown + intro"
```

---

## Task 3: Drawer stacked-photo thumbnail

**Files:**
- Modify: `components/image-displays/engagement/ClientEngagementContext.js`, `components/image-displays/engagement/PackagesDrawer.js`, `pages/sites/[username]/[slug].js`, `pages/sites/[username]/index.js`
- Test: `__tests__/client-engagement/packagesDrawer.test.js`

**Interfaces:**
- Consumes: `pageDisplayThumbnail(page)` from `common/assetRefs.js`; `getSizedUrl` from `common/imageUtils`.
- Produces (on ctx): `packageThumb` (a photo URL or `''`). New provider prop: `heroPhoto`.

- [ ] **Step 1: Write the failing test**

Add a case to `__tests__/client-engagement/packagesDrawer.test.js`:

```js
it('renders a stacked-photo thumbnail per package when a photo is available', () => {
  useClientEngagement.mockReturnValue({
    identity: { email: 'mia@x.com' },
    purchaseCurrency: 'USD',
    packageThumb: 'https://cdn.example.com/photos/x.jpg',
    packages: [{ id: 'pkg_a', label: 'Add-on pack', credits: 10, price: 4000 }],
    buyPackage: jest.fn(),
  })
  render(<PackagesDrawer open onClose={() => {}} />)
  const imgs = document.querySelectorAll('[data-pkg-thumb]')
  expect(imgs.length).toBeGreaterThanOrEqual(1)
})
```

(Confirm the file already imports `useClientEngagement` via a `jest.mock` factory and `PackagesDrawer` — it does from the existing tests.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/client-engagement/packagesDrawer.test.js`
Expected: FAIL — no `[data-pkg-thumb]` elements.

- [ ] **Step 3: Expose `packageThumb` on the context**

In `components/image-displays/engagement/ClientEngagementContext.js`:

(a) Add `heroPhoto` to the provider signature (alongside `currency`, `heroPresent`):

```js
export function ClientEngagementProvider({ username, pageId, pageSlug, clientFeatures, paymentsReady, currency, heroPhoto, heroPresent, branding, children }) {
```

(b) In the `ctx` memo, expose it (next to `purchaseCurrency`):

```js
    packageThumb: heroPhoto || '',
```

(c) Add `heroPhoto` to the `ctx` `useMemo` dependency array (with `currency, heroPresent, performCheckout`).

- [ ] **Step 4: Render the stacked thumbnail in `PackagesDrawer`**

In `components/image-displays/engagement/PackagesDrawer.js`:

(a) Import `getSizedUrl` at the top:

```js
import { getSizedUrl } from '../../../common/imageUtils'
```

(b) Read `packageThumb` from ctx (extend the destructure):

```js
  const { packages, purchaseCurrency, packageThumb } = ctx
```

(c) Add a `StackThumb` helper component in the file (above the default export):

```js
function StackThumb({ src }) {
  if (!src) return null
  const bg = { backgroundImage: `url('${src}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return (
    <div data-pkg-thumb style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
      <i style={{ position: 'absolute', inset: 0, borderRadius: 6, boxShadow: '0 1px 3px rgba(20,14,8,.25)', transform: 'rotate(-7deg) translate(-3px,2px)', filter: 'brightness(.9)', ...bg }} />
      <i style={{ position: 'absolute', inset: 0, borderRadius: 6, boxShadow: '0 1px 3px rgba(20,14,8,.25)', transform: 'rotate(4deg) translate(3px,1px)', filter: 'brightness(.95)', ...bg }} />
      <i style={{ position: 'absolute', inset: 0, borderRadius: 6, boxShadow: '0 1px 3px rgba(20,14,8,.25)', border: '2px solid #fdf9f4', ...bg }} />
    </div>
  )
}
```

(d) In each package row (the `<button>` that maps over `packages`), add the thumbnail as the first child, before the label/grant block. The row's flex container already lays children in a row; insert:

```js
              <StackThumb src={packageThumb ? (getSizedUrl(packageThumb, 'thumbnail') || packageThumb) : ''} />
```

Ensure the row `<button>` uses `display:flex; align-items:center; gap:14px` (add `gap:14px` if not present) so the thumbnail sits left of the text; the price stays pushed right via the existing layout.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- __tests__/client-engagement/packagesDrawer.test.js`
Expected: PASS (existing cases + the new thumbnail case).

- [ ] **Step 6: Thread `heroPhoto` from the pages**

In `pages/sites/[username]/[slug].js`:
- Add the import (with the other `common/assetRefs` imports if present, else a new import): `import { pageDisplayThumbnail } from '../../../common/assetRefs'`
- Add `heroPhoto={pageDisplayThumbnail(page)}` to the `<ClientEngagementProvider>` props.

In `pages/sites/[username]/index.js`:
- Add `import { pageDisplayThumbnail } from '../../../common/assetRefs'` (if not already imported).
- Add `heroPhoto={pageDisplayThumbnail(homePage)}` to the `<ClientEngagementProvider>` props (the per-page provider around the gallery).

- [ ] **Step 7: Run the engagement suite + confirm pages compile**

Run: `npm test -- __tests__/client-engagement`
Expected: PASS.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/sites/swamiphoto/portfolio`
Expected: `200`.

- [ ] **Step 8: Commit**

```bash
git add components/image-displays/engagement/ClientEngagementContext.js components/image-displays/engagement/PackagesDrawer.js "pages/sites/[username]/[slug].js" "pages/sites/[username]/index.js" __tests__/client-engagement/packagesDrawer.test.js
git commit -m "feat(packages): stacked-photo thumbnail in the Packages drawer"
```

---

## Task 4: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire suite**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 2: Manual end-to-end (dev server on :3000, authenticated)**

1. Page Settings → Client Features: the Packages row has the toggle on the right with **Configure ▸** inline (not below); enabling flips Downloads on.
2. Configure → the drill-in shows the intro, Free downloads, and labeled package cards with the offer-type dropdown (count hides for "entire gallery"), price on its own line, clean × and + Add.
3. On a client gallery, open the **Packages** drawer → each package row shows the **stacked-photo thumbnail** on the left; Buy still works (identity-gated).

- [ ] **Step 3: Note any gaps** for the final review.

---

## Self-Review Notes (author)

- **Spec coverage (Parts 2-5):** Configure-on-right (T1), intro copy (T2), labeled package-card editor with offer dropdown (T2), drawer stacked thumbnail (T3), verification (T4). Part 1 (hero unification) is deferred to Plan 2.
- **Design decision:** Packages toggle stays on the right (consistent with sibling FeatureBlocks); Configure moves inline to the row (fixing "Configure below"). This honors "action on the right, not below" without flipping only one row's toggle.
- **Type consistency:** `packageThumb` (ctx) is produced in T3's provider change and consumed in T3's drawer; `heroPhoto` provider prop is passed by both pages in T3. Package shape `{ id, label, credits, price }` unchanged; the dropdown maps to `credits: 'all' | number`.
- **Untouched:** enforcement (402), entitlement accounting, checkout route core, webhook, and the hero components.
