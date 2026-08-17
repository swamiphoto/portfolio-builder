// common/themes/amsterdam.js
// Amsterdam — the Dutch-poster / De Stijl editorial theme. A thin left rail
// beside a horizontally scrolling, dividerless wall whose columns march through
// three grounds — black, warm-light, and red (ink) — with the rail flooding to
// match whichever ground is centered (useWallChrome). A poster hero or Anton
// condensed title panel opens; text sets in a fancy drop cap (two magazine
// columns when long); photos hang matted on the ground with a LEFT/RIGHT museum
// plaque beside them. Ink is a curated swatch (design.amsterdamInk) — it recolors
// the red ground and pairs a black body / white display treatment on it.
// Rendered bespoke via AmsterdamWall (Gallery short-circuits to it; SiteNav
// suppressed in the page files); this file supplies palette + fonts + controls.
const AMSTERDAM_FONTS = [
  { id: 'display', label: 'Display' },
  { id: 'serif', label: 'Editorial' },
  { id: 'condensed', label: 'Condensed' },
  { id: 'mono', label: 'Mono' },
]

// Per-block ground override: 'auto' keeps the black→light→red rotation; the rest
// pin a block to one ground. Stored flat as block.amsterdamGround.
export const AMSTERDAM_GROUNDS = ['auto', 'light', 'dark', 'ink']

// Curated poster inks. onInk is the display/emphasis color (giant wordmarks) on
// top of the ink; bodyOnInk is the reading color for body copy + captions, which
// De Stijl sets in black on the vermilion ground (white would flatten it).
// Each ink also carries a frame palette (card / mount / print mount colors) so the
// vintage frames harmonize with the chosen ink instead of always reading warm-light.
export const AMSTERDAM_INKS = {
  vermilion: { ink: '#e02b20', onInk: '#faf7f2', bodyOnInk: '#141210', frameCard: '#ece2cd', frameMount: '#cfd6d8', framePrint: '#f5f2ec' },
  ultramarine: { ink: '#1a1690', onInk: '#faf7f2', bodyOnInk: '#f1ece2', frameCard: '#e6e6dd', frameMount: '#c2ccdb', framePrint: '#f0f1f0' },
  black: { ink: '#141210', onInk: '#f6efe4', bodyOnInk: '#f1ece2', frameCard: '#d6cbb2', frameMount: '#b4babd', framePrint: '#e3ded3' },
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
