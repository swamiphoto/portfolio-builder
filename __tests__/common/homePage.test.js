import { resolveHomePage, assignHomeOnCreate } from '@/common/homePage'
import { defaultPage } from '@/common/siteConfig'

const page = (over) => ({ type: 'page', showInNav: true, ...over })

describe('resolveHomePage', () => {
  it('returns null when there are no pages', () => {
    expect(resolveHomePage({ pages: [] })).toBeNull()
  })
  it('prefers the explicit homePageId', () => {
    const cfg = { homePageId: 'b', pages: [page({ id: 'a' }), page({ id: 'b' })] }
    expect(resolveHomePage(cfg).id).toBe('b')
  })
  it('falls back to the first nav non-link page', () => {
    const cfg = { pages: [page({ id: 'l', type: 'link' }), page({ id: 'a' })] }
    expect(resolveHomePage(cfg).id).toBe('a')
  })
  it('does not special-case an id of "home"', () => {
    const cfg = { pages: [page({ id: 'home', showInNav: false }), page({ id: 'a' })] }
    expect(resolveHomePage(cfg).id).toBe('a')
  })
})

describe('assignHomeOnCreate', () => {
  it('assigns the new page as home when none is set', () => {
    const cfg = { homePageId: null, pages: [] }
    expect(assignHomeOnCreate(cfg, page({ id: 'a' })).homePageId).toBe('a')
  })
  it('leaves an existing home untouched', () => {
    const cfg = { homePageId: 'a', pages: [] }
    expect(assignHomeOnCreate(cfg, page({ id: 'b' })).homePageId).toBe('a')
  })
  it('ignores hidden and link pages', () => {
    const cfg = { homePageId: null, pages: [] }
    // "unchanged" means unchanged: cfg.homePageId was explicitly null, so it stays null.
    expect(assignHomeOnCreate(cfg, page({ id: 'h', showInNav: false })).homePageId).toBeNull()
    expect(assignHomeOnCreate(cfg, page({ id: 'l', type: 'link' })).homePageId).toBeNull()
  })
})

describe('create-first-page assigns home', () => {
  it('pins the first created visible page as home', () => {
    let cfg = { homePageId: null, pages: [] }
    const p = defaultPage({ id: 'gallery', title: 'New Page', showInNav: true })
    cfg = { ...cfg, pages: [...cfg.pages, p] }
    cfg = assignHomeOnCreate(cfg, p)
    expect(cfg.homePageId).toBe('gallery')
    expect(cfg.pages).toHaveLength(1)
  })
})
