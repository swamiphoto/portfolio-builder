const THEME_NAV_STYLES = {
  'minimal-light': 'cover-embedded',
  'minimal-dark': 'cover-embedded',
  'editorial': 'header-dropdown',
}

export function resolveNavStyle(theme) {
  return THEME_NAV_STYLES[theme] || 'cover-embedded'
}
