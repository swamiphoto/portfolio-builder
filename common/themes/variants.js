import { getBlockSpec } from './index'

// Legacy → theme-local variant id mapping, used only when a block has no
// themeState entry (older configs). Keyed by block type.
const LEGACY = {
  photo: (b) => (b.layout === 'Centered' || b.variant === 2 ? 'centered' : 'full-bleed'),
  photos: (b) => (b.layout === 'masonry' ? 'masonry' : 'stacked'),
  text: (b) => ({ 1: 'heading', 2: 'subheading', 3: 'body', 4: 'quote' }[b.variant || 1] || 'heading'),
  video: (b) => (b.layout === 'Centered' ? 'centered' : { 1: 'full-bleed', 2: 'centered', 3: 'side-by-side' }[b.variant || 1] || 'full-bleed'),
  testimonial: (b) => (b.variant === 2 ? 'quote-above' : 'photo-above'),
}

export function resolveVariant(block, themeId) {
  const spec = getBlockSpec(themeId, block.type)
  if (!spec) return undefined
  const validIds = spec.variants.map((v) => v.id)

  const saved = block.themeState?.[themeId]?.variant
  if (saved && validIds.includes(saved)) return saved

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

export function resolveAlign(block, themeId) {
  if (block.align) return block.align
  const spec = getBlockSpec(themeId, block.type)
  return spec?.defaultAlign || 'center'
}
