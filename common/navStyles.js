const THEME_NAV_STYLES = {
  'kyoto': 'cover-embedded',
  'manhattan': 'left-rail',
  // Provence's cover page is a bespoke split-screen (PageCover renders it); the
  // running nav on every page is the top header bar (dark serif on cream).
  'provence': 'header-dropdown',
  // legacy ids (pre-migration reads) still resolve sanely
  'minimal-light': 'cover-embedded',
  'minimal-dark': 'cover-embedded',
  'editorial': 'header-dropdown',
}

export function resolveNavStyle(theme) {
  return THEME_NAV_STYLES[theme] || 'cover-embedded'
}
