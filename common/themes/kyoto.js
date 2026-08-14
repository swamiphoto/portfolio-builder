// common/themes/kyoto.js
// Kyoto — the reference theme: warm, serif, single-column editorial scroll.
// Inherits the full base variant menu; supplies only palette + fonts.
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
    // Text blocks default to Medium (subheading).
    text: { defaultVariant: 'subheading' },
    // Testimonials default to Editorial (Fraunces), Regular (not italic), Medium
    // size, and Photo-above.
    testimonial: { defaultVariant: 'photo-above', defaultSize: 'medium', defaultFont: 'fraunces', defaultQuoteStyle: 'regular' },
  },
}
