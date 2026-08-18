/**
 * @jest-environment node
 */
import smugmugWeb, { NotSmugMugError } from '@/common/import/adapters/smugmugWeb'

const ORIGIN = 'https://www.samgallery.com'
const ALBUM_ID = '258982435'
const ALBUM_KEY = 'Qh7WPB'
const ALBUM_TITLE = 'USA Landscape'
const ALBUM_DESC = 'Wide open spaces across the American West.'

// Every rendered SmugMug page carries these two markers (verified live against
// www.sankarsalvady.com) — URL shape can't be used for detection on custom
// domains, so content is all we have.
const SMUGMUG_MARKERS = `"NickName":"sam","cdnSample":"https:\\/\\/photos.smugmug.com\\/xyz\\/i-abc\\/0\\/aaa\\/O\\/xyz-O.jpg"`

function homeHtml(urlPaths) {
  const nav = urlPaths.map((p) => `{"UrlPath":"${p.replace(/\//g, '\\/')}"}`).join(',')
  return `<title>Sam Gallery</title><script>window.__DATA__ = {${SMUGMUG_MARKERS},"nav":[${nav}]}</script>`
}

function albumHtml(title, albumId, albumKey) {
  return `<title>${title}</title><script>window.__ALBUM__ = {"albumId":${albumId},"albumKey":"${albumKey}","nav":[]}</script>`
}

function bulkImage(n) {
  return {
    Caption: '',
    CaptionText: '',
    ImageKey: `bulk${n}`,
    ArchiveUrl: '',
    Sizes: { O: { usable: true, url: `https://photos.smugmug.com/Album/i-bulk${n}/0/abc/O/bulk${n}-O.jpg` } },
  }
}

function rpcOk(images) {
  return { stat: 'ok', Albums: [{ Title: ALBUM_TITLE, Description: ALBUM_DESC }], Images: images }
}

function fetchPageFor(pages) {
  return async (url) => {
    if (pages[url] == null) throw new Error('404: ' + url)
    return pages[url]
  }
}

describe('smugmugWeb.discover — detection', () => {
  it('throws NotSmugMugError for non-SmugMug HTML (URL-based detection cannot work on custom domains)', async () => {
    const fetchPage = async () => '<title>Just a blog</title><body><p>hello world</p></body>'
    await expect(smugmugWeb.discover('https://example.com', { fetchPage })).rejects.toBeInstanceOf(NotSmugMugError)
  })

  it('throws NotSmugMugError when the start page cannot be fetched at all', async () => {
    const fetchPage = async () => {
      throw new Error('ECONNREFUSED')
    }
    await expect(smugmugWeb.discover('https://example.com', { fetchPage })).rejects.toBeInstanceOf(NotSmugMugError)
  })
})

describe('smugmugWeb.discover — album discovery', () => {
  const FOURK_URL = 'https://photos.smugmug.com/Album/i-fourk/0/abc/4K/fourk-4K.jpg'
  const X3_ONLY_URL = 'https://photos.smugmug.com/Album/i-x3only/0/abc/X3/x3only-X3.jpg'

  const fourKPickImage = {
    Caption: '4K pick',
    CaptionText: '',
    ImageKey: 'fourk',
    ArchiveUrl: '',
    Sizes: {
      O: { usable: false },
      '5K': { usable: false },
      '4K': { usable: true, url: FOURK_URL },
      X3: { usable: true, url: 'https://photos.smugmug.com/Album/i-fourk/0/abc/X3/fourk-X3.jpg' },
    },
  }
  const x3OnlyImage = {
    Caption: '',
    CaptionText: 'x3 only caption',
    ImageKey: 'x3only',
    ArchiveUrl: '',
    Sizes: {
      O: { usable: false },
      '5K': { usable: false },
      '4K': { usable: false },
      X3: { usable: true, url: X3_ONLY_URL },
    },
  }

  const page1Images = [fourKPickImage, x3OnlyImage, ...Array.from({ length: 58 }, (_, i) => bulkImage(i))]
  const page2Images = [bulkImage(58)]

  const PAGES = {
    [`${ORIGIN}/`]: homeHtml(['/USA/Landscape', '/Contact']),
    [`${ORIGIN}/USA/Landscape`]: albumHtml('USA Landscape', ALBUM_ID, ALBUM_KEY),
    [`${ORIGIN}/Contact`]: `<title>Contact</title><body><form><input/></form><p>Get in touch for print inquiries and licensing.</p></body>`,
  }

  it('walks the UrlPath tree, pages through the RPC (61 images across 2 pages), and picks the largest USABLE size per image', async () => {
    const calls = []
    const fetchJson = async (url, opts) => {
      calls.push({ url, opts })
      const u = new URL(url)
      expect(u.pathname).toBe('/services/api/json/1.4.0/')
      expect(u.searchParams.get('method')).toBe('rpc.gallery.getalbum')
      expect(u.searchParams.get('albumId')).toBe(ALBUM_ID)
      expect(u.searchParams.get('albumKey')).toBe(ALBUM_KEY)
      const pageNum = u.searchParams.get('PageNumber')
      if (pageNum === '1') return rpcOk(page1Images)
      if (pageNum === '2') return rpcOk(page2Images)
      throw new Error('unexpected RPC page ' + pageNum)
    }

    const result = await smugmugWeb.discover(ORIGIN, { fetchPage: fetchPageFor(PAGES), fetchJson })

    expect(calls).toHaveLength(2) // paginates until a short page (< 60) ends it
    // Referer-gated: the album RPC is called with the album page's own URL as Referer.
    expect(calls[0].opts.referer).toBe(`${ORIGIN}/USA/Landscape`)
    calls.forEach((c) => expect(new URL(c.url).searchParams.get('PageSize')).toBe('60'))

    expect(result.collections).toHaveLength(1)
    const col = result.collections[0]
    expect(col.id).toBe(ALBUM_KEY)
    expect(col.name).toBe(ALBUM_TITLE)
    expect(col.remoteUrl).toBe(`${ORIGIN}/USA/Landscape`)
    expect(col.description).toBe(ALBUM_DESC)
    expect(col.assetRefs).toHaveLength(61)

    // O/5K unusable, 4K usable and ranked above X3 -> 4K wins.
    expect(col.assetRefs[0]).toEqual({ remoteUrl: FOURK_URL, caption: '4K pick' })
    // Only X3 usable -> X3 wins; caption falls back to CaptionText when Caption is empty.
    expect(col.assetRefs[1]).toEqual({ remoteUrl: X3_ONLY_URL, caption: 'x3 only caption' })

    // Album Description flows into the siteMap gallery page's textContent, tied
    // to the collection via collectionId = albumKey (what composer.js keys on).
    const galleryPage = result.siteMap.pages.find((p) => p.collectionId === ALBUM_KEY)
    expect(galleryPage).toBeTruthy()
    expect(galleryPage.kind).toBe('gallery')
    expect(galleryPage.textContent).toBe(ALBUM_DESC)

    // Non-album pages still feed the siteMap via ordinary extraction.
    const contactPage = result.siteMap.pages.find((p) => p.sourceUrl === `${ORIGIN}/Contact`)
    expect(contactPage.kind).toBe('contact')
  })
})

describe('smugmugWeb.discover — protected albums', () => {
  it('skips an album whose RPC returns stat:"fail", while a sibling album survives', async () => {
    const PAGES = {
      [`${ORIGIN}/`]: homeHtml(['/Private', '/Public']),
      [`${ORIGIN}/Private`]: albumHtml('Private', '1000000001', 'PRIV1'),
      [`${ORIGIN}/Public`]: albumHtml('Public', '1000000002', 'PUB1'),
    }
    const fetchJson = async (url) => {
      const u = new URL(url)
      const albumKey = u.searchParams.get('albumKey')
      if (albumKey === 'PRIV1') return { stat: 'fail' }
      if (albumKey === 'PUB1') return rpcOk([bulkImage(1)])
      throw new Error('unexpected album ' + albumKey)
    }

    const result = await smugmugWeb.discover(ORIGIN, { fetchPage: fetchPageFor(PAGES), fetchJson })
    expect(result.collections.map((c) => c.id)).toEqual(['PUB1'])
  })
})

describe('smugmugWeb.discover — duplicate albumKey via two paths', () => {
  it('collapses the same album reached via two page paths into ONE collection, fetching the RPC only once', async () => {
    const PAGES = {
      [`${ORIGIN}/`]: homeHtml(['/USA/Landscape', '/Collections/BestOf']),
      [`${ORIGIN}/USA/Landscape`]: albumHtml('USA Landscape', ALBUM_ID, ALBUM_KEY),
      [`${ORIGIN}/Collections/BestOf`]: albumHtml('Best Of', ALBUM_ID, ALBUM_KEY),
    }
    let rpcCalls = 0
    const fetchJson = async () => {
      rpcCalls += 1
      return rpcOk([bulkImage(1)])
    }

    const result = await smugmugWeb.discover(ORIGIN, { fetchPage: fetchPageFor(PAGES), fetchJson })
    expect(result.collections).toHaveLength(1)
    expect(result.collections[0].id).toBe(ALBUM_KEY)
    expect(rpcCalls).toBe(1)
  })
})
