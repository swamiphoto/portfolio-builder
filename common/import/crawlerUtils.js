import * as cheerio from 'cheerio'

export function normalizeUrl(input) {
  const s = String(input || '').trim()
  if (!s) return null
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    return new URL(withProto).toString()
  } catch {
    return null
  }
}

export function isSameDomain(url, origin) {
  try {
    return new URL(url).origin === new URL(origin).origin
  } catch {
    return false
  }
}

export function extractTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html || ''))
  return m ? m[1].trim() : null
}

function safeResolve(href, base) {
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

// Inline JSON blobs (__NEXT_DATA__, JSON-LD, hydration state) often escape the
// slashes in URLs. Normalize the common forms so a plain URL regex can match.
function unescapeSlashes(text) {
  return String(text || '')
    .replace(/\\u002[fF]/g, '/')
    .replace(/\\\//g, '/')
}

const IMG_URL_RE = /https?:\/\/[^\s"'\\<>)]+?\.(?:jpe?g|png|webp|gif|avif)(?:\?[^\s"'\\<>)]*)?/gi

// Recover absolute image URLs embedded in inline <script> JSON (the photos on
// JS-rendered galleries that never appear as <img> before hydration).
function imageUrlsFromText(text) {
  if (!text) return []
  return unescapeSlashes(text).match(IMG_URL_RE) || []
}

function largestFromSrcset(srcset) {
  const candidates = String(srcset || '')
    .split(',')
    .map((part) => part.trim().split(/\s+/))
    .map(([url, descriptor]) => ({ url, w: parseInt(descriptor, 10) || 0 }))
    .filter((c) => c.url)
  if (!candidates.length) return null
  candidates.sort((a, b) => b.w - a.w)
  return candidates[0].url
}

export function extractImageUrls(html, baseUrl) {
  const $ = cheerio.load(String(html || ''))
  const images = new Set()
  const links = new Set()
  const addImage = (raw) => {
    if (!raw) return
    const resolved = safeResolve(raw, baseUrl)
    if (resolved && !resolved.startsWith('data:')) images.add(resolved)
  }

  $('img').each((_, el) => {
    addImage($(el).attr('src'))
    addImage($(el).attr('data-src'))
    const srcset = $(el).attr('srcset')
    if (srcset) addImage(largestFromSrcset(srcset))
  })
  $('source[srcset]').each((_, el) => addImage(largestFromSrcset($(el).attr('srcset'))))
  $('meta[property="og:image"], meta[name="og:image"]').each((_, el) => addImage($(el).attr('content')))
  $('[style*="background-image"]').each((_, el) => {
    const m = /url\(['"]?([^'")]+)['"]?\)/.exec($(el).attr('style') || '')
    if (m) addImage(m[1])
  })
  $('a[href]').each((_, el) => {
    const resolved = safeResolve($(el).attr('href'), baseUrl)
    if (resolved) links.add(resolved.split('#')[0])
  })

  // Photos embedded in inline JSON (e.g. Next.js __NEXT_DATA__) — scan inline
  // <script> contents for absolute image URLs. External <script src> tags have
  // no inline text, so bundle internals are not scanned. Junk (logos, tracking
  // pixels) is removed downstream by the junk filter.
  $('script').each((_, el) => {
    const text = $(el).html() || ''
    if (text.length > 8_000_000) return
    for (const u of imageUrlsFromText(text)) addImage(u)
  })

  return { images: [...images], links: [...links] }
}

