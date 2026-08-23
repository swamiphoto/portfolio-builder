// common/themes/kyoto.js
// Kyoto — the reference theme: warm, serif, single-column editorial scroll.
// Inherits the full base variant menu; supplies only palette + fonts.

// Kyoto speaks in two type voices, no more: the Cormorant serif (its editorial
// default) and the Muse display face (the poster/title font). Fraunces —
// base's "Editorial" option — is deliberately absent here: it isn't part of
// Kyoto's palette, so offering it just added a look-alike that never fit.
const KYOTO_FONTS = [
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
]

export const kyoto = {
  id: 'kyoto',
  name: 'Kyoto',
  navStyle: 'cover-embedded',
  tokens: {
    '--theme-bg': '#ffffff',
    '--theme-text': '#2c2416',
    '--theme-text-muted': '#7a6b55',
    fonts: {
      serif: '"Cormorant Garamond", Georgia, serif',
      display: 'Muse',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"Geist Mono", monospace',
    },
  },
  overrides: {
    // Kyoto: a single photo defaults to the Centered layout, and captions default
    // to Serif (Cormorant italic) — the warm editorial voice.
    photo: { defaultVariant: 'centered', defaultCaptionStyle: 'serif' },
    photos: { defaultCaptionStyle: 'serif' },
    video: { defaultCaptionStyle: 'serif' },
    // Text blocks default to Medium (subheading), Serif/Display the only choices.
    text: { defaultVariant: 'subheading', fonts: KYOTO_FONTS },
    // Testimonials default to Serif (Cormorant), Regular (not italic), Medium
    // size, and Photo-above — same two-voice menu as text.
    testimonial: { defaultVariant: 'photo-above', defaultSize: 'medium', defaultFont: 'serif', defaultQuoteStyle: 'regular', fonts: KYOTO_FONTS },
  },
}
