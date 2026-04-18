jest.mock('../../common/gcsClient', () => ({
  downloadJSON: jest.fn(),
  uploadJSON: jest.fn(),
}))
jest.mock('../../common/gcsUser', () => ({
  getUserSiteConfigPath: jest.fn(userId => `users/${userId}/site-config.json`),
}))

import { createDefaultSiteConfig } from '../../common/siteConfig'

describe('createDefaultSiteConfig — unified page model', () => {
  const home = createDefaultSiteConfig('user-1').pages[0]

  it('home page defaults parentId to null', () => {
    expect(home.parentId).toBeNull()
  })

  it('home page defaults sortOrder to 0', () => {
    expect(home.sortOrder).toBe(0)
  })

  it('home page defaults password to empty string (no password)', () => {
    expect(home.password).toBe('')
  })

  it('home page defaults cover to null', () => {
    expect(home.cover).toBeNull()
  })

  it('home page defaults thumbnail.useCover to true', () => {
    expect(home.thumbnail).toEqual({ imageUrl: '', useCover: true })
  })

  it('home page defaults slideshow disabled', () => {
    expect(home.slideshow).toEqual({
      enabled: false,
      layout: 'kenburns',
      musicUrl: '',
    })
  })

  it('home page reserves clientFeatures with all flags off', () => {
    expect(home.clientFeatures).toEqual({
      enabled: false,
      passwordHash: '',
      watermarkEnabled: false,
      votingEnabled: false,
      downloadEnabled: false,
    })
  })

  it('home page is not in main nav by default (existing behavior preserved)', () => {
    expect(home.showInNav).toBe(false)
  })
})

import { defaultPage } from '../../common/siteConfig'

describe('defaultPage — no overrides', () => {
  const p = defaultPage()

  it('defaults showInNav to true', () => {
    expect(p.showInNav).toBe(true)
  })

  it('defaults id to "page"', () => {
    expect(p.id).toBe('page')
  })

  it('defaults slug to "page"', () => {
    expect(p.slug).toBe('page')
  })

  it('defaults title to "New Page"', () => {
    expect(p.title).toBe('New Page')
  })

  it('lets explicit slug override id-derived default', () => {
    expect(defaultPage({ id: 'about', slug: 'about-us' }).slug).toBe('about-us')
  })
})
