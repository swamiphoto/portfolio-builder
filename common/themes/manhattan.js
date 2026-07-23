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
    // Split pane can't full-bleed; keep Centered + Side for video.
    video: { hide: ['full-bleed'], defaultVariant: 'centered' },
    text: { defaultAlign: 'left', aligns: ['left'] },
    contact: { defaultAlign: 'left', aligns: ['left'] },
  },
}
