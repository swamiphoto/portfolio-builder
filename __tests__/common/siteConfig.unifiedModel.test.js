jest.mock('../../common/gcsClient', () => ({
  downloadJSON: jest.fn(),
  uploadJSON: jest.fn(),
}))
jest.mock('../../common/gcsUser', () => ({
  getUserSiteConfigPath: jest.fn(userId => `users/${userId}/site-config.json`),
}))

import { createDefaultSiteConfig, defaultPage } from '../../common/siteConfig'

describe('createDefaultSiteConfig — unified page model', () => {
  it('seeds no pages', () => {
    expect(createDefaultSiteConfig('user-1').pages).toEqual([])
  })

  it('defaultPage carries the unified page shape', () => {
    const p = defaultPage({ id: 'gallery', title: 'Gallery' })
    expect(p).toMatchObject({ id: 'gallery', title: 'Gallery', type: 'page', showInNav: true })
    expect(Array.isArray(p.blocks)).toBe(true)
  })
})

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
