import { filterJunkImages, inferCollectionName, groupIntoCollections } from '@/common/import/junkFilter'

describe('filterJunkImages', () => {
  it('drops filename-pattern junk', () => {
    const refs = [
      { remoteUrl: 'https://s.com/logo.png', seenOnPages: 1 },
      { remoteUrl: 'https://s.com/photo-123.jpg', seenOnPages: 1 },
    ]
    const out = filterJunkImages(refs, { totalPages: 1 })
    expect(out.map((r) => r.remoteUrl)).toEqual(['https://s.com/photo-123.jpg'])
  })
  it('drops images repeated across most pages (site chrome) when crawl is large enough', () => {
    const refs = [
      { remoteUrl: 'https://s.com/header.jpg', seenOnPages: 5 },
      { remoteUrl: 'https://s.com/unique.jpg', seenOnPages: 1 },
    ]
    const out = filterJunkImages(refs, { totalPages: 6, repeatRatio: 0.5 })
    expect(out.map((r) => r.remoteUrl)).toEqual(['https://s.com/unique.jpg'])
  })
  it('does not apply the repeat rule for tiny crawls', () => {
    const refs = [{ remoteUrl: 'https://s.com/a.jpg', seenOnPages: 2 }]
    expect(filterJunkImages(refs, { totalPages: 2 })).toHaveLength(1)
  })
})

describe('inferCollectionName', () => {
  it('names a collection from the last path segment', () => {
    expect(inferCollectionName('https://s.com/galleries/big-sur', 'https://s.com'))
      .toEqual({ id: 'galleries/big-sur', name: 'Big Sur' })
  })
  it('uses hostname for the root page', () => {
    expect(inferCollectionName('https://s.com/', 'https://s.com'))
      .toEqual({ id: 'home', name: 's.com' })
  })
})

describe('groupIntoCollections', () => {
  it('groups refs by the page they were found on', () => {
    const refs = [
      { remoteUrl: 'https://s.com/1.jpg', pageUrl: 'https://s.com/travel', caption: null },
      { remoteUrl: 'https://s.com/2.jpg', pageUrl: 'https://s.com/travel', caption: null },
      { remoteUrl: 'https://s.com/3.jpg', pageUrl: 'https://s.com/food', caption: null },
    ]
    const cols = groupIntoCollections(refs, 'https://s.com')
    expect(cols).toHaveLength(2)
    expect(cols.find((c) => c.id === 'travel').assetRefs).toHaveLength(2)
  })
})
