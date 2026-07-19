// common/themes/base.js
// The canonical, theme-agnostic block/variant registry. Themes inherit this
// wholesale and diverge only via `overrides` + `tokens`. Variant ids are stable
// and semantic — shared across every theme. Pure data: safe to import anywhere.

import { CAPTION_STYLE_OPTIONS, DEFAULT_CAPTION_STYLE } from '../captionStyles'

// The text-block font menu. Labels are style categories (not font names). The
// ids still map to theme.tokens.fonts, which retains sans/mono families for any
// block that already stored them, even though they're no longer offered here.
export const FONT_SLOTS = [
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'fraunces', label: 'Editorial' },
]

// Shared size scale for photo/photos blocks. Semantics are per-layout (columns
// for masonry/square, image width for stacked/centered, tile scale for grid),
// but the ids and labels are common. See resolvePhotoSize in themes/variants.js
// for the layout-aware default (square/grid → medium, everything else → large).
export const SIZE_OPTIONS = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
]

export const baseBlocks = {
  photo: {
    defaultVariant: 'full-bleed',
    variants: [
      { id: 'full-bleed', label: 'Full bleed' },
      { id: 'centered', label: 'Centered' },
      { id: 'side-by-side', label: 'Side' },
    ],
    sizes: SIZE_OPTIONS,
    defaultSize: 'large',
    // Full bleed spans the viewport and Side has fixed proportions, so size only
    // applies to the centered layout.
    sizeVariants: ['centered'],
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
    sizes: SIZE_OPTIONS,
    defaultSize: 'large',
    sizeVariants: ['stacked', 'masonry', 'grid', 'square'],
    captionStyles: CAPTION_STYLE_OPTIONS,
    defaultCaptionStyle: DEFAULT_CAPTION_STYLE,
  },
  text: {
    defaultVariant: 'heading',
    variants: [
      { id: 'heading', label: 'L' },
      { id: 'subheading', label: 'M' },
      { id: 'body', label: 'S' },
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
    captionStyles: CAPTION_STYLE_OPTIONS,
    defaultCaptionStyle: DEFAULT_CAPTION_STYLE,
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
    variants: [
      { id: 'list', label: 'List' },
      { id: 'mosaic', label: 'Mosaic' },
    ],
    sizes: [
      { id: 'small', label: 'Small' },
      { id: 'medium', label: 'Medium' },
      { id: 'large', label: 'Large' },
    ],
    defaultSize: 'medium',
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
