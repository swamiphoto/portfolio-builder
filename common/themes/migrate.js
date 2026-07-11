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
  let b = block
  if (block.type === 'stacked' || block.type === 'masonry') {
    b = { ...block, type: 'photos', layout: block.layout || block.type }
  }
  const existing = b.themeState?.kyoto?.variant
  if (existing) return b // already migrated for kyoto
  const variant = resolveVariant(b, 'kyoto') // derives from legacy fields or default
  if (variant == null) return b // block type has no kyoto spec; nothing to migrate
  return {
    ...b,
    themeState: {
      ...(b.themeState || {}),
      kyoto: { ...(b.themeState?.kyoto || {}), variant },
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
