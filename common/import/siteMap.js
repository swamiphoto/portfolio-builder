import { inferCollectionName } from './junkFilter'
import { slugify } from './importCore'

const ABOUT_RE = /(^|\b)(about|bio|info)(\b|$)/i
const CONTACT_RE = /(^|\b)(contact|hire|book|booking)(\b|$)/i

function lastSegment(url) {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).pop() || ''
  } catch {
    return ''
  }
}

// Deterministic, ordered rules — no AI. Slug/nav intent wins over composition.
export function classifyPage({ url, navLabel, wordCount = 0, imageCount = 0, hasForm = false, hasMailto = false }) {
  const seg = lastSegment(url).replace(/[-_]+/g, ' ')
  const label = String(navLabel || '')
  if (ABOUT_RE.test(seg) || ABOUT_RE.test(label)) return 'about'
  if (CONTACT_RE.test(seg) || CONTACT_RE.test(label)) return 'contact'
  if ((hasForm || hasMailto) && wordCount < 150 && imageCount <= 2) return 'contact'
  if (imageCount >= 8 && wordCount < 200) return 'gallery'
  if (wordCount >= 150 && imageCount <= 2) return 'about'
  if (imageCount >= 4) return 'gallery'
  return 'other'
}

// Title preference: nav label → cleaned collection name → <title> tag.
export function buildSiteMap({ pageRecords, origin, navLinks = [] }) {
  const navByHref = new Map()
  navLinks.forEach((l, i) => {
    const href = l.href.replace(/\/+$/, '')
    if (!navByHref.has(href)) navByHref.set(href, { order: navByHref.size, label: l.label })
  })
  const pages = []
  for (const rec of pageRecords || []) {
    const nav = navByHref.get(rec.url.replace(/\/+$/, '')) || null
    const kind = classifyPage({ ...rec, navLabel: nav?.label })
    const { id: collectionId, name } = inferCollectionName(rec.url, origin)
    const isRoot = collectionId === 'home'
    const title = isRoot ? 'Home' : nav?.label || name || rec.title || 'Untitled'
    const keepText = kind === 'about' || (kind === 'gallery' && (rec.wordCount ?? 0) < 200)
    pages.push({
      kind,
      title,
      slug: isRoot ? 'home' : slugify(title) || slugify(collectionId) || 'page',
      navOrder: nav ? nav.order : null,
      sourceUrl: rec.url,
      textContent: keepText ? rec.text || '' : '',
      collectionId,
      videoUrls: rec.videoUrls || [],
      outline: rec.outline || [],
    })
  }
  return { pages }
}
