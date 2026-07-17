// common/themes/manhattan.js
// Manhattan — fixed left rail + gallery-wall grid. Inherits the base menu and
// expresses its personality purely through label/default overrides + tokens.
export const manhattan = {
  id: 'manhattan',
  name: 'Manhattan',
  navStyle: 'left-rail',
  tokens: {
    '--theme-bg': '#fafafa',
    '--theme-text': '#141414',
    '--theme-text-muted': '#6b6b6b',
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
    photo: { labels: { 'full-bleed': 'Full width', centered: 'Framed' }, hide: ['side-by-side'] },
    photos: { defaultVariant: 'grid' },
    video: { labels: { 'full-bleed': 'Full width', centered: 'Framed' }, hide: ['side-by-side'] },
    text: { defaultAlign: 'left' },
  },
}
