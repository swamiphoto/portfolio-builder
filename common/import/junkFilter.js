const JUNK_PATTERNS = /(sprite|favicon|logo|icon|avatar|placeholder|spacer|pixel|1x1|blank)/i

export function filterJunkImages(refs, { totalPages = 1, repeatRatio = 0.5 } = {}) {
  const threshold = totalPages >= 4 ? Math.ceil(totalPages * repeatRatio) : Infinity
  return (refs || []).filter((r) => {
    if (JUNK_PATTERNS.test(r.remoteUrl)) return false
    // Strictly MORE than the ratio, not >=: a legit album photo that shows up on
    // both the root page (whole-site JSON dumps, e.g. SmugMug) and its own album
    // page sits exactly at the 50% boundary on a 4-page crawl and must survive —
    // only images that repeat on a clear majority of pages are site chrome.
    if ((r.seenOnPages || 1) > threshold) return false
    return true
  })
}

function titleCase(s) {
  return String(s || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

export function inferCollectionName(pageUrl, origin) {
  try {
    const u = new URL(pageUrl)
    const segs = u.pathname.split('/').filter(Boolean)
    if (!segs.length) return { id: 'home', name: new URL(origin).hostname }
    const raw = segs[segs.length - 1].replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')
    return { id: segs.join('/'), name: titleCase(raw) }
  } catch {
    return { id: 'home', name: 'Imported' }
  }
}

export function groupIntoCollections(refs, origin) {
  const map = new Map()
  for (const r of refs || []) {
    const { id, name } = inferCollectionName(r.pageUrl, origin)
    if (!map.has(id)) map.set(id, { id, name, remoteUrl: r.pageUrl, assetRefs: [] })
    map.get(id).assetRefs.push({ remoteUrl: r.remoteUrl, caption: r.caption || null })
  }
  return [...map.values()]
}
