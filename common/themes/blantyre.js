// common/themes/blantyre.js
// Blantyre — the surf-journal theme: a soft sage ground, typewriter mono body
// copy, and an elegant inscriptional serif (Marcellus) for the wordmark and
// headings. Photos hang in thin sage keyline frames with small mono captions
// beneath — the whole page reads like a field notebook from a coastal road
// trip. A quiet top header (serif logo left, mono links right) replaces the
// cover-embedded nav; galleries default to the staggered two-column Offset
// layout (BlantyreOffsetGallery) with generous air between rows.
const BLANTYRE_FONTS = [
  { id: 'mono', label: 'Mono' },
  { id: 'display', label: 'Display' },
  { id: 'serif', label: 'Editorial' },
]

export const blantyre = {
  id: 'blantyre',
  name: 'Blantyre',
  navStyle: 'top-header',
  tokens: {
    '--theme-bg': '#dadbd1',         // soft sage paper
    '--theme-text': '#23251e',       // near-black olive ink
    '--theme-text-muted': '#70756a', // olive-gray captions
    '--theme-accent': '#5c6152',     // deep olive
    '--blantyre-frame': '#b1b6a2',     // keyline frame around every photo
    fonts: {
      serif: '"Cormorant Garamond", Georgia, serif',
      display: '"Marcellus", Georgia, serif',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"Roboto Mono", "Geist Mono", ui-monospace, monospace',
    },
  },
  overrides: {
    // Single photo: centered by default, framed by the theme CSS, mono caption.
    photo: { defaultVariant: 'centered', defaultCaptionStyle: 'mono' },
    // Photo sets lead with the staggered two-column Offset scatter (the Blantyre
    // signature); the base layouts all stay on the menu.
    photos: {
      add: [{ id: 'offset', label: 'Offset' }],
      defaultVariant: 'offset',
      sizeVariants: ['offset', 'stacked', 'masonry', 'grid', 'square'],
      defaultCaptionStyle: 'mono',
    },
    video: { defaultCaptionStyle: 'mono' },
    // Body copy is the typewriter voice; Display (Marcellus) carries headings.
    text: { defaultAlign: 'left', aligns: ['left', 'center'], defaultFont: 'mono', fonts: BLANTYRE_FONTS },
    testimonial: { defaultFont: 'mono', fonts: BLANTYRE_FONTS, defaultQuoteStyle: 'regular' },
    contact: { defaultAlign: 'left', aligns: ['left', 'center'] },
  },
}
