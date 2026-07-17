// common/themes/base.js
// The canonical, theme-agnostic block/variant registry. Themes inherit this
// wholesale and diverge only via `overrides` + `tokens`. Variant ids are stable
// and semantic — shared across every theme. Pure data: safe to import anywhere.

import { CAPTION_STYLE_OPTIONS, DEFAULT_CAPTION_STYLE } from '../captionStyles'

export const FONT_SLOTS = [
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'fraunces', label: 'Fraunces' },
  { id: 'sans', label: 'Sans' },
  { id: 'mono', label: 'Mono' },
]

export const baseBlocks = {
  photo: {
    defaultVariant: 'full-bleed',
    variants: [
      { id: 'full-bleed', label: 'Full bleed' },
      { id: 'centered', label: 'Centered' },
    ],
    captionStyles: CAPTION_STYLE_OPTIONS,
    defaultCaptionStyle: DEFAULT_CAPTION_STYLE,
  },
  photos: {
    defaultVariant: 'stacked',
    variants: [
      { id: 'stacked', label: 'Stacked' },
      { id: 'masonry', label: 'Masonry' },
      { id: 'grid', label: 'Grid' },
      { id: 'square', label: 'Square' },
    ],
    captionStyles: CAPTION_STYLE_OPTIONS,
    defaultCaptionStyle: DEFAULT_CAPTION_STYLE,
  },
  text: {
    defaultVariant: 'heading',
    variants: [
      { id: 'heading', label: 'L' },
      { id: 'subheading', label: 'M' },
      { id: 'body', label: 'S' },
      { id: 'quote', label: 'Quote' },
    ],
    defaultAlign: 'center',
    aligns: ['left', 'center'],
    defaultFont: 'serif',
    fonts: [...FONT_SLOTS],
  },
  video: {
    defaultVariant: 'centered',
    variants: [
      { id: 'full-bleed', label: 'Full bleed' },
      { id: 'centered', label: 'Centered' },
      { id: 'side-by-side', label: 'Side' },
    ],
  },
  testimonial: {
    defaultVariant: 'photo-above',
    variants: [
      { id: 'photo-above', label: 'Photo above' },
      { id: 'quote-above', label: 'Quote above' },
    ],
  },
  contact: {
    defaultVariant: 'standard',
    variants: [{ id: 'standard', label: 'Standard' }],
    defaultAlign: 'left',
    aligns: ['left', 'center'],
    defaultButtonStyle: 'solid',
    buttonStyles: [
      { id: 'solid', label: 'Solid' },
      { id: 'outline', label: 'Outline' },
    ],
  },
  'page-gallery': {
    defaultVariant: 'list',
    variants: [{ id: 'list', label: 'List' }],
  },
}

// Page cover is not a gallery block — consumed by PageDesignPopover + assetRefs.
export const baseCover = {
  defaultHeight: 'partial',
  heights: [
    { id: 'full', label: 'Full' },
    { id: 'partial', label: 'Partial' },
  ],
  defaultButtonStyle: 'solid',
  buttonStyles: [
    { id: 'solid', label: 'Solid' },
    { id: 'outline', label: 'Outline' },
  ],
}

// Apply a theme override to a base block spec. Never mutates the base.
export function mergeBlockSpec(baseSpec, override) {
  if (!baseSpec) return null
  const labels = (override || {}).labels || {}
  const hide = new Set((override || {}).hide || [])
  let variants = (baseSpec.variants || [])
    .filter((v) => !hide.has(v.id))
    .map((v) => (labels[v.id] ? { ...v, label: labels[v.id] } : { ...v }))
  if (override && override.add) variants = [...variants, ...override.add]
  return {
    ...baseSpec,
    variants,
    ...(override && override.defaultVariant ? { defaultVariant: override.defaultVariant } : {}),
    ...(override && override.defaultAlign ? { defaultAlign: override.defaultAlign } : {}),
    ...(override && override.defaultFont ? { defaultFont: override.defaultFont } : {}),
    ...(override && override.defaultButtonStyle ? { defaultButtonStyle: override.defaultButtonStyle } : {}),
  }
}
