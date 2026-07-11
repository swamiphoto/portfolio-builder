// common/themes/migrate.js
import { resolveVariant } from './variants'

const LEGACY_THEME_IDS = {
  'minimal-light': 'kyoto',
  'minimal-dark': 'kyoto',
  'editorial': 'kyoto',
}

export function migrateThemeId(id) {
  if (!id) return 'kyoto'
  if (LEGACY_THEME_IDS[id]) return LEGACY_THEME_IDS[id]
  return id // already a valid new id (kyoto, manhattan, ...)
}

export function migrateBlock(block) {
  if (!block || typeof block !== 'object') return block
  const existing = block.themeState?.kyoto?.variant
  if (existing) return block // already migrated for kyoto
  const variant = resolveVariant(block, 'kyoto') // derives from legacy fields or default
  return {
    ...block,
    themeState: {
      ...(block.themeState || {}),
      kyoto: { ...(block.themeState?.kyoto || {}), variant },
    },
  }
}

export function migrateSiteConfigThemes(config = {}) {
  const design = { ...(config.design || {}), theme: migrateThemeId(config.design?.theme) }
  const pages = (config.pages || []).map((page) => ({
    ...page,
    blocks: (page.blocks || []).map(migrateBlock),
  }))
  return { ...config, design, pages }
}
