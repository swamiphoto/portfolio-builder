/**
 * @jest-environment node
 */
import generic from '@/common/import/adapters/generic'

function fakeSite() {
  const pages = {
    'https://joe.com/': `<title>Joe</title>
      <a href="/travel">t</a><a href="/food">f</a>
      <img src="/logo.png"><img src="/home-hero.jpg">`,
    'https://joe.com/travel': `<img src="/t1.jpg"><img src="/t2.jpg"><img src="/logo.png">`,
    'https://joe.com/food': `<img src="/f1.jpg"><img src="/logo.png">`,
  }
  return (url) => {
    if (pages[url] == null) return Promise.reject(new Error('404'))
    return Promise.resolve(pages[url])
  }
}

describe('generic.discover', () => {
  it('crawls same-domain pages and returns collections without junk', async () => {
    const result = await generic.discover('joe.com', { fetchPage: fakeSite(), maxPages: 10 })
    expect(result.site.title).toBe('Joe')
    const allImages = result.collections.flatMap((c) => c.assetRefs.map((r) => r.remoteUrl))
    expect(allImages).toContain('https://joe.com/t1.jpg')
    expect(allImages).toContain('https://joe.com/f1.jpg')
    expect(allImages.some((u) => u.includes('logo.png'))).toBe(false)
    const ids = result.collections.map((c) => c.id).sort()
    expect(ids).toEqual(['food', 'home', 'travel'])
  })

  it('stays on the same domain', async () => {
    const fetchPage = (url) =>
      url === 'https://joe.com/'
        ? Promise.resolve('<a href="https://evil.com/x">x</a><img src="/ok.jpg">')
        : Promise.reject(new Error('should not fetch ' + url))
    const result = await generic.discover('joe.com', { fetchPage, maxPages: 10 })
    const images = result.collections.flatMap((c) => c.assetRefs.map((r) => r.remoteUrl))
    expect(images).toContain('https://joe.com/ok.jpg')
  })
})
