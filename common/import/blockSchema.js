import { defaultBlock } from '@/common/blocks'

// Types a structural mapper may emit. Each must be a real block in defaultBlock.
export const EMITTABLE_TYPES = ['photo', 'photos', 'text', 'testimonial', 'video', 'page-gallery']

// Flat, theme-independent variant values a mapper may set (resolved by
// common/themes/variants.js LEGACY). Anything else is coerced to undefined so
// the theme's default wins.
const VALID_VARIANTS = {
  photo: new Set([1, 2, 3]),      // full-bleed / centered / side-by-side
  text: new Set([1, 2, 3, 4]),    // heading / subheading / body / quote
  testimonial: new Set([1, 2]),   // photo-above / quote-above
}

export function isEmittableType(type) {
  return EMITTABLE_TYPES.includes(type)
}

function isEmpty(b) {
  if (b.type === 'photo') return !b.imageUrl
  if (b.type === 'photos') return !(b.imageUrls && b.imageUrls.length)
  if (b.type === 'text') return !String(b.content || '').trim()
  if (b.type === 'testimonial') return !String(b.text || '').trim()
  if (b.type === 'video') return !b.url
  if (b.type === 'page-gallery') return !(b.pageIds && b.pageIds.length)
  return true
}

export function validateBlocks(blocks) {
  const out = []
  for (const b of blocks || []) {
    if (!b || !isEmittableType(b.type)) continue
    const block = { ...b }
    const valid = VALID_VARIANTS[block.type]
    if ('variant' in block && valid && !valid.has(block.variant)) delete block.variant
    if (isEmpty(block)) continue
    out.push(block)
  }
  return out
}
