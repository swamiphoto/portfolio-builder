// Maps our print spec -> a Prodigi order line { sku, copies, sizing, attributes }.
//
// Reconciled against the live Prodigi catalog on 2026-07-06 (attribute schemas
// fetched from api.prodigi.com/v4.0/products). Prodigi encodes the medium in the
// SKU and exposes only the multi-value choices as attributes:
//   GLOBAL-FAP  Enhanced Matte Art paper (EMA 200gsm)      — no attributes
//   GLOBAL-PAP  Photographic Art print   (LPP 240gsm)      — no attributes
//   GLOBAL-MET  ChromaLuxe aluminium metal print           — attr `finish`
//   GLOBAL-CFP  Classic frame, fine-art (EMA), no mount    — attr `color`
//   GLOBAL-CFPM Classic frame, fine-art (EMA), mounted mat — attr `color`
// Framed products are always fine-art (EMA) paper, so `finish` is not applicable
// when framed. Unmapped combinations throw so a wrong product is never silently
// ordered — the order lands in `fulfillment_failed`.

const SIZES = new Set(['8x10', '11x14', '16x20', '16x24', '24x36'])

// Unframed: our finish -> Prodigi base SKU.
const UNFRAMED_SKU = {
  matte: 'GLOBAL-FAP',
  lustre: 'GLOBAL-PAP',
  metal: 'GLOBAL-MET',
}

// Our frame colour -> Prodigi classic-frame `color` attribute value.
const FRAME_COLOR = {
  black: 'black',
  white: 'white',
  natural: 'natural',
  walnut: 'brown',
  silver: 'silver',
}

// Prodigi metal `finish` when we don't collect one from the buyer.
const DEFAULT_METAL_FINISH = 'satin'

// Prodigi SKUs are case-insensitive; upper-case the size for clarity ('16x20' -> '16X20').
const frag = (size) => size.toUpperCase()

export function mapSpecToProdigi(spec) {
  const { size, finish, frame, frameColor, matte } = spec || {}
  if (!SIZES.has(size)) throw new Error(`unmapped prodigi spec: size=${size}`)

  // Framed — classic frame, fine-art paper, colour required; mounted mat when `matte`.
  if (frame === 'wood' || frame === 'metal') {
    const color = FRAME_COLOR[frameColor]
    if (!color) throw new Error(`unmapped prodigi spec: frameColor=${frameColor}`)
    const sku = `${matte ? 'GLOBAL-CFPM' : 'GLOBAL-CFP'}-${frag(size)}`
    return { sku, copies: 1, sizing: 'fillPrintArea', attributes: { color } }
  }

  // Unframed — paper/metal SKU by finish.
  if (frame === 'none' || frame == null) {
    const base = UNFRAMED_SKU[finish]
    if (!base) throw new Error(`unmapped prodigi spec: finish=${finish}`)
    const attributes = base === 'GLOBAL-MET' ? { finish: DEFAULT_METAL_FINISH } : {}
    return { sku: `${base}-${frag(size)}`, copies: 1, sizing: 'fillPrintArea', attributes }
  }

  throw new Error(`unmapped prodigi spec: frame=${frame}`)
}
