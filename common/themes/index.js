// common/themes/index.js
// The theme registry. In-repo for now; the marketplace later merges
// validated external themes into THEMES without touching consumers.
import { kyoto } from './kyoto'
import { manhattan } from './manhattan'
import { provence } from './provence'
import { baseBlocks, mergeBlockSpec } from './base'

export const THEMES = { kyoto, manhattan, provence }
export const THEME_LIST = [kyoto, manhattan, provence]
export const DEFAULT_THEME_ID = 'kyoto'

export function getTheme(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME_ID]
}

export function getBlockSpec(themeId, blockType) {
  const base = baseBlocks[blockType]
  if (!base) return null
  const theme = getTheme(themeId)
  return mergeBlockSpec(base, theme.overrides?.[blockType])
}

export { kyoto, manhattan, provence }
export { baseBlocks, baseCover, FONT_SLOTS, mergeBlockSpec } from './base'
