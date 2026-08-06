// At the very top, before existing imports:
jest.mock('../../common/gcsClient', () => ({
  downloadJSON: jest.fn(),
  uploadJSON: jest.fn(),
}))
jest.mock('../../common/gcsUser', () => ({
  getUserSiteConfigPath: jest.fn(userId => `users/${userId}/site-config.json`),
}))

import { downloadJSON, uploadJSON } from '../../common/gcsClient'
import { getUserSiteConfigPath } from '../../common/gcsUser'
import {
  createDefaultSiteConfig,
  defaultPage,
  dropSeededHomePage,
  generatePageId,
  normalizePrintStore,
  readSiteConfig,
  seedBlocksForTemplate,
  writeSiteConfig,
} from '../../common/siteConfig'

describe('createDefaultSiteConfig', () => {
  it('starts with zero pages — no hidden seeded page', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.pages).toEqual([])
  })

  it('has the cover page enabled by default', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.hasCoverPage).toBe(true)
  })

  it('defaults siteName/tagline to "My Portfolio" with no profile', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.siteName).toBe('My Portfolio')
    expect(config.tagline).toBe('')
    expect(config.footer.customText).toContain('My Portfolio')
  })

  it('seeds siteName from the profile name and tagline from the bio', () => {
    const config = createDefaultSiteConfig('user-123', { displayName: 'Jane Rivera', bio: 'Coastal weddings & family.' })
    expect(config.siteName).toBe('Jane Rivera')
    expect(config.tagline).toBe('Coastal weddings & family.')
    expect(config.footer.customText).toContain('Jane Rivera')
  })

  it('ignores blank profile fields (falls back to defaults)', () => {
    const config = createDefaultSiteConfig('user-123', { displayName: '   ', bio: '' })
    expect(config.siteName).toBe('My Portfolio')
    expect(config.tagline).toBe('')
  })

  it('sets default theme to kyoto', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.design.theme).toBe('kyoto')
  })

  it('sets publishedAt to null', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.publishedAt).toBeNull()
  })

  it('includes cover config and homePageId', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.cover).toEqual({
      heading: '',
      subheading: '',
      buttonText: 'View my portfolio',
      imageUrl: '',
      height: 'full',
      buttonStyle: 'solid',
    })
    expect(config.homePageId).toBeNull()
    expect(config.hasCoverPage).toBe(true)
  })

  it('includes share config', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.share).toEqual({ largeImage: '', squareImage: '' })
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

describe('readSiteConfig', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns parsed config when file exists', async () => {
    const mockConfig = { userId: 'user-123', pages: [] }
    downloadJSON.mockResolvedValue(mockConfig)

    const result = await readSiteConfig('user-123')
    expect(result).toMatchObject(mockConfig)
    expect(result.printStore).toMatchObject({
      enabled: false,
      markup: 3,
      showPriceOnImage: false,
      currency: 'USD',
      stripeConnectAccountId: null,
      platformFeePct: 0,
      chargesEnabled: false,
    })
    expect(downloadJSON).toHaveBeenCalledWith('users/user-123/site-config.json')
  })

  it('returns null when file does not exist (NoSuchKey)', async () => {
    const err = new Error('NoSuchKey')
    err.name = 'NoSuchKey'
    downloadJSON.mockRejectedValue(err)

    const result = await readSiteConfig('user-123')
    expect(result).toBeNull()
  })

  it('re-throws non-NoSuchKey errors', async () => {
    const err = new Error('Network failure')
    downloadJSON.mockRejectedValue(err)

    await expect(readSiteConfig('user-123')).rejects.toThrow('Network failure')
  })
})

describe('dropSeededHomePage', () => {
  it('drops the empty hidden `home` seed', () => {
    const config = {
      pages: [{ id: 'home', showInNav: false, blocks: [] }, { id: 'about', showInNav: true, blocks: [] }],
    }
    const result = dropSeededHomePage(config)
    expect(result.pages.map(p => p.id)).toEqual(['about'])
  })

  it('keeps a `home`-id page that has blocks', () => {
    const config = {
      pages: [{ id: 'home', showInNav: false, blocks: [{ type: 'photo' }] }],
    }
    const result = dropSeededHomePage(config)
    expect(result.pages.map(p => p.id)).toEqual(['home'])
  })

  it('keeps a `home`-id page that IS homePageId', () => {
    const config = {
      homePageId: 'home',
      pages: [{ id: 'home', showInNav: false, blocks: [] }],
    }
    const result = dropSeededHomePage(config)
    expect(result.pages.map(p => p.id)).toEqual(['home'])
  })

  it('keeps a visible (`showInNav:true`) page even if id is `home`', () => {
    const config = {
      pages: [{ id: 'home', showInNav: true, blocks: [] }],
    }
    const result = dropSeededHomePage(config)
    expect(result.pages.map(p => p.id)).toEqual(['home'])
  })

  it('returns config unchanged when there is no seed', () => {
    const config = { pages: [{ id: 'about', showInNav: true, blocks: [] }] }
    const result = dropSeededHomePage(config)
    expect(result).toBe(config)
  })
})

describe('writeSiteConfig', () => {
  afterEach(() => jest.clearAllMocks())

  it('calls uploadJSON with the correct path and config', async () => {
    uploadJSON.mockResolvedValue(undefined)
    const config = { userId: 'user-123', pages: [] }

    await writeSiteConfig('user-123', config)
    expect(uploadJSON).toHaveBeenCalledWith('users/user-123/site-config.json', config)
  })
})

describe('seedBlocksForTemplate', () => {
  it('seeds a mixed photo-essay scaffold for "story"', () => {
    const blocks = seedBlocksForTemplate('story')
    expect(blocks).toEqual([
      { type: 'photos', images: [], imageUrls: [], layout: 'stacked' },
      { type: 'text', content: '', variant: 1 },
      { type: 'photo', imageUrl: '', caption: '', variant: 1 },  // full bleed
      { type: 'photos', images: [], imageUrls: [], layout: 'masonry' },
      { type: 'photo', imageUrl: '', caption: '', variant: 2 },  // centered
      { type: 'video', url: '', caption: '' },  // centered
    ])
  })

  it('seeds masonry, a centered single, and a stack for "gallery"', () => {
    const blocks = seedBlocksForTemplate('gallery')
    expect(blocks).toEqual([
      { type: 'photos', images: [], imageUrls: [], layout: 'masonry' },
      { type: 'photo', imageUrl: '', caption: '', variant: 2 },  // single centered
      { type: 'photos', images: [], imageUrls: [], layout: 'stacked' },
    ])
  })

  it('returns a single page-gallery block for "collection"', () => {
    const blocks = seedBlocksForTemplate('collection')
    expect(blocks).toEqual([
      { type: 'page-gallery', source: 'manual', pageIds: [] },
    ])
  })

  it('seeds a centered portrait, heading, and body for "about"', () => {
    const blocks = seedBlocksForTemplate('about')
    expect(blocks).toEqual([
      { type: 'photo', imageUrl: '', caption: '', variant: 2 },  // centered portrait
      { type: 'text', content: '', variant: 1 },  // heading
      { type: 'text', content: '', variant: 3 },  // body
    ])
  })

  it('seeds a single contact block for "contact"', () => {
    const blocks = seedBlocksForTemplate('contact')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ type: 'contact' })
  })

  it('returns a heading text block plus an empty paragraph text block for "text"', () => {
    const blocks = seedBlocksForTemplate('text')
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ type: 'text', variant: 1 })
    expect(blocks[1]).toMatchObject({ type: 'text', variant: 3 })
  })

  it('returns an empty array for unknown templates', () => {
    expect(seedBlocksForTemplate('nope')).toEqual([])
    expect(seedBlocksForTemplate(undefined)).toEqual([])
  })
})

describe('defaultPage with template', () => {
  it('seeds blocks based on template', () => {
    const page = defaultPage({ id: 'travel', title: 'Travel', template: 'gallery' })
    expect(page.blocks).toEqual([
      { type: 'photos', images: [], imageUrls: [], layout: 'masonry' },
      { type: 'photo', imageUrl: '', caption: '', variant: 2 },
      { type: 'photos', images: [], imageUrls: [], layout: 'stacked' },
    ])
  })

  it('does not include `template` as a field on the page object', () => {
    const page = defaultPage({ id: 'travel', title: 'Travel', template: 'gallery' })
    expect(page).not.toHaveProperty('template')
  })

  it('persists template choice as `kind` on the page', () => {
    expect(defaultPage({ id: 'g', template: 'gallery' }).kind).toBe('gallery')
    expect(defaultPage({ id: 'c', template: 'collection' }).kind).toBe('collection')
    expect(defaultPage({ id: 't', template: 'text' }).kind).toBe('text')
    expect(defaultPage({ id: 'b', template: 'blank' }).kind).toBe('blank')
  })

  it('kind defaults to null when no template provided', () => {
    expect(defaultPage({ id: 'x' }).kind).toBeNull()
  })

  it('explicit kind overrides template', () => {
    expect(defaultPage({ id: 'x', template: 'gallery', kind: 'collection' }).kind).toBe('collection')
  })

  it('explicit blocks override template seeding', () => {
    const page = defaultPage({ id: 'x', template: 'gallery', blocks: [] })
    expect(page.blocks).toEqual([])
  })

  it('without a template, blocks defaults to []', () => {
    const page = defaultPage({ id: 'x', title: 'X' })
    expect(page.blocks).toEqual([])
  })
})

describe('printStore', () => {
  it('is present with defaults on a new site config', () => {
    const cfg = createDefaultSiteConfig('u1')
    expect(cfg.printStore).toMatchObject({
      enabled: false,
      markup: 3,
      showPriceOnImage: false,
      currency: 'USD',
      stripeConnectAccountId: null,
      platformFeePct: 0,
      chargesEnabled: false,
    })
  })

  it('normalizePrintStore backfills a missing printStore', () => {
    const cfg = normalizePrintStore({ userId: 'u1', pages: [] })
    expect(cfg.printStore.enabled).toBe(false)
    expect(cfg.printStore.markup).toBe(3)
  })

  it('normalizePrintStore preserves provided values', () => {
    const cfg = normalizePrintStore({ printStore: { enabled: true, markup: 2.5 } })
    expect(cfg.printStore.enabled).toBe(true)
    expect(cfg.printStore.markup).toBe(2.5)
    expect(cfg.printStore.platformFeePct).toBe(0)
  })
})

describe('printStore.chargesEnabled', () => {
  it('defaults to false on a new config', () => {
    expect(createDefaultSiteConfig('u1').printStore.chargesEnabled).toBe(false)
  })
  it('normalizePrintStore backfills and preserves chargesEnabled', () => {
    expect(normalizePrintStore({}).printStore.chargesEnabled).toBe(false)
    expect(normalizePrintStore({ printStore: { chargesEnabled: true } }).printStore.chargesEnabled).toBe(true)
  })
})
