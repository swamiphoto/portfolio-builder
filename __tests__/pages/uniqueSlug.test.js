import { slugify, effectivePageSlug, uniqueSlug } from '@/common/pageUtils'

describe('effectivePageSlug', () => {
  it('prefers an explicit slug, then the title, then the id', () => {
    expect(effectivePageSlug({ slug: 'custom', title: 'My Page', id: 'p1' })).toBe('custom')
    expect(effectivePageSlug({ title: 'My Page', id: 'p1' })).toBe('my-page')
    expect(effectivePageSlug({ id: 'p1' })).toBe('p1')
    expect(effectivePageSlug(null)).toBe('')
  })
})

describe('uniqueSlug', () => {
  it('returns the desired slug when free', () => {
    expect(uniqueSlug('gallery', new Set())).toBe('gallery')
    expect(uniqueSlug('gallery', ['about', 'contact'])).toBe('gallery')
  })

  it('appends the next free numeric suffix on collision', () => {
    expect(uniqueSlug('gallery', new Set(['gallery']))).toBe('gallery-2')
    expect(uniqueSlug('gallery', new Set(['gallery', 'gallery-2']))).toBe('gallery-3')
    expect(uniqueSlug('gallery', new Set(['gallery', 'gallery-2', 'gallery-3']))).toBe('gallery-4')
  })

  it('falls back to "page" for an empty desired slug', () => {
    expect(uniqueSlug('', new Set())).toBe('page')
  })
})

describe('rename-to-duplicate scenario (#102)', () => {
  // Mirrors the slug logic in PlatformSidebar.handleRenameCommit: derive the
  // slug from the new title, then make it unique against the other pages.
  function renameSlug(pages, pageId, newTitle) {
    const p = pages.find(x => x.id === pageId)
    const prevDerived = slugify(p.title || '')
    const derived = (p.slug && p.slug !== prevDerived) ? p.slug : slugify(newTitle)
    const taken = new Set(pages.filter(o => o.id !== pageId).map(effectivePageSlug))
    return uniqueSlug(derived, taken)
  }

  it('does not reuse another page’s slug when two pages share a name', () => {
    const pages = [
      { id: 'portraits', title: 'Portraits', slug: 'portraits' },
      { id: 'landscapes', title: 'Landscapes', slug: 'landscapes' },
    ]
    // Rename the second page to match the first — it must NOT become "portraits".
    const slug = renameSlug(pages, 'landscapes', 'Portraits')
    expect(slug).toBe('portraits-2')
    expect(slug).not.toBe('portraits')
  })

  it('keeps a title-tracking slug when there is no collision', () => {
    const pages = [
      { id: 'about', title: 'About', slug: 'about' },
      { id: 'work', title: 'Work', slug: 'work' },
    ]
    expect(renameSlug(pages, 'work', 'Recent Work')).toBe('recent-work')
  })
})
