import { classifyPage, buildSiteMap } from '@/common/import/siteMap'

describe('classifyPage', () => {
  it('classifies by slug/nav label first', () => {
    expect(classifyPage({ url: 'https://x.com/about', wordCount: 20, imageCount: 10 })).toBe('about')
    expect(classifyPage({ url: 'https://x.com/contact-me', wordCount: 10, imageCount: 0 })).toBe('contact')
    expect(classifyPage({ url: 'https://x.com/p1', navLabel: 'Bio', wordCount: 200, imageCount: 1 })).toBe('about')
  })
  it('classifies by composition when slug is neutral', () => {
    expect(classifyPage({ url: 'https://x.com/landscapes', wordCount: 30, imageCount: 24 })).toBe('gallery')
    expect(classifyPage({ url: 'https://x.com/story', wordCount: 400, imageCount: 1 })).toBe('about')
    expect(classifyPage({ url: 'https://x.com/hire', wordCount: 40, imageCount: 0, hasForm: true })).toBe('contact')
    expect(classifyPage({ url: 'https://x.com/misc', wordCount: 40, imageCount: 1 })).toBe('other')
  })
})

describe('buildSiteMap', () => {
  const records = [
    { url: 'https://x.com/', title: 'Jane Doe Photography', wordCount: 10, imageCount: 12, text: '' },
    { url: 'https://x.com/portraits', title: 'Portraits — Jane', wordCount: 8, imageCount: 30, text: '' },
    { url: 'https://x.com/about', title: 'About — Jane', wordCount: 220, imageCount: 1, text: 'I am Jane.\n\nI shoot people.' },
    { url: 'https://x.com/contact', title: 'Contact', wordCount: 30, imageCount: 0, hasForm: true, text: '' },
  ]
  const navLinks = [
    { href: 'https://x.com/portraits', label: 'Portraits' },
    { href: 'https://x.com/about', label: 'About' },
    { href: 'https://x.com/contact', label: 'Contact' },
  ]
  it('builds classified pages with nav order and collection ids', () => {
    const { pages } = buildSiteMap({ pageRecords: records, origin: 'https://x.com', navLinks })
    const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]))
    expect(bySlug['portraits']).toMatchObject({ kind: 'gallery', title: 'Portraits', navOrder: 0, collectionId: 'portraits' })
    expect(bySlug['about']).toMatchObject({ kind: 'about', navOrder: 1, textContent: 'I am Jane.\n\nI shoot people.' })
    expect(bySlug['contact']).toMatchObject({ kind: 'contact', navOrder: 2 })
    // root gallery page comes home-titled, after nav-ordered pages
    expect(bySlug['home']).toMatchObject({ kind: 'gallery', title: 'Home', navOrder: null, collectionId: 'home' })
  })
  it('prefers the nav label over the <title> tag for page titles', () => {
    const { pages } = buildSiteMap({ pageRecords: records, origin: 'https://x.com', navLinks })
    expect(pages.find((p) => p.slug === 'portraits').title).toBe('Portraits')
  })

  it('defaults videoUrls to [] on every page, carrying through record videoUrls', () => {
    const withVideo = records.map((r) => (r.url === 'https://x.com/about' ? { ...r, videoUrls: ['https://vimeo.com/1'] } : r))
    const { pages } = buildSiteMap({ pageRecords: withVideo, origin: 'https://x.com', navLinks })
    const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]))
    expect(bySlug['about'].videoUrls).toEqual(['https://vimeo.com/1'])
    expect(bySlug['portraits'].videoUrls).toEqual([])
    expect(bySlug['contact'].videoUrls).toEqual([])
    expect(bySlug['home'].videoUrls).toEqual([])
  })

  it('retains gallery textContent when the source prose is short (wordCount < 200)', () => {
    const recs = [
      { url: 'https://x.com/portraits', title: 'Portraits', wordCount: 8, imageCount: 30, text: 'A short intro to my portrait work.' },
    ]
    const { pages } = buildSiteMap({ pageRecords: recs, origin: 'https://x.com', navLinks: [{ href: 'https://x.com/portraits', label: 'Portraits' }] })
    expect(pages[0]).toMatchObject({ kind: 'gallery', textContent: 'A short intro to my portrait work.' })
  })

  it('drops gallery textContent when the source prose is long (wordCount >= 200)', () => {
    const recs = [
      { url: 'https://x.com/work', title: 'Work', wordCount: 250, imageCount: 6, text: 'A very long essay about my work.' },
    ]
    const { pages } = buildSiteMap({ pageRecords: recs, origin: 'https://x.com', navLinks: [{ href: 'https://x.com/work', label: 'Work' }] })
    expect(pages[0]).toMatchObject({ kind: 'gallery', textContent: '' })
  })
})
