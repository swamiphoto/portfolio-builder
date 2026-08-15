// common/themes/amsterdam.js
// Amsterdam — the Dutch-poster editorial theme. A thin left rail beside a
// horizontally scrolling wall of columns: a poster hero (site name enormous in
// Abril Fatface over the cover photo) or an Anton condensed title panel opens
// the wall, text blocks render as full-height solid-ink Panels (Quiet opts out),
// photos hang as Fill columns / Rows / Mosaics with museum captions. Ink is a
// curated 3-swatch control (design.amsterdamInk), never a free color pick.
// Rendered bespoke via AmsterdamWall (Gallery short-circuits to it; SiteNav
// suppressed in the page files); this file supplies palette + fonts + controls.
const AMSTERDAM_FONTS = [
  { id: 'display', label: 'Display' },
  { id: 'serif', label: 'Editorial' },
  { id: 'condensed', label: 'Condensed' },
]

// Curated poster inks. onInk is the text color used on top of the ink.
export const AMSTERDAM_INKS = {
  vermilion: { ink: '#e02b20', onInk: '#ffffff' },
  ultramarine: { ink: '#1a1690', onInk: '#ffffff' },
  black: { ink: '#141210', onInk: '#f6efe4' },
}

export function resolveAmsterdamInk(design) {
  return AMSTERDAM_INKS[design?.amsterdamInk] ? design.amsterdamInk : 'vermilion'
}

export function amsterdamInkColors(design) {
  return AMSTERDAM_INKS[resolveAmsterdamInk(design)]
}

export const amsterdam = {
  id: 'amsterdam',
  name: 'Amsterdam',
  navStyle: 'left-rail',
  tokens: {
    '--theme-bg': '#f6efe4',        // warm cream
    '--theme-text': '#141210',      // near-black ink
    '--theme-text-muted': '#8a8175', // caption gray
    '--theme-accent': '#e02b20',    // vermilion (static accent; live ink is --ams-ink)
    '--theme-rail-width': '96px',
    fonts: {
      serif: '"Playfair Display", Georgia, serif',
      display: '"Abril Fatface", Georgia, serif',
      condensed: '"Anton", "Arial Narrow", sans-serif',
      // Slots stored under other themes still resolve to something sane here.
      fraunces: '"Playfair Display", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, monospace',
    },
  },
  overrides: {
    // Single photo: Fill (spans the column height, default) or Centered (sized by
    // Size, positioned on cream with its caption).
    photo: {
      hide: ['full-bleed', 'centered', 'side-by-side'],
      add: [{ id: 'full-height', label: 'Fill' }, { id: 'centered', label: 'Centered' }],
      defaultVariant: 'full-height',
    },
    // Photo sets lay out horizontally: Row (side by side, captions beneath) or
    // Mosaic (varied groups of 1/2/3). Size scales the height.
    photos: {
      hide: ['stacked', 'masonry', 'grid', 'square'],
      add: [{ id: 'row', label: 'Row' }, { id: 'mosaic', label: 'Mosaic' }],
      defaultVariant: 'row',
      sizeVariants: ['row', 'mosaic'],
    },
    // Text keeps the base L/M/S variants (they ARE the size control). Panel/Quiet
    // is the Amsterdam-only Style pill (block.amsterdamStyle — see DesignPopover).
    text: { defaultAlign: 'left', aligns: ['left'], defaultFont: 'display', fonts: AMSTERDAM_FONTS },
    testimonial: { defaultFont: 'serif', fonts: AMSTERDAM_FONTS },
    contact: { defaultAlign: 'left', aligns: ['left'] },
  },
}
