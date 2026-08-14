// common/themes/florence.js
// Florence — the museum theme. A fixed-viewport, HORIZONTALLY scrolling museum
// wall: a thin left rail (logo · hamburger), an intro column (gallery name,
// bottom-left), then one column per block divided by vertical hairlines; a
// multi-photo block is a column that scrolls vertically inside, and the hamburger
// slides a menu column in at the front, pushing the wall right. High-contrast
// Fraunces (display / gallery names) over IBM Plex Mono (a warm, bookish mono for
// wall-labels + body). Rendered bespoke via FlorenceWall (Gallery short-circuits
// to it, SiteNav suppressed in the page files); this file supplies palette + fonts
// + block controls. Fonts: Editorial (Fraunces), Mono (IBM Plex), Sans.
const FLORENCE_FONTS = [
  { id: 'mono', label: 'Mono' },
  { id: 'fraunces', label: 'Editorial' },
  { id: 'sans', label: 'Sans' },
]

export const florence = {
  id: 'florence',
  name: 'Florence',
  navStyle: 'left-rail',
  tokens: {
    '--theme-bg': '#f4f1ea',        // warm paper / gallery wall
    '--theme-text': '#1c1a17',      // near-black ink
    '--theme-text-muted': '#8b8378', // wall-label gray
    '--theme-accent': '#7d5a44',    // restrained sepia (active nav)
    '--theme-rail-width': '96px',
    fonts: {
      serif: '"Fraunces", Georgia, serif',
      display: '"Fraunces", Georgia, serif',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
    },
  },
  overrides: {
    // Single photo: Full height (fills the column, default) or Centered (sized by
    // the Size control, positioned by Position). Size applies to Centered only.
    photo: {
      hide: ['full-bleed', 'centered', 'side-by-side'],
      add: [{ id: 'full-height', label: 'Fill' }, { id: 'centered', label: 'Centered' }],
      defaultVariant: 'full-height',
    },
    // Photo sets lay out horizontally (no vertical scroll): Row (all photos side by
    // side, captions beneath) or Mosaic (varied vertical groups of 1/2/3 side by
    // side). Size scales the height.
    photos: {
      hide: ['stacked', 'masonry', 'grid', 'square'],
      add: [{ id: 'row', label: 'Row' }, { id: 'mosaic', label: 'Mosaic' }],
      defaultVariant: 'row',
      sizeVariants: ['row', 'mosaic'],
    },
    // Bookish IBM Plex Mono by default; Editorial (Fraunces) + Sans and the L/M/S
    // size control are offered (pick S for small museum wall text).
    text: { defaultAlign: 'left', aligns: ['left'], defaultFont: 'mono', fonts: FLORENCE_FONTS },
    testimonial: { defaultFont: 'mono', fonts: FLORENCE_FONTS },
    contact: { defaultAlign: 'left', aligns: ['left'] },
  },
}
