// Manhattan — fixed left nav rail + gallery-wall grid on the right.
// Gallery-white, cool neutral, tight uppercase sans. Variant ids are
// theme-local and intentionally differ from Kyoto's.
export const manhattan = {
  id: 'manhattan',
  name: 'Manhattan',
  navStyle: 'left-rail',
  tokens: {
    '--theme-bg': '#fafafa',
    '--theme-text': '#141414',
    '--theme-text-muted': '#6b6b6b',
    '--theme-rail-width': '260px',
  },
  blocks: {
    photo: {
      defaultVariant: 'full-width',
      variants: [
        { id: 'full-width', label: 'Full width' },
        { id: 'framed', label: 'Framed' },
      ],
    },
    photos: {
      defaultVariant: 'grid',
      variants: [
        { id: 'grid', label: 'Grid' },
        { id: 'masonry', label: 'Masonry' },
      ],
    },
    text: {
      defaultVariant: 'heading',
      defaultAlign: 'left',
      variants: [
        { id: 'heading', label: 'L' },
        { id: 'subheading', label: 'M' },
        { id: 'body', label: 'S' },
        { id: 'quote', label: 'Quote' },
      ],
    },
    video: {
      defaultVariant: 'full-width',
      variants: [
        { id: 'full-width', label: 'Full width' },
        { id: 'framed', label: 'Framed' },
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
      defaultVariant: 'grid',
      variants: [{ id: 'grid', label: 'Grid' }],
    },
    contact: {
      defaultVariant: 'standard',
      variants: [{ id: 'standard', label: 'Standard' }],
    },
  },
}
