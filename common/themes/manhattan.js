// common/themes/manhattan.js
// Manhattan — fixed left rail + gallery-wall grid. Inherits the base menu and
// expresses its personality purely through label/default overrides + tokens.
// Curated font choices for Manhattan text/testimonial blocks: Sans (default),
// Serif, Editorial — no Display. Ids map to tokens.fonts below.
const MANHATTAN_FONTS = [
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'fraunces', label: 'Editorial' },
]

export const manhattan = {
  id: 'manhattan',
  // Display name only. The internal id/component/CSS names stay 'manhattan' so no
  // saved siteConfig (design.theme / block.themeState.manhattan) has to migrate —
  // users only ever see `name`. A full internal rename can follow if desired.
  name: 'Copenhagen',
  navStyle: 'left-rail',
  tokens: {
    '--theme-bg': '#fafafa',
    '--theme-text': '#141414',
    '--theme-text-muted': '#6b6b6b',
    '--theme-accent': '#b5502e',
    '--theme-rail-width': '260px',
    fonts: {
      serif: '"Cormorant Garamond", Georgia, serif',
      display: 'Muse',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"Geist Mono", monospace',
    },
  },
  overrides: {
    // Single photo has no layout choice in Manhattan: collapse all base variants
    // into one no-option "single" variant. Rendering ignores the id (see Gallery
    // photo case) and always draws the left-anchored ManhattanPhoto.
    photo: { hide: ['full-bleed', 'centered', 'side-by-side'], add: [{ id: 'single', label: 'Photo' }], defaultVariant: 'single' },
    photos: { defaultVariant: 'grid' },
    // Video gets the same treatment as photos: one full-width rendering, no
    // layout options (collapse to a single 'centered' variant, rendered bleed).
    video: { hide: ['full-bleed', 'side-by-side'], defaultVariant: 'centered' },
    // Text/testimonial default to the theme sans; Serif + Editorial are offered
    // as alternatives (no Display). The render respects block.font (resolveFont).
    text: { defaultAlign: 'left', aligns: ['left'], defaultFont: 'sans', fonts: MANHATTAN_FONTS },
    contact: { defaultAlign: 'left', aligns: ['left'] },
    // No photo-above/quote-above layout choice; a fixed quote → photo → name
    // stack. The editor offers an italic/regular quote-style toggle + a font.
    testimonial: { hide: ['quote-above'], defaultVariant: 'photo-above', defaultFont: 'sans', fonts: MANHATTAN_FONTS },
  },
}
