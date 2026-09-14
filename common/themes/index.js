// common/themes/index.js
// The theme registry. In-repo for now; the marketplace later merges
// validated external themes into THEMES without touching consumers.
import { kyoto } from './kyoto'
import { manhattan } from './manhattan'
import { provence } from './provence'
import { florence } from './florence'
import { amsterdam } from './amsterdam'
import { blantyre } from './blantyre'
import { baseBlocks, mergeBlockSpec } from './base'

export const THEMES = { kyoto, manhattan, provence, florence, amsterdam, blantyre }
export const THEME_LIST = [kyoto, manhattan, provence, florence, amsterdam, blantyre]
export const DEFAULT_THEME_ID = 'kyoto'

export function getTheme(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME_ID]
}

// The theme a specific page renders in: its own themeOverride if set to a real
// theme, else the site theme. Single source of truth for per-page overrides.
export function resolvePageThemeId(siteConfig, page) {
  const override = page?.themeOverride
  if (override && THEMES[override]) return override
  return siteConfig?.design?.theme || DEFAULT_THEME_ID
}

export function getPageTheme(siteConfig, page) {
  return getTheme(resolvePageThemeId(siteConfig, page))
}

// Describes whether a page overrides the site theme, plus the human names — for
// the editor's override control (sidebar) and indicator (preview chip). Mirrors
// resolvePageThemeId's rule: overridden only when it's a real theme id that
// differs from the current site theme (so it quietly folds away if the site
// later switches to the same theme).
export function pageThemeOverrideInfo(siteConfig, page) {
  const siteThemeId = siteConfig?.design?.theme || DEFAULT_THEME_ID
  const ov = page?.themeOverride
  const overridden = !!(ov && THEMES[ov] && ov !== siteThemeId)
  const nameOf = (id) => (THEME_LIST.find((t) => t.id === id) || {}).name || id
  const pageThemeId = overridden ? ov : siteThemeId
  return {
    overridden,
    siteThemeId,
    siteThemeName: nameOf(siteThemeId),
    pageThemeId,
    pageThemeName: nameOf(pageThemeId),
  }
}

export function getBlockSpec(themeId, blockType) {
  const base = baseBlocks[blockType]
  if (!base) return null
  const theme = getTheme(themeId)
  return mergeBlockSpec(base, theme.overrides?.[blockType])
}

export { kyoto, manhattan, provence, florence, amsterdam, blantyre }
export { baseBlocks, baseCover, FONT_SLOTS, mergeBlockSpec } from './base'
