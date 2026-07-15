const THEME_NAV_STYLES = {
  'kyoto': 'cover-embedded',
  'manhattan': 'left-rail',
  // legacy ids (pre-migration reads) still resolve sanely
  'minimal-light': 'cover-embedded',
  'minimal-dark': 'cover-embedded',
  'editorial': 'header-dropdown',
}

export function resolveNavStyle(theme) {
  return THEME_NAV_STYLES[theme] || 'cover-embedded'
}
