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

  return { images: [...images], links: [...links] }
}

