import { getBlockSpec, getTheme } from './index'

// Legacy → theme-local variant id mapping, used only when a block has no
// themeState entry (older configs). Keyed by block type.
const LEGACY = {
  // Only map an *explicit* legacy layout/variant. With no hint, return null so the
  // theme's own default wins (kyoto→centered, provence→full-bleed). Mapping hint-less
  // photos to 'full-bleed' shadowed non-full-bleed theme defaults.
  photo: (b) =>
    b.layout === 'Centered' || b.variant === 2
      ? 'centered'
      : b.layout || b.variant
        ? 'full-bleed'
        : null,
  // Only map an *explicit* legacy layout. With no layout hint, return null so the
  // theme's own default wins (kyoto→stacked, manhattan/provence→grid). Returning
  // 'stacked' unconditionally used to shadow those non-stacked theme defaults.
  photos: (b) => (b.layout === 'masonry' ? 'masonry' : b.layout === 'stacked' ? 'stacked' : null),
  // Map an explicit legacy variant; with none, return null so the theme default
  // wins (kyoto → subheading / medium).
  text: (b) => (b.variant ? ({ 1: 'heading', 2: 'subheading', 3: 'body', 4: 'quote' }[b.variant] || 'heading') : null),
  video: (b) => (b.layout === 'Centered' ? 'centered' : { 1: 'full-bleed', 2: 'centered', 3: 'side-by-side' }[b.variant] || 'centered'),
  testimonial: (b) => (b.variant === 2 ? 'quote-above' : 'photo-above'),
}

// Old theme-local ids (Manhattan) → shared base ids, for saved themeState values.
const ALIASES = {
  photo: { 'full-width': 'full-bleed', framed: 'centered' },
  video: { 'full-width': 'full-bleed', framed: 'centered' },
  'page-gallery': { grid: 'mosaic', alternating: 'list' },
}

export function resolveVariant(block, themeId) {
  const spec = getBlockSpec(themeId, block.type)
  if (!spec) return undefined
  const validIds = spec.variants.map((v) => v.id)

  const saved = block.themeState?.[themeId]?.variant
  if (saved && validIds.includes(saved)) return saved

  const aliased = saved && ALIASES[block.type]?.[saved]
  if (aliased && validIds.includes(aliased)) return aliased

  // Legacy fallback: map old fields into a theme-local id, but only accept it
  // if it's valid for this theme (cross-theme legacy values fall through).
  const legacy = LEGACY[block.type]?.(block)
  if (legacy && validIds.includes(legacy)) return legacy

  return spec.defaultVariant
}

export function setVariant(block, themeId, variantId) {
  return {
    ...block,
    themeState: {
      ...(block.themeState || {}),
      [themeId]: { ...(block.themeState?.[themeId] || {}), variant: variantId },
    },
  }
}

// A stored value carried over from another theme is honored only if it's a valid
// option for THIS theme; otherwise it resets to this theme's default. (e.g. an
// align/font/style the current theme doesn't offer falls back, not persists.)
export function resolveAlign(block, themeId) {
  const spec = getBlockSpec(themeId, block.type)
  const valid = spec?.aligns
  if (block.align && (!valid || valid.includes(block.align))) return block.align
  return spec?.defaultAlign || 'center'
}

export function resolveFont(block, themeId) {
  const fonts = getTheme(themeId).tokens?.fonts || {}
  const spec = getBlockSpec(themeId, block.type)
  const validIds = (spec?.fonts || []).map((f) => f.id)
  const slot = (block.font && (!validIds.length || validIds.includes(block.font)))
    ? block.font
    : (spec?.defaultFont || 'serif')
  return fonts[slot] || fonts.serif || '"Cormorant Garamond", Georgia, serif'
}

// Resolve a bare font-slot id (e.g. 'serif' | 'display' | 'fraunces' | 'sans')
// to a CSS font-family for the given theme. Used outside the block system, e.g.
// the cover page's title/description font toggles.
export function fontFamilyForSlot(themeId, slot) {
  const fonts = getTheme(themeId).tokens?.fonts || {}
  return fonts[slot] || fonts.serif || '"Cormorant Garamond", Georgia, serif'
}

// Florence-only vertical Position of a block's content within its full-height
// column: top | center | bottom (→ flex justify-content). Default top.
const FLORENCE_ANCHORS = ['top', 'center', 'bottom']
export function resolveFlorenceAnchor(block) {
  return FLORENCE_ANCHORS.includes(block?.florenceAnchor) ? block.florenceAnchor : 'top'
}

// Amsterdam-only text Style: a text block renders as a full-height solid-ink
// Panel (default) or a Quiet cream museum-label column. Stored flat on the
// block (like florenceAnchor); ignored by every other theme.
export function resolveAmsterdamStyle(block) {
  // Quiet is the default; Panel is opt-in (a solid statement block).
  return block?.amsterdamStyle === 'panel' ? 'panel' : 'quiet'
}

// Amsterdam-only photo Frame: how a photo (or each photo in a set) is mounted.
// 'none' = the clean matted hang with a plaque beside; 'card'/'mount'/'print' =
// vintage mounts with the caption printed on the mount; 'mixed' rotates those
// three across a set for a scrapbook feel. Stored flat on the block.
export const AMSTERDAM_FRAMES = ['none', 'card', 'mount', 'print', 'mixed']
export function resolveAmsterdamFrame(block) {
  return AMSTERDAM_FRAMES.includes(block?.amsterdamFrame) ? block.amsterdamFrame : 'none'
}

// Florence-only per-photo frame: 'none' = clean hang; 'mat' = wide gallery
// passe-partout with a hairline; 'line' = a thin keyline frame; 'mixed' alternates.
// Distinct from Amsterdam's vintage mounts — quieter, museum-wall framing.
export const FLORENCE_FRAMES = ['none', 'mat', 'line', 'mixed']
export function resolveFlorenceFrame(block) {
  return FLORENCE_FRAMES.includes(block?.florenceFrame) ? block.florenceFrame : 'none'
}

// Amsterdam-only per-block ground color. 'auto' defers to the wall's rotation;
// light/dark/ink pin the block (and the rail, as it passes under it) to a color.
const AMSTERDAM_GROUND_IDS = ['auto', 'light', 'dark', 'ink']
export function resolveAmsterdamGround(block) {
  return AMSTERDAM_GROUND_IDS.includes(block?.amsterdamGround) ? block.amsterdamGround : 'auto'
}

// Walk a page's blocks and return, per block, both its effective `ground` (a pin,
// or the next color in the black→light→red rotation) and the `def` the rotation
// would give it if it were left on auto. The wall renders `ground`; the editor
// uses `def` to show which swatch is a block's default. Pinned blocks don't
// consume a rotation slot, so the auto blocks around them keep alternating.
export function amsterdamGroundPlan(blocks, { heroOpener = false } = {}) {
  const ORDER = ['dark', 'light', 'ink']
  const start = (ORDER.indexOf(heroOpener ? 'dark' : 'ink') + 1) % ORDER.length
  let step = 0
  return (blocks || []).map((block) => {
    const pinned = resolveAmsterdamGround(block)
    const def = ORDER[(start + step) % ORDER.length]
    if (pinned === 'auto') { step += 1; return { ground: def, def } }
    return { ground: pinned, def }
  })
}

// Testimonial quote style (italic | regular). The block's choice wins; otherwise
// the theme's default (from the block spec's defaultQuoteStyle), else italic.
export function resolveQuoteStyle(block, themeId) {
  if (block?.quoteStyle === 'regular' || block?.quoteStyle === 'italic') return block.quoteStyle
  const def = getBlockSpec(themeId, 'testimonial')?.defaultQuoteStyle
  return def === 'regular' ? 'regular' : 'italic'
}

export function resolveButtonStyle(block, themeId) {
  const spec = getBlockSpec(themeId, block.type)
  const valid = (spec?.buttonStyles || []).map((b) => b.id)
  if (block.buttonStyle && valid.includes(block.buttonStyle)) return block.buttonStyle
  return spec?.defaultButtonStyle || 'solid'
}

export function resolveSize(block, themeId) {
  const spec = getBlockSpec(themeId, block.type)
  const valid = (spec?.sizes || []).map((s) => s.id)
  if (block.size && valid.includes(block.size)) return block.size
  return spec?.defaultSize || 'medium'
}

// Photo/photos size default depends on the active layout so existing galleries
// keep their density: square + grid default to medium, everything else (stacked,
// masonry, single centered photo) defaults to large. An explicit block.size wins.
export function resolvePhotoSizeDefault(variantId) {
  return variantId === 'square' || variantId === 'grid' ? 'medium' : 'large'
}

export function resolvePhotoSize(block, themeId) {
  if (block.size) return block.size
  return resolvePhotoSizeDefault(resolveVariant(block, themeId))
}
