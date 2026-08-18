import { safeFetch } from '../safeFetch'
import { normalizeUrl, isSameDomain, extractTitle, extractImageUrls, extractPageContent, extractNavLinks, extractVideoUrls } from '../crawlerUtils'
import { inferCollectionName } from '../junkFilter'
import { buildSiteMap } from '../siteMap'
import { imageIdentity } from '../originalUrl'

// SmugMug custom-domain (and *.smugmug.com) sites render entirely with client-side
// JS and never expose an API key to the browser. This adapter reads the same
// unauthenticated endpoints the site's own front-end uses, verified live against
// www.sankarsalvady.com, so imports work with ZERO API credentials.
export const PROVIDER_ID = 'smugmug'

// Thrown when the fetched content doesn't look like SmugMug — URL-based detection
// can't work here (custom domains hide the smugmug.com hostname entirely), so the
// caller (pages/api/admin/import/discover.js) fetches first and falls back to the
// generic crawler when this typed error surfaces.
export class NotSmugMugError extends Error {
  constructor(message) {
    super(message || 'Not a SmugMug site')
    this.name = 'NotSmugMugError'
  }
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

async function httpFetchPage(url) {
  const res = await safeFetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const type = res.headers.get('content-type') || ''
  if (!type.includes('text/html')) throw new Error(`non-html: ${type}`)
  return res.text()
}

async function httpFetchJson(url, { referer } = {}) {
  const res = await safeFetch(url, { headers: { Accept: 'application/json', Referer: referer, 'User-Agent': UA } })
  if (!res.ok) throw new Error(`SmugMug RPC HTTP ${res.status}`)
  return res.json()
}

// A fetched page is SmugMug when its HTML references the photos.smugmug.com CDN
// AND carries the account's NickName marker. Both are present on every rendered
// page of a SmugMug site (custom domain or *.smugmug.com), so checking the start
// page is sufficient — URL shape tells us nothing on custom domains.
const NICKNAME_RE = /"NickName"\s*:\s*"[^"]*"/
function looksLikeSmugMug(html) {
  const s = String(html || '')
  return s.includes('photos.smugmug.com') && NICKNAME_RE.test(s)
}

// Present on every album page's HTML (inline hydration JSON), independent of the
// page's URL shape.
const ALBUM_ID_RE = /"albumId"\s*:\s*(\d+)/
const ALBUM_KEY_RE = /"albumKey"\s*:\s*"([^"]+)"/

function albumApiUrl(origin, albumId, albumKey, pageNumber) {
  const params = new URLSearchParams()
  params.set('galleryType', 'album')
  params.set('albumId', String(albumId))
  params.set('albumKey', albumKey)
  params.set('nodeId', '')
  params.set('PageNumber', String(pageNumber))
  params.set('imageId', '0')
  params.set('imageKey', '')
  params.set('returnModelList', 'true')
  params.set('PageSize', '60')
  params.set('method', 'rpc.gallery.getalbum')
  return `${origin}/services/api/json/1.4.0/?${params.toString()}`
}

const RPC_PAGE_SIZE = 60

// Pages through the unauthenticated per-album JSON RPC (same-origin, Referer-gated).
// A page returning fewer than PageSize images ends pagination; a "fail" stat (a
// protected/private album) or a network hiccup ends it early with whatever was
// collected so far — protected albums are skipped, not treated as import failures.
async function fetchAlbumImages({ origin, albumId, albumKey, refererUrl, fetchJson, maxAlbumPages }) {
  const images = []
  let albumMeta = null
  for (let page = 1; page <= maxAlbumPages; page += 1) {
    const url = albumApiUrl(origin, albumId, albumKey, page)
    let resp
    try {
      resp = await fetchJson(url, { referer: refererUrl })
    } catch {
      break
    }
    if (!resp || resp.stat !== 'ok') break
    if (!albumMeta) albumMeta = (resp.Albums && resp.Albums[0]) || null
    const pageImages = Array.isArray(resp.Images) ? resp.Images : []
    images.push(...pageImages)
    if (pageImages.length < RPC_PAGE_SIZE) break
  }
  return { images, albumMeta }
}

// SmugMug size codes, smallest -> largest (mirrors the URL-suffix-based ranking in
// originalUrl.js, but here the sizes are explicit map keys from the RPC response
// rather than something to be parsed out of a URL).
const SIZE_ORDER = ['Ti', 'Th', 'S', 'M', 'L', 'XL', 'X2', 'X3', 'X4', 'X5', '4K', '5K', 'O']

// ArchiveUrl (the un-watermarked original) wins when downloads are enabled; when
// it's empty, fall back to the largest USABLE size — some sizes (commonly O, 5K)
// are present in the map but marked unusable with no url at all.
function pickImageUrl(img) {
  const archive = String(img?.ArchiveUrl || '').trim()
  if (archive) return archive
  const sizes = img?.Sizes || {}
  let bestUrl = null
  let bestRank = -Infinity
  for (const [sizeId, info] of Object.entries(sizes)) {
    if (!info || !info.usable || !info.url) continue
    const rank = SIZE_ORDER.indexOf(sizeId)
    if (bestUrl === null || rank > bestRank) {
      bestRank = rank
      bestUrl = info.url
    }
  }
  return bestUrl
}

function pickCaption(img) {
  const raw = img?.Caption || img?.CaptionText
  return raw ? String(raw) : null
}

async function discover(input, { fetchPage = httpFetchPage, fetchJson = httpFetchJson, maxPages = 60, maxAlbumPages = 10 } = {}) {
  const startUrl = normalizeUrl(input)
  if (!startUrl) throw new Error('Invalid URL')
  const seed = new URL(startUrl)
  const origin = seed.origin

  const visited = new Set()
  const queue = [startUrl]
  const pageRecords = []
  const collections = []
  const seenAlbumKeys = new Set()
  let siteTitle = null
  let navLinks = null

  while (queue.length && visited.size < maxPages) {
    const pageUrl = queue.shift()
    if (visited.has(pageUrl)) continue
    visited.add(pageUrl)

    let html
    try {
      html = await fetchPage(pageUrl)
    } catch {
      if (pageUrl === startUrl) throw new NotSmugMugError(`could not fetch ${pageUrl}`)
      continue
    }

    if (pageUrl === startUrl && !looksLikeSmugMug(html)) {
      throw new NotSmugMugError(`not a SmugMug site: ${pageUrl}`)
    }

    if (!siteTitle) siteTitle = extractTitle(html)
    if (navLinks === null) navLinks = extractNavLinks(html, pageUrl)

    // Reuse the generic crawler's link-mining (handles both <a href> and the
    // inline-JSON UrlPath/absolute-URL discovery JS-rendered SmugMug sites need).
    const { images, links } = extractImageUrls(html, pageUrl)
    const content = extractPageContent(html)
    const videoUrls = extractVideoUrls(html, pageUrl)

    const albumIdMatch = ALBUM_ID_RE.exec(html)
    const albumKeyMatch = ALBUM_KEY_RE.exec(html)
    let albumOverride = null
    if (albumIdMatch && albumKeyMatch) {
      const albumId = albumIdMatch[1]
      const albumKey = albumKeyMatch[1]
      if (!seenAlbumKeys.has(albumKey)) {
        seenAlbumKeys.add(albumKey)
        const { images: albumImages, albumMeta } = await fetchAlbumImages({
          origin,
          albumId,
          albumKey,
          refererUrl: pageUrl,
          fetchJson,
          maxAlbumPages,
        })
        const seenIdentity = new Set()
        const assetRefs = []
        for (const img of albumImages) {
          const url = pickImageUrl(img)
          if (!url) continue
          const identity = imageIdentity(url)
          if (seenIdentity.has(identity)) continue
          seenIdentity.add(identity)
          assetRefs.push({ remoteUrl: url, caption: pickCaption(img) })
        }
        // Protected albums return stat:"fail" (zero images) — skip them rather
        // than creating an empty collection.
        if (assetRefs.length) {
          const description = albumMeta?.Description || ''
          const { name: derivedName } = inferCollectionName(pageUrl, origin)
          collections.push({
            id: albumKey,
            name: albumMeta?.Title || derivedName,
            remoteUrl: pageUrl,
            description,
            assetRefs,
          })
          albumOverride = { collectionId: albumKey, description }
        }
      }
    }

    pageRecords.push({
      url: pageUrl,
      title: extractTitle(html),
      wordCount: content.wordCount,
      imageCount: images.length,
      hasForm: content.hasForm,
      hasMailto: content.hasMailto,
      text: content.text,
      videoUrls,
      _albumOverride: albumOverride,
    })

    for (const link of links) {
      if (isSameDomain(link, origin) && !visited.has(link) && !queue.includes(link)) queue.push(link)
    }
  }

  if (!visited.size) throw new NotSmugMugError('no pages fetched')

  // buildSiteMap derives collectionId from the page's URL, which has no relation
  // to a SmugMug album's identity (albumKey). Patch album pages after the fact so
  // their collectionId matches the collection built above, and thread the album's
  // Description through as textContent — composer.js's firstParagraphDescription
  // turns that into the composed gallery page's description.
  const siteMap = buildSiteMap({
    pageRecords: pageRecords.map(({ _albumOverride, ...rec }) => rec),
    origin,
    navLinks: navLinks || [],
  })
  const overrideByUrl = new Map(pageRecords.filter((r) => r._albumOverride).map((r) => [r.url, r._albumOverride]))
  siteMap.pages = siteMap.pages.map((page) => {
    const override = overrideByUrl.get(page.sourceUrl)
    if (!override) return page
    return { ...page, kind: 'gallery', collectionId: override.collectionId, textContent: override.description || '' }
  })

  return {
    site: { title: siteTitle || seed.hostname, url: startUrl },
    collections,
    siteMap,
  }
}

const smugmugWeb = {
  id: PROVIDER_ID,
  label: 'SmugMug',
  icon: 'smugmug',
  enabled: true,
  // Content-based only — never selected by the URL-only registry `detect()`
  // contract. discover.js calls this adapter directly as part of its
  // generic-crawler fallback chain.
  detect() {
    return false
  },
  discover,
}
export default smugmugWeb
