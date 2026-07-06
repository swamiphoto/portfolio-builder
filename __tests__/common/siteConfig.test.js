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
  generatePageId,
  normalizePrintStore,
  readSiteConfig,
  seedBlocksForTemplate,
  writeSiteConfig,
} from '../../common/siteConfig'

describe('createDefaultSiteConfig', () => {
  it('returns a config with one home page', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.userId).toBe('user-123')
    expect(config.pages).toHaveLength(1)
    expect(config.pages[0].id).toBe('home')
    expect(config.pages[0].title).toBe('Home')
    expect(config.pages[0].showInNav).toBe(false)
    expect(config.pages[0].thumbnail).toEqual({ imageUrl: '', useCover: true })
    expect(config.pages[0].thumbnailUrl).toBe('')
    expect(config.pages[0]).not.toHaveProperty('type')
    expect(config.pages[0]).not.toHaveProperty('albums')
  })

  it('sets default theme to minimal-light', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.theme).toBe('minimal-light')
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
  it('returns a single masonry photos block for "gallery"', () => {
    const blocks = seedBlocksForTemplate('gallery')
    expect(blocks).toEqual([
      { type: 'photos', images: [], imageUrls: [], layout: 'masonry' },
    ])
  })

  it('returns a single page-gallery block for "collection"', () => {
    const blocks = seedBlocksForTemplate('collection')
    expect(blocks).toEqual([
      { type: 'page-gallery', source: 'manual', pageIds: [] },
    ])
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
