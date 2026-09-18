# Photographer-chosen shipping: Budget/Standard + Free shipping

**Date:** 2026-09-16
**Status:** Draft for review

## Problem

Prints are fulfilled by Prodigi. Two gaps in the print store today:

1. **Shipping is hardcoded to Prodigi "Standard"** (`common/fulfillment/prodigi.js:49` quote, `:72` place order), which runs ~$25 to the US. Prodigi's **Budget** tier is far cheaper (~$5–8) but slower and may not be tracked. The photographer has no choice.
2. **Shipping shows as a separate ~$25 line** at checkout (`components/image-displays/print/CheckoutStep.js`), which reads as a lot. Prodigi's own guidance: bundle shipping into the item price and advertise **"Free shipping"** (9/10 buyers cite free shipping as their #1 incentive). The photographer can't do this today.

Give the **photographer** the choice, in the Print store settings, with the tradeoffs explained.

## Goals

- Photographer picks **Standard vs Budget** shipping; the choice flows to both the buyer quote and the actual Prodigi order (kept in sync). Budget unavailable for a product/destination → graceful fall back to Standard.
- Photographer can turn on **Free shipping**, funded by a **flat per-print shipping buffer** they set (model A). Checkout hides the shipping line and shows "Free shipping"; the buffer is added to the item price everywhere (consistent product-page → checkout).
- Explain the tradeoffs in the settings UI: Budget = cheaper/slower/maybe untracked; Free shipping = attractive but **international shipping varies** and may exceed the buffer.
- Optional **charm pricing**: round retail up to end in **9** ($39) instead of the current nearest-$5, opt-in so existing stores don't shift silently.

## Non-goals (this pass)

- Per-destination / zone-specific shipping buffers (v1 buffer is flat; international overage is the photographer's, surfaced as a warning).
- Restricting which countries can order.
- Carrier-level tracking/"Delivered" status (separate from this work).
- Choosing the *cheapest available* method automatically (we honor the explicit toggle + Standard fallback).

## Config additions (`printStore`, in `common/siteConfig.js`)

| field | type | default | meaning |
|---|---|---|---|
| `shippingMethod` | `'standard'` \| `'budget'` | `'standard'` | Prodigi shipping tier |
| `freeShipping` | boolean | `false` | hide shipping line, bundle into price |
| `shippingBuffer` | number (cents, store currency) | `800` ($8) | added to each retail price when `freeShipping` is on |
| `priceRounding` | `'nearest5'` \| `'charm9'` | `'nearest5'` | retail rounding mode |

All defaults preserve today's behavior (Standard, no free shipping, nearest-$5).

## Pricing model (the accounting)

Today (`common/print/orderPricing.js` `buildAmounts`), for a sale:
- `total = retail + shippingCost` (buyer pays)
- `applicationFee = printCost + shippingCost + platformFee` (Sepia collects; pays Prodigi print+ship, keeps commission)
- `profit = retail − printCost − platformFee` (photographer keeps `total − applicationFee`)

**Free-shipping mode** (`freeShipping` on): the buyer sees no shipping line, but Prodigi still bills the *actual* shipping. So:
- `retailWithBuffer = retail + shippingBuffer`
- `total = retailWithBuffer` (buyer-facing `shippingCost = 0`)
- `applicationFee = printCost + actualShippingCost + platformFee` (actual Prodigi shipping still owed)
- `profit = total − applicationFee = (retail + buffer) − printCost − actualShippingCost − platformFee`
- `platformFee` stays computed on **retail** (not the buffer) — Sepia commissions the photographer's price, not their shipping cover.

Net vs today: photographer profit changes by `buffer − actualShippingCost`. Domestic (buffer ≥ actual) → they come out ahead; international (buffer < actual) → they absorb the gap.

**Safety guard:** the existing `applicationFee = min(applicationFee, total)` clamp (`orderPricing.js:7`) stays, so the Stripe charge is always valid. When `printCost + actualShipping + platformFee > retail + buffer` (cheap print + expensive international shipping), profit floors at 0 and the shortfall is surfaced — this is the case the UI warns about. Document it; do not silently swallow it.

## Rounding (`common/print/pricing.js`)

`computeRetail(labCost, markup, { rounding })`:
- `'nearest5'` (default) — current `ceil(n/5)*5`.
- `'charm9'` — round **up to the next whole dollar ending in 9**: `ceil((n+1)/10)*10 − 1` (e.g. 34→39, 39→39, 40→49). Applied to the retail-from-cost only; buffer is added after rounding.

## Components & changes

1. **`common/siteConfig.js`** — defaults + normalization for the 4 new fields (clamp `shippingMethod`/`priceRounding` to allowed values; `shippingBuffer ≥ 0`).
2. **`common/print/pricing.js`** — `computeRetail(cost, markup, { rounding })`; `roundCharm9`. Backward compatible (default `nearest5`).
3. **`common/fulfillment/prodigi.js`** — `getQuote(spec, address, method)` and `placeOrder(..., method)` use the passed method; on a Budget quote error, retry once with `'Standard'` and mark the result so callers/UX can note the fallback. Keep quote and place-order methods identical for a given order.
4. **`common/print/quoteOrder.js`** — read `shippingMethod`, `freeShipping`, `shippingBuffer`, `priceRounding` from the store config; pass method to the adapter; compute retail with rounding; hand `freeShipping`/`buffer`/`actualShippingCost` to `buildAmounts`.
5. **`common/print/orderPricing.js`** — `buildAmounts` gains the free-shipping branch above (buffer folded into `retail`/`total`, buyer `shippingCost = 0`, `applicationFee` includes actual shipping, guard retained). Return a `shippingFree` flag + `actualShippingCost` for display/records.
6. **`components/image-displays/print/CheckoutStep.js`** — when `shippingFree`, replace the "Shipping $X" line with "Shipping — **Free**" and show the bundled total. Otherwise unchanged.
7. **Product "from" price** (wherever the sell price is shown pre-checkout) — include the buffer when `freeShipping` so the price is consistent with checkout.
8. **`components/admin/platform/SiteSettingsPopover.js`** (Pricing section) — three controls with copy:
   - **Shipping speed** pill/toggle: Standard (*tracked, faster, ~$25 US*) vs Budget (*cheaper ~$5–8, slower, may not be tracked*).
   - **Free shipping** toggle → when on, reveal the **Shipping buffer** field (`+$_ per print`) with guidance ("covers domestic shipping; international may cost more and comes out of your margin") and update the live example line to fold the buffer in and drop the shipping line.
   - **Price rounding** toggle: Round to $5 (default) vs End in $9.

## Testing

- **`pricing.test.js`** — `computeRetail` for both rounding modes incl. edge values (34→39, 39→39, 40→49, exact multiples).
- **`orderPricing.test.js`** — free-shipping `buildAmounts`: buffer folded into total, buyer shippingCost 0, `applicationFee` includes actual shipping, `profit = retail+buffer−printCost−actualShip−fee`, guard clamps on the international-overage case (profit floors at 0, applicationFee ≤ total).
- **`quoteOrder.test.js`** — method passed to adapter; free-shipping vs standard amounts; rounding mode honored.
- **`prodigiAdapter.test.js`** — method passthrough in quote + place-order bodies; Budget-quote-error → Standard fallback (flagged).
- **`CheckoutStep` test** — renders "Free" (no $ shipping line) when `shippingFree`, normal shipping line otherwise.
- **`siteConfig` test** — new field defaults + normalization/clamping.

## Rollout / safety

- All defaults = today's behavior; existing stores unchanged until the photographer opts in.
- The Budget→Standard fallback means a Budget selection never produces a quote/charge mismatch.
- International free-shipping overage is a documented, UI-warned tradeoff, not a silent loss.
