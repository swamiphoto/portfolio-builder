import {
  createDefaultSiteConfig,
  generatePageId,
} from '../../common/siteConfig'

describe('createDefaultSiteConfig', () => {
  it('returns a config with one cover page', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.userId).toBe('user-123')
    expect(config.pages).toHaveLength(1)
    expect(config.pages[0].type).toBe('cover')
    expect(config.pages[0].id).toBe('cover')
    expect(config.pages[0].showInNav).toBe(false)
  })

  it('sets default theme to minimal-light', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.theme).toBe('minimal-light')
  })

  it('sets publishedAt to null', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.publishedAt).toBeNull()
  })
})

describe('generatePageId', () => {
  it('slugifies the title', () => {
    expect(generatePageId('Landscape Photography')).toBe('landscape-photography')
  })

  it('strips special characters', () => {
    expect(generatePageId('Birds & Wildlife!')).toBe('birds-wildlife')
  })

  it('collapses multiple dashes', () => {
    expect(generatePageId('Black  White')).toBe('black-white')
  })

  it('appends suffix when provided', () => {
    expect(generatePageId('Landscapes', '-2')).toBe('landscapes-2')
  })
})
