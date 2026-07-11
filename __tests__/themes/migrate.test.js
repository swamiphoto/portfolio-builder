// __tests__/themes/migrate.test.js
import { migrateThemeId, migrateBlock, migrateSiteConfigThemes } from '@/common/themes/migrate'

describe('migrateThemeId', () => {
  it('folds legacy themes into kyoto and passes known ids', () => {
    expect(migrateThemeId('minimal-light')).toBe('kyoto')
    expect(migrateThemeId('minimal-dark')).toBe('kyoto')
    expect(migrateThemeId('editorial')).toBe('kyoto')
    expect(migrateThemeId('manhattan')).toBe('manhattan')
    expect(migrateThemeId('kyoto')).toBe('kyoto')
    expect(migrateThemeId(undefined)).toBe('kyoto')
  })
})

describe('migrateBlock', () => {
  it('populates themeState.kyoto from legacy photo layout', () => {
    expect(migrateBlock({ type: 'photo', variant: 2 }).themeState.kyoto.variant).toBe('centered')
    expect(migrateBlock({ type: 'photo', layout: 'Centered' }).themeState.kyoto.variant).toBe('centered')
  })

  it('populates themeState.kyoto from legacy text variant', () => {
    expect(migrateBlock({ type: 'text', variant: 3 }).themeState.kyoto.variant).toBe('body')
  })

  it('is idempotent and preserves existing themeState', () => {
    const already = { type: 'photo', themeState: { kyoto: { variant: 'centered' }, manhattan: { variant: 'framed' } } }
    const out = migrateBlock(already)
    expect(out.themeState.kyoto.variant).toBe('centered')
    expect(out.themeState.manhattan.variant).toBe('framed')
  })

  it('passes through blocks with no variant concept', () => {
    const c = { type: 'contact', heading: 'Hi' }
    expect(migrateBlock(c).themeState.kyoto.variant).toBe('standard')
  })

  it('normalizes legacy masonry/stacked types to photos and migrates them', () => {
    const out = migrateBlock({ type: 'masonry', layout: 'masonry' })
    expect(out.type).toBe('photos')
    expect(out.layout).toBe('masonry')
    expect(out.themeState.kyoto.variant).toBe('masonry')
  })

  it('leaves truly spec-less block types untouched', () => {
    const out = migrateBlock({ type: 'divider' })
    expect(out.themeState?.kyoto?.variant).toBeUndefined()
  })
})

describe('migrateSiteConfigThemes', () => {
  it('maps design.theme and migrates every block', () => {
    const config = {
      design: { theme: 'minimal-light' },
      pages: [{ id: 'home', blocks: [{ type: 'photo', variant: 2 }, { type: 'text', variant: 1 }] }],
    }
    const out = migrateSiteConfigThemes(config)
    expect(out.design.theme).toBe('kyoto')
    expect(out.pages[0].blocks[0].themeState.kyoto.variant).toBe('centered')
    expect(out.pages[0].blocks[1].themeState.kyoto.variant).toBe('heading')
  })

  it('tolerates missing design/pages', () => {
    expect(migrateSiteConfigThemes({}).design.theme).toBe('kyoto')
    expect(migrateSiteConfigThemes({}).pages).toEqual([])
  })
})
