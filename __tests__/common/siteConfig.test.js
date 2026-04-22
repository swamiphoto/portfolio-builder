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
  generatePageId,
  readSiteConfig,
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

  it('includes cover config and initialPageId', () => {
    const config = createDefaultSiteConfig('user-123')
    expect(config.cover).toEqual({
      heading: '',
      subheading: '',
      buttonText: 'View my portfolio',
      imageUrl: '',
      height: 'full',
      buttonStyle: 'solid',
    })
    expect(config.initialPageId).toBeNull()
    expect(config.hasCoverPage).toBe(true)
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
    expect(result).toEqual(mockConfig)
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
