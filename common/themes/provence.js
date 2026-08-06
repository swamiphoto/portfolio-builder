// common/themes/provence.js
// Provence — warm ivory, romantic serif, editorial client-gallery. A split-screen
// cover (cream text panel + full-bleed photo, divided by a hairline) opens into
// edge-to-edge, sharp-cornered justified-row galleries with a sticky header that
// materializes on scroll. Unlike Manhattan it strips nothing: every block and
// every layout stays on the menu. Its type pairs Cormorant Garamond (display /
// cover title) with Spectral (body) — deliberately distinct from Kyoto.
export const provence = {
  id: 'provence',
  name: 'Provence',
  // Hidden from the theme picker while it's still being refined. Stays fully
  // registered (renders + resolves), just off the menu. Remove this to re-list it.
  hidden: true,
  navStyle: 'split-cover',
  tokens: {
    '--theme-bg': '#f7f3ea',
    '--theme-text': '#3d372c',
    '--theme-text-muted': '#a08a66',
    '--theme-accent': '#b0925f',
    fonts: {
      serif: '"Spectral", Georgia, serif',
      display: '"Cormorant Garamond", Georgia, serif',
      fraunces: '"Fraunces", Georgia, serif',
      sans: 'Inter, -apple-system, system-ui, sans-serif',
      mono: '"Geist Mono", monospace',
    },
  },
  overrides: {
    // Justified rows (the client-gallery signature) is the default for photo sets,
    // but stacked / masonry / square all stay available in the menu.
    photos: { defaultVariant: 'grid' },
  },
}
