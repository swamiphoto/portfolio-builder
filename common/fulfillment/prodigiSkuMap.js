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
