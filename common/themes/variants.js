import { getBlockSpec, getTheme } from './index'

// Legacy → theme-local variant id mapping, used only when a block has no
// themeState entry (older configs). Keyed by block type.
const LEGACY = {
  photo: (b) => (b.layout === 'Centered' || b.variant === 2 ? 'centered' : 'full-bleed'),
  // Only map an *explicit* legacy layout. With no layout hint, return null so the
  // theme's own default wins (kyoto→stacked, manhattan/provence→grid). Returning
  // 'stacked' unconditionally used to shadow those non-stacked theme defaults.
  photos: (b) => (b.layout === 'masonry' ? 'masonry' : b.layout === 'stacked' ? 'stacked' : null),
  text: (b) => ({ 1: 'heading', 2: 'subheading', 3: 'body', 4: 'quote' }[b.variant || 1] || 'heading'),
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
