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

// Page-link discovery from inline <script> JSON. SmugMug custom-domain sites
// (and other JS-rendered builders) draw their nav entirely with JavaScript —
// the raw HTML has zero <a href> page links. The subpages only exist in the
// hydration JSON, as "UrlPath":"\/India" entries (escaped slashes) or as
// absolute same-origin page URLs.
const URL_PATH_RE = /"[Uu]rlPath"\s*:\s*"([^"]*)"/g
const ABS_URL_RE = /https?:\/\/[^\s"'\\<>)]+/g
// Anything asset-shaped must not enter the crawl queue (images/video/css/js/fonts...).
const ASSET_EXT_RE = /\.(?:jpe?g|png|webp|gif|avif|svg|ico|css|js|mjs|json|xml|map|woff2?|ttf|otf|eot|mp4|webm|mov|m4v|mp3|wav|pdf|zip)$/i
export const MAX_SCRIPT_LINKS_PER_PAGE = 60

function pageLinksFromText(text, baseUrl) {
  if (!text) return []
  let origin
  try {
    origin = new URL(baseUrl).origin
  } catch {
    return []
  }
  const unescaped = unescapeSlashes(text)
  const out = []
  URL_PATH_RE.lastIndex = 0
  let m
  while ((m = URL_PATH_RE.exec(unescaped))) {
    const p = m[1].trim()
    if (!p || p === '/') continue
    const resolved = safeResolve(p, baseUrl)
    if (resolved) out.push(resolved.split('#')[0])
  }
  for (const raw of unescaped.match(ABS_URL_RE) || []) {
    try {
      const u = new URL(raw)
      // Same-origin only: cross-origin absolutes are CDNs/trackers, never our pages.
      if (u.origin !== origin) continue
      if (u.pathname === '/' || u.pathname === '') continue
      if (ASSET_EXT_RE.test(u.pathname)) continue
      out.push(u.toString().split('#')[0])
    } catch {
      // unparseable fragment picked up by the loose regex — skip
    }
  }
  return out
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
  // The same pass also collects candidate same-origin PAGE links (UrlPath keys,
  // absolute non-asset URLs) so JS-rendered navs without <a href> tags are still
  // crawlable; capped per page to bound noise — junk pages are filtered
  // downstream by classification anyway.
  const scriptLinks = new Set()
  $('script').each((_, el) => {
    const text = $(el).html() || ''
    if (text.length > 8_000_000) return
    for (const u of imageUrlsFromText(text)) addImage(u)
    for (const l of pageLinksFromText(text, baseUrl)) {
      if (scriptLinks.size >= MAX_SCRIPT_LINKS_PER_PAGE) break
      scriptLinks.add(l)
    }
  })
  for (const l of scriptLinks) links.add(l)

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

// Ordered, typed content outline for a page — the deterministic signal the
// structural mapper reads. Document order is preserved; image nodes get stable
// `img-N` refs so a mapper can reference an image without handling its URL.
export function extractPageOutline(html, baseUrl) {
  const $ = cheerio.load(String(html || ''))
  $('script, style, noscript, nav, header, footer, svg').remove()
  const scope = $('main').length ? $('main').first() : $('body')
  const nodes = []
  let imgN = 0
  const captionFor = (el) => {
    const fig = $(el).closest('figure')
    const cap = fig.length ? fig.find('figcaption').first().text() : ''
    return (cap || $(el).attr('alt') || $(el).attr('title') || '').replace(/\s+/g, ' ').trim()
  }
  // A "card" is an <a> that wraps an <img> and points at a same-page-family URL.
  const cardGroups = []
  $('a').each((_, a) => {
    const $a = $(a)
    if (!$a.find('img').length) return
    const href = safeResolve($a.attr('href'), baseUrl)
    if (!href) return
    // A card links to a PAGE, not an asset. Lightbox anchors that point at an
    // image file (e.g. <a href="photo-large.jpg">) are not link cards.
    try {
      if (ASSET_EXT_RE.test(new URL(href).pathname)) return
    } catch {
      return
    }
    const label = $a.text().replace(/\s+/g, ' ').trim()
    const parentKey = $a.parent().index() + ':' + ($a.parent().prop('tagName') || '')
    let group = cardGroups.find((g) => g.key === parentKey)
    if (!group) { group = { key: parentKey, items: [], anchor: a, anchors: [] }; cardGroups.push(group) }
    group.items.push({ href: href.split('#')[0], label })
    group.anchors.push(a)
  })
  const cardAnchorSet = new Set()
  for (const g of cardGroups) if (g.items.length >= 2) for (const a of g.anchors) cardAnchorSet.add(a)

  scope.find('img, h1, h2, h3, p, blockquote, a').each((_, el) => {
    const tag = (el.tagName || '').toLowerCase()
    if (tag === 'img') {
      // Link-card thumbnails belong only to their linkcards node; skip them here
      // so they don't also render as standalone images downstream.
      if (cardAnchorSet.has($(el).closest('a').get(0))) return
      const src = safeResolve($(el).attr('src') || $(el).attr('data-src'), baseUrl)
      if (!src || src.startsWith('data:')) return
      imgN += 1
      nodes.push({ kind: 'image', ref: `img-${imgN}`, src, caption: captionFor(el) })
    } else if (tag === 'a') {
      if (!cardAnchorSet.has(el)) return
      const g = cardGroups.find((gr) => gr.anchor === el)
      if (g && !nodes.some((n) => n.kind === 'linkcards' && n._key === g.key)) {
        nodes.push({ kind: 'linkcards', _key: g.key, items: g.items })
      }
    } else if (tag === 'blockquote') {
      const cite = $(el).find('cite').first().text().replace(/\s+/g, ' ').trim()
      const text = $(el).clone().find('cite').remove().end().text().replace(/\s+/g, ' ').trim()
      if (text) nodes.push({ kind: 'quote', text, attribution: cite })
    } else if (tag === 'p') {
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      if (text) nodes.push({ kind: 'paragraph', text })
    } else {
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      if (text) nodes.push({ kind: 'heading', level: Number(tag[1]), text })
    }
  })
  return nodes.map(({ _key, ...n }) => n)
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

