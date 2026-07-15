// Read-time normalization for the Design popup controls, plus wordmark and
// social-link helpers. These controls historically stored values that no render
// code consumed; these resolvers give them a single, defensive source of truth.

export function resolveNavMode(design) {
  return design?.navStyle === 'menu' ? 'menu' : 'links'
}

export function resolveSubNavStyle(design) {
  return design?.subNavStyle === 'inline' ? 'inline' : 'dropdown'
}

export function resolveFooter(siteConfig) {
  const design = siteConfig?.design || {}
  const footer = siteConfig?.footer || {}
  const hidden = footer.hidden === true || design.footerLayout === 'none'
  const layout = design.footerLayout === 'expanded' ? 'expanded' : 'simple'
  return { hidden, layout }
}

const INTER = '"Inter", -apple-system, BlinkMacSystemFont, ui-sans-serif, system-ui, sans-serif'
const FRAUNCES = '"Fraunces", Georgia, serif'

// Wordmark styling for the site-name logo. `null` = keep the theme's default.
export function logoFontStyle(logoFont) {
  if (logoFont === 'modern') return { fontFamily: INTER, textTransform: 'uppercase', letterSpacing: '0.16em' }
  if (logoFont === 'editorial') return { fontFamily: FRAUNCES, textTransform: 'none', letterSpacing: '0.01em' }
  return null
}

export const SOCIAL_KEYS = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'website']

const SOCIAL_BASE = {
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  twitter: 'https://twitter.com/',
  tiktok: 'https://tiktok.com/@',
  youtube: 'https://youtube.com/',
}

export function socialHref(key, value) {
  if (!value) return null
  const v = String(value).trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  if (key === 'website') return `https://${v.replace(/^\/+/, '')}`
  const base = SOCIAL_BASE[key]
  if (!base) return null
  return base + v.replace(/^@+/, '')
}
