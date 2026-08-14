import { safeFetch } from '../safeFetch'
import { normalizeUrl, isSameDomain, extractTitle, extractImageUrls } from '../crawlerUtils'
import { filterJunkImages, groupIntoCollections, inferCollectionName } from '../junkFilter'

export const PROVIDER_ID = 'generic'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

async function httpFetchPage(url) {
  const res = await safeFetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const type = res.headers.get('content-type') || ''
  if (!type.includes('text/html')) throw new Error(`non-html: ${type}`)
  return res.text()
}

async function discover(input, { fetchPage = httpFetchPage, maxPages = 40 } = {}) {
  const startUrl = normalizeUrl(input)
  if (!startUrl) throw new Error('Invalid URL')
  const seed = new URL(startUrl)
  const origin = seed.origin
  // When the user gives a SPECIFIC page (e.g. /portfolio/portraits), import just that
  // page's photos as one set instead of crawling the whole site into per-page albums.
  const seedPath = seed.pathname.replace(/\/+$/, '')
  const singlePage = seedPath !== '' && seedPath !== '/'

  const visited = new Set()
  const queue = [startUrl]
  const imageMap = new Map() // remoteUrl -> { remoteUrl, pageUrl }
  const seenOnPages = new Map() // remoteUrl -> count
  let siteTitle = null

  while (queue.length && visited.size < maxPages) {
    const pageUrl = queue.shift()
    if (visited.has(pageUrl)) continue
    visited.add(pageUrl)

    let html
    try {
      html = await fetchPage(pageUrl)
    } catch {
      continue
    }
    if (!siteTitle) siteTitle = extractTitle(html)

    const { images, links } = extractImageUrls(html, pageUrl)
    for (const img of images) {
      seenOnPages.set(img, (seenOnPages.get(img) || 0) + 1)
      if (!imageMap.has(img)) imageMap.set(img, { remoteUrl: img, pageUrl })
    }
    // Scoped to a single page → don't fan out across the site's other links.
    if (!singlePage) {
      for (const link of links) {
        if (isSameDomain(link, origin) && !visited.has(link) && !queue.includes(link)) queue.push(link)
      }
    }
  }

  let refs = [...imageMap.values()].map((v) => ({ ...v, seenOnPages: seenOnPages.get(v.remoteUrl) }))
  refs = filterJunkImages(refs, { totalPages: visited.size })
  // A specific page → one flat collection named after that page; a whole site →
  // group into a collection per page (albums).
  const collections = singlePage
    ? [{ ...inferCollectionName(startUrl, origin), remoteUrl: startUrl, assetRefs: refs.map((r) => ({ remoteUrl: r.remoteUrl, caption: r.caption || null })) }]
    : groupIntoCollections(refs, origin)

  return {
    site: { title: siteTitle || new URL(startUrl).hostname, url: startUrl },
    collections,
  }
}

const generic = {
  id: PROVIDER_ID,
  label: 'Website',
  icon: 'globe',
  enabled: true,
  detect() {
    return true
  },
  discover,
}
export default generic
