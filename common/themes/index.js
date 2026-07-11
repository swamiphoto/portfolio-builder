// The theme registry. In-repo for now; the marketplace later merges
// validated external themes into THEMES without touching consumers.
import { kyoto } from './kyoto'
import { manhattan } from './manhattan'

export const THEMES = { kyoto, manhattan }
export const THEME_LIST = [kyoto, manhattan]
export const DEFAULT_THEME_ID = 'kyoto'

export function getTheme(id) {
  return THEMES[id] || THEMES[DEFAULT_THEME_ID]
}

export function getBlockSpec(themeId, blockType) {
  const theme = getTheme(themeId)
  return theme.blocks[blockType] || null
}

export { kyoto, manhattan }
