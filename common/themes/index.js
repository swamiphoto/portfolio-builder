// common/themes/index.js
// The theme registry. In-repo for now; the marketplace later merges
// validated external themes into THEMES without touching consumers.
import { kyoto } from './kyoto'
import { manhattan } from './manhattan'
import { provence } from './provence'
import { florence } from './florence'
import { amsterdam } from './amsterdam'
import { baseBlocks, mergeBlockSpec } from './base'

export const THEMES = { kyoto, manhattan, provence, florence, amsterdam }
export const THEME_LIST = [kyoto, manhattan, provence, florence, amsterdam]
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

export function getBlockSpec(themeId, blockType) {
  const base = baseBlocks[blockType]
  if (!base) return null
  const theme = getTheme(themeId)
  return mergeBlockSpec(base, theme.overrides?.[blockType])
}

export { kyoto, manhattan, provence, florence, amsterdam }
export { baseBlocks, baseCover, FONT_SLOTS, mergeBlockSpec } from './base'
