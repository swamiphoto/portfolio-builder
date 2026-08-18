import { safeFetch } from '../safeFetch'
import { normalizeUrl, isSameDomain, extractTitle, extractImageUrls, extractPageContent, extractNavLinks, extractVideoUrls } from '../crawlerUtils'
import { filterJunkImages, groupIntoCollections, inferCollectionName } from '../junkFilter'
import { buildSiteMap } from '../siteMap'
import { imageIdentity, preferLargerVariant, preferSmallerVariant } from '../originalUrl'

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

// CDNs (SmugMug foremost) publish every photo at many size-variant URLs, and
// pages/inline JSON often reference several of them for the same image. Naive
// per-URL dedupe treats each size as a distinct photo — collapse same-identity
// URLs to ONE before junk filtering/grouping, keeping the largest variant and
// merging their page-appearance data (union of pages, not sum) so per-page
// attribution and the junk filter's repeat-ratio math still work correctly.
function collapseImageVariants(imageMap, seenOnPages, imagePages) {
  const groups = new Map() // identity -> urls[]
  for (const url of imageMap.keys()) {
    const id = imageIdentity(url)
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push(url)
  }
  const newImageMap = new Map()
  const newSeenOnPages = new Map()
  const newImagePages = new Map()
  for (const urls of groups.values()) {
    const winner = urls.reduce((best, u) => preferLargerVariant(best, u))
    // Multiple variants of one image → keep the smallest as a cheap `thumbUrl`
    // for UI covers, alongside `winner` (kept at full size — imports never
    // downgrade quality). A single-URL group has nothing smaller to offer.
    const smallest = urls.length > 1 ? urls.reduce((worst, u) => preferSmallerVariant(worst, u)) : null
    const pages = []
    const seenPages = new Set()
    for (const u of urls) {
      for (const p of imagePages.get(u) || []) {
        if (!seenPages.has(p)) {
          seenPages.add(p)
          pages.push(p)
        }
      }
    }
    newImageMap.set(winner, {
      ...imageMap.get(winner),
      remoteUrl: winner,
      ...(smallest && smallest !== winner ? { thumbUrl: smallest } : {}),
    })
    newSeenOnPages.set(winner, pages.length)
    newImagePages.set(winner, pages)
  }
  return { imageMap: newImageMap, seenOnPages: newSeenOnPages, imagePages: newImagePages }
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
  const imagePages = new Map() // remoteUrl -> ordered list of every pageUrl it appeared on
  let siteTitle = null
  const pageRecords = []
  let navLinks = null

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
      if (!imagePages.has(img)) imagePages.set(img, [])
      imagePages.get(img).push(pageUrl)
      if (!imageMap.has(img)) imageMap.set(img, { remoteUrl: img, pageUrl })
    }
    const content = extractPageContent(html)
    pageRecords.push({
      url: pageUrl,
      title: extractTitle(html),
      wordCount: content.wordCount,
      imageCount: images.length,
      hasForm: content.hasForm,
      hasMailto: content.hasMailto,
      text: content.text,
      videoUrls: extractVideoUrls(html, pageUrl),
    })
    if (navLinks === null) navLinks = extractNavLinks(html, pageUrl)
    // Scoped to a single page → don't fan out across the site's other links.
    if (!singlePage) {
      for (const link of links) {
        if (isSameDomain(link, origin) && !visited.has(link) && !queue.includes(link)) queue.push(link)
      }
    }
  }

  // Whole-site crawl: JS-rendered sites (SmugMug et al.) often embed EVERY photo's
  // URL in the homepage's inline JSON, so BFS (which visits root first) would claim
  // every image for the root page. Prefer the first NON-root page an image appeared
  // on; only images seen exclusively on root stay attributed to root.
  const rootUrl = startUrl
  const collapsed = collapseImageVariants(imageMap, seenOnPages, imagePages)
  let refs = [...collapsed.imageMap.values()].map((v) => {
    let pageUrl = v.pageUrl
    if (!singlePage) {
      const pages = collapsed.imagePages.get(v.remoteUrl) || [v.pageUrl]
      pageUrl = pages.find((p) => p !== rootUrl) || pages[0]
    }
    return { ...v, pageUrl, seenOnPages: collapsed.seenOnPages.get(v.remoteUrl) }
  })
  refs = filterJunkImages(refs, { totalPages: visited.size })
  // A specific page → one flat collection named after that page; a whole site →
  // group into a collection per page (albums).
  const collections = singlePage
    ? [{ ...inferCollectionName(startUrl, origin), remoteUrl: startUrl, assetRefs: refs.map((r) => ({ remoteUrl: r.remoteUrl, caption: r.caption || null, ...(r.thumbUrl ? { thumbUrl: r.thumbUrl } : {}) })) }]
    : groupIntoCollections(refs, origin)

  return {
    site: { title: siteTitle || new URL(startUrl).hostname, url: startUrl },
    collections,
    siteMap: singlePage ? null : buildSiteMap({ pageRecords, origin, navLinks: navLinks || [] }),
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
