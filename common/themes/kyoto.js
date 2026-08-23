// common/themes/kyoto.js
// Kyoto — the reference theme: warm, serif, single-column editorial scroll.
// Inherits the full base variant menu; supplies only palette + fonts.

// Kyoto's type voices: the Cormorant serif at its regular weight, the SAME
// Cormorant at a heavier 600 ("Bold") for a headline-ier editorial voice, and
// the Muse display face (the poster/title font). Fraunces — base's "Editorial"
// option — is deliberately absent: it isn't part of Kyoto's palette, so it only
// ever read as a look-alike that never fit. The Bold slot reuses the serif
// family and leans on tokens.fontWeights (see resolveFontWeight) for its weight.
const KYOTO_FONTS = [
  { id: 'serif', label: 'Serif' },
  { id: 'serifBold', label: 'Bold' },
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
      serifBold: '"Cormorant Garamond", Georgia, serif',
      display: 'Muse',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"Geist Mono", monospace',
    },
    // Per-slot font weight (undefined = let the size scale / element decide).
    // Cormorant's default is light, so the Bold slot lifts it to 600 for presence.
    fontWeights: {
      serifBold: 600,
    },
  },
  overrides: {
    // Kyoto: a single photo defaults to the Centered layout, and captions default
    // to Serif (Cormorant italic) — the warm editorial voice.
    photo: { defaultVariant: 'centered', defaultCaptionStyle: 'serif' },
    photos: { defaultCaptionStyle: 'serif' },
    video: { defaultCaptionStyle: 'serif' },
    // Text blocks default to Medium (subheading), Serif the default voice.
    text: { defaultVariant: 'subheading', defaultFont: 'serif', fonts: KYOTO_FONTS },
    // Testimonials default to the Bold Cormorant — a testimonial reads better in
    // the heavier weight — Regular (not italic), Medium size, and Photo-above.
    testimonial: { defaultVariant: 'photo-above', defaultSize: 'medium', defaultFont: 'serifBold', defaultQuoteStyle: 'regular', fonts: KYOTO_FONTS },
  },
}
