// Kyoto — the original "minimal light" look: warm, serif, single-column,
// top-to-bottom editorial scroll. Variant ids mirror the legacy render paths.
export const kyoto = {
  id: 'kyoto',
  name: 'Kyoto',
  navStyle: 'cover-embedded',
  tokens: {
    '--theme-bg': '#ffffff',
    '--theme-text': '#2c2416',
    '--theme-text-muted': '#7a6b55',
  },
  blocks: {
    photo: {
      defaultVariant: 'full-bleed',
      variants: [
        { id: 'full-bleed', label: 'Full Bleed' },
        { id: 'centered', label: 'Centered' },
      ],
    },
    photos: {
      defaultVariant: 'stacked',
      variants: [
        { id: 'stacked', label: 'Stacked' },
        { id: 'masonry', label: 'Masonry' },
      ],
    },
    text: {
      defaultVariant: 'heading',
      defaultAlign: 'center',
      variants: [
        { id: 'heading', label: 'L' },
        { id: 'subheading', label: 'M' },
        { id: 'body', label: 'S' },
        { id: 'quote', label: 'Quote' },
      ],
    },
    video: {
      defaultVariant: 'full-bleed',
      variants: [
        { id: 'full-bleed', label: 'Edge to edge' },
        { id: 'centered', label: 'Centered' },
        { id: 'side-by-side', label: 'Side by side' },
      ],
    },
    testimonial: {
      defaultVariant: 'photo-above',
      variants: [
        { id: 'photo-above', label: 'Photo above' },
        { id: 'quote-above', label: 'Quote above' },
      ],
    },
    'page-gallery': {
      defaultVariant: 'list',
      variants: [{ id: 'list', label: 'List' }],
    },
    contact: {
      defaultVariant: 'standard',
      variants: [{ id: 'standard', label: 'Standard' }],
    },
  },
}
