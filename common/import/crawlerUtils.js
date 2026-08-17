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

// Prose + signals for page classification. Chrome elements (nav/header/footer)
// and non-content tags are removed so wordCount reflects actual page copy.
export function extractPageContent(html) {
  const $ = cheerio.load(String(html || ''))
  const hasForm = $('form').length > 0
  const hasMailto = $('a[href^="mailto:"]').length > 0
  $('script, style, noscript, nav, header, footer, svg').remove()
  const scope = $('main').length ? $('main') : $('body')
  const paras = []
  scope.find('p, h1, h2, h3, blockquote, li').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim()
    if (t) paras.push(t)
  })
  let text = paras.join('\n\n')
  if (!text) text = scope.text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim()
  const wordCount = text ? text.split(/\s+/).length : 0
  return { text, wordCount, hasForm, hasMailto }
}

const MAX_VIDEO_URLS = 10

function hostMatches(hostname, suffix) {
  return hostname === suffix || hostname.endsWith(`.${suffix}`)
}

function youtubeIdFromEmbed(url) {
  try {
    const u = new URL(url)
    if (!hostMatches(u.hostname, 'youtube.com') && !hostMatches(u.hostname, 'youtube-nocookie.com')) return null
    const m = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

function youtubeIdFromWatch(url) {
  try {
    const u = new URL(url)
    if (!hostMatches(u.hostname, 'youtube.com') || u.pathname !== '/watch') return null
    return u.searchParams.get('v')
  } catch {
    return null
  }
}

function youtubeIdFromShort(url) {
  try {
    const u = new URL(url)
    if (!hostMatches(u.hostname, 'youtu.be')) return null
    return u.pathname.split('/').filter(Boolean)[0] || null
  } catch {
    return null
  }
}

function vimeoIdFromPlayer(url) {
  try {
    const u = new URL(url)
    if (!hostMatches(u.hostname, 'player.vimeo.com')) return null
    const m = u.pathname.match(/^\/video\/(\d+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

function vimeoIdFromLink(url) {
  try {
    const u = new URL(url)
    if (!hostMatches(u.hostname, 'vimeo.com') || hostMatches(u.hostname, 'player.vimeo.com')) return null
    const m = u.pathname.match(/^\/(\d+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

// YouTube/Vimeo links embedded as <iframe src> (embed players) or <a href>
// (plain links). Every form is normalized to a canonical watch/vimeo URL so
// the same video reached two different ways dedupes to one entry.
export function extractVideoUrls(html, baseUrl) {
  const $ = cheerio.load(String(html || ''))
  const found = []
  const addYoutube = (id) => { if (id) found.push(`https://www.youtube.com/watch?v=${id}`) }
  const addVimeo = (id) => { if (id) found.push(`https://vimeo.com/${id}`) }

  $('iframe[src]').each((_, el) => {
    const resolved = safeResolve($(el).attr('src'), baseUrl)
    if (!resolved) return
    addYoutube(youtubeIdFromEmbed(resolved))
    addVimeo(vimeoIdFromPlayer(resolved))
  })
  $('a[href]').each((_, el) => {
    const resolved = safeResolve($(el).attr('href'), baseUrl)
    if (!resolved) return
    addYoutube(youtubeIdFromWatch(resolved) || youtubeIdFromShort(resolved))
    addVimeo(vimeoIdFromLink(resolved))
  })

  return [...new Set(found)].slice(0, MAX_VIDEO_URLS)
}

export function extractNavLinks(html, baseUrl) {
  const $ = cheerio.load(String(html || ''))
  const out = []
  const seen = new Set()
  $('header a[href], nav a[href]').each((_, el) => {
    const resolved = safeResolve($(el).attr('href'), baseUrl)
    if (!resolved) return
    const href = resolved.split('#')[0]
    if (seen.has(href)) return
    seen.add(href)
    out.push({ href, label: $(el).text().replace(/\s+/g, ' ').trim() })
  })
  return out
}

