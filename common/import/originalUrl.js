// Derivative → original URL rewrites for known platforms. Candidates are
// probed by the import fetcher and silently fall back to the discovered URL,
// so a wrong guess costs one failed request, never a failed import.
export function originalUrlCandidates(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return []
  }
  const out = []
  if (/squarespace/i.test(u.hostname)) {
    const orig = new URL(u.toString())
    orig.search = ''
    orig.searchParams.set('format', 'original')
    if (orig.toString() !== url) out.push(orig.toString())
  }
  if (/\/wp-content\/uploads\//.test(u.pathname)) {
    const stripped = u.pathname
      .replace(/-\d{2,4}x\d{2,4}(\.\w+)$/, '$1')
      .replace(/-scaled(\.\w+)$/, '$1')
    if (stripped !== u.pathname) out.push(`${u.origin}${stripped}${u.search}`)
  }
  return out
}

// SmugMug size codes, ordered smallest → largest. "O" (original) always wins.
// URL shape: https://photos.smugmug.com/<gallery-path>/i-<ImageKey>/<rev>/<hash>/<SIZE>/<name>-<SIZE>.jpg
const SMUGMUG_SIZE_ORDER = ['Ti', 'Th', 'S', 'M', 'L', 'XL', 'X2', 'X3', 'X4', 'X5', '4K', '5K', 'O']

function smugmugImageKey(url) {
  try {
    const { pathname } = new URL(url)
    const m = /\/(i-[A-Za-z0-9]+)(?:\/|$)/.exec(pathname)
    return m ? m[1] : null
  } catch {
    return null
  }
}

// SIZE shows up both as a path segment and as a "-SIZE" filename suffix — check
// the filename suffix first (cheaper, unambiguous), fall back to the path segment.
function smugmugSizeRank(url) {
  try {
    const { pathname } = new URL(url)
    const segs = pathname.split('/').filter(Boolean)
    const last = segs[segs.length - 1] || ''
    const suffixMatch = /-([A-Za-z0-9]+)\.[a-z0-9]+$/.exec(last)
    const suffixCode = suffixMatch ? suffixMatch[1] : null
    if (suffixCode && SMUGMUG_SIZE_ORDER.includes(suffixCode)) return SMUGMUG_SIZE_ORDER.indexOf(suffixCode)
    const segCode = segs[segs.length - 2]
    if (segCode && SMUGMUG_SIZE_ORDER.includes(segCode)) return SMUGMUG_SIZE_ORDER.indexOf(segCode)
    return -1
  } catch {
    return -1
  }
}

function wordpressDimensionArea(url) {
  try {
    const { pathname } = new URL(url)
    const m = /-(\d{2,5})x(\d{2,5})\.\w+$/.exec(pathname)
    if (!m) return null
    return Number(m[1]) * Number(m[2])
  } catch {
    return null
  }
}

// Strip WordPress-style "-WxH"/"-scaled" filename suffixes (mirrors the rewrite
// above) and common size/format query params, so resized copies of the same
// source image collapse onto one identity. Untouched URLs pass through as-is.
function strippedForm(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return url
  }
  const strippedPath = u.pathname
    .replace(/-\d{2,5}x\d{2,5}(\.\w+)$/, '$1')
    .replace(/-scaled(\.\w+)$/, '$1')
  const out = new URL(u.toString())
  out.pathname = strippedPath
  for (const key of ['format', 'w', 'h', 'width', 'height', 'size', 'fit']) out.searchParams.delete(key)
  return out.toString()
}

// A stable identity key for an image URL: URLs that are just different size or
// format variants of the SAME underlying photo collapse to the same key. Used by
// crawlers to dedupe discovered images before they become distinct asset refs.
export function imageIdentity(url) {
  const key = smugmugImageKey(url)
  if (key) return `smugmug:${key}`
  return strippedForm(url)
}

// Given two URLs that share an imageIdentity, return whichever is the "bigger"
// (more original) variant, so the crawler keeps the highest-quality copy. Falls
// back to keeping urlA on ties (stable — order of discovery is preserved).
export function preferLargerVariant(urlA, urlB) {
  const keyA = smugmugImageKey(urlA)
  const keyB = smugmugImageKey(urlB)
  if (keyA && keyB) {
    const rankA = smugmugSizeRank(urlA)
    const rankB = smugmugSizeRank(urlB)
    if (rankA !== rankB) return rankA > rankB ? urlA : urlB
    return urlA
  }
  const aIsOriginal = urlA === strippedForm(urlA)
  const bIsOriginal = urlB === strippedForm(urlB)
  if (aIsOriginal !== bIsOriginal) return aIsOriginal ? urlA : urlB
  const areaA = wordpressDimensionArea(urlA)
  const areaB = wordpressDimensionArea(urlB)
  if (areaA != null && areaB != null && areaA !== areaB) return areaA > areaB ? urlA : urlB
  return urlA
}
