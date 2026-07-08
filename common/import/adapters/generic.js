import fetch from 'node-fetch'
import { normalizeUrl, isSameDomain, extractTitle, extractImageUrls } from '../crawlerUtils'
import { filterJunkImages, groupIntoCollections } from '../junkFilter'

export const PROVIDER_ID = 'generic'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

async function httpFetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const type = res.headers.get('content-type') || ''
  if (!type.includes('text/html')) throw new Error(`non-html: ${type}`)
  return res.text()
}

async function discover(input, { fetchPage = httpFetchPage, maxPages = 40 } = {}) {
  const startUrl = normalizeUrl(input)
  if (!startUrl) throw new Error('Invalid URL')
  const origin = new URL(startUrl).origin

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
    for (const link of links) {
      if (isSameDomain(link, origin) && !visited.has(link) && !queue.includes(link)) queue.push(link)
    }
  }

  let refs = [...imageMap.values()].map((v) => ({ ...v, seenOnPages: seenOnPages.get(v.remoteUrl) }))
  refs = filterJunkImages(refs, { totalPages: visited.size })
  const collections = groupIntoCollections(refs, origin)

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
