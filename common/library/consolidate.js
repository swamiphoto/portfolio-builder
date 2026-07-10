// common/library/consolidate.js
function uniq(arr) {
  return [...new Set(arr)]
}

function mergeUsage(a = {}, b = {}) {
  const merged = {
    cover: !!(a.cover || b.cover),
    pageIds: uniq([...(a.pageIds || []), ...(b.pageIds || [])]),
    galleryIds: uniq([...(a.galleryIds || []), ...(b.galleryIds || [])]),
    blockIds: uniq([...(a.blockIds || []), ...(b.blockIds || [])]),
    lastUsedAt: a.lastUsedAt || b.lastUsedAt || null,
  }
  merged.usageCount = merged.pageIds.length + merged.galleryIds.length + merged.blockIds.length
  return merged
}

function rewriteImageRef(ref, urlMap, idMap) {
  if (!ref || typeof ref !== 'object') return ref
  const next = { ...ref }
  if (next.url && urlMap.has(next.url)) next.url = urlMap.get(next.url)
  if (next.assetId && idMap.has(next.assetId)) next.assetId = idMap.get(next.assetId)
  return next
}
function refKey(ref) {
  return ref && typeof ref === 'object' ? ref.url || '' : ref
}

export function consolidate(libraryConfig, siteConfig, decisions) {
  const urlMap = new Map() // redundant publicUrl -> canonical publicUrl
  const idMap = new Map()  // redundant assetId   -> canonical assetId
  const deleteUrls = []
  const redundantIds = new Set()
  const assets = { ...(libraryConfig.assets || {}) }

  // 1. Build maps + union metadata onto the canonical.
  for (const { canonicalId, redundantIds: reds } of decisions || []) {
    const canonical = { ...(assets[canonicalId] || {}) }
    canonical.setIds = [...(canonical.setIds || [])]
    canonical.tags = [...(canonical.tags || [])]
    for (const rid of reds || []) {
      const red = assets[rid]
      if (!red) continue
      redundantIds.add(rid)
      idMap.set(rid, canonicalId)
      if (red.publicUrl) {
        urlMap.set(red.publicUrl, canonical.publicUrl)
        deleteUrls.push(red.publicUrl)
      }
      canonical.setIds = uniq([...canonical.setIds, ...(red.setIds || [])])
      canonical.tags = uniq([...canonical.tags, ...(red.tags || [])])
      canonical.usage = mergeUsage(canonical.usage, red.usage)
      if (!canonical.caption && red.caption) canonical.caption = red.caption
      if (!canonical.alt && red.alt) canonical.alt = red.alt
    }
    assets[canonicalId] = canonical
  }
  for (const rid of redundantIds) delete assets[rid]

  // 2. assetOrder + assetIdByUrl.
  const assetOrder = uniq((libraryConfig.assetOrder || []).map((id) => idMap.get(id) || id)).filter((id) => assets[id])
  const assetIdByUrl = {}
  for (const [url, id] of Object.entries(libraryConfig.assetIdByUrl || {})) {
    if (urlMap.has(url)) continue // redundant url is going away
    assetIdByUrl[url] = idMap.get(id) || id
  }

  // 3. galleries + portfolios (URL arrays).
  const rewriteUrlArray = (arr) => uniq((arr || []).map((u) => urlMap.get(u) || u))
  const galleries = {}
  for (const [k, v] of Object.entries(libraryConfig.galleries || {})) galleries[k] = rewriteUrlArray(v)
  const portfolios = {}
  for (const [k, v] of Object.entries(libraryConfig.portfolios || {})) portfolios[k] = rewriteUrlArray(v)

  // 4. sets (assetId arrays).
  const sets = {}
  for (const [k, s] of Object.entries(libraryConfig.sets || {})) {
    sets[k] = { ...s, assetIds: uniq((s.assetIds || []).map((id) => idMap.get(id) || id)) }
  }

  const nextLibrary = { ...libraryConfig, assets, assetOrder, assetIdByUrl, galleries, portfolios, sets }

  // 5. site config pages/blocks.
  let siteChanged = false
  const rewriteMulti = (refs) => {
    const seen = new Set()
    const out = []
    for (const r of refs || []) {
      const nr = rewriteImageRef(r, urlMap, idMap)
      const key = refKey(nr)
      if (key && seen.has(key)) continue
      if (key) seen.add(key)
      out.push(nr)
    }
    return out
  }
  const nextSite = siteConfig
    ? {
        ...siteConfig,
        cover: siteConfig.cover ? rewriteImageRef(siteConfig.cover, urlMap, idMap) : siteConfig.cover,
        pages: (siteConfig.pages || []).map((page) => ({
          ...page,
          blocks: (page.blocks || []).map((block) => {
            const b = { ...block }
            if (b.image) b.image = rewriteImageRef(b.image, urlMap, idMap)
            if (typeof b.imageUrl === 'string' && urlMap.has(b.imageUrl)) b.imageUrl = urlMap.get(b.imageUrl)
            if (Array.isArray(b.images)) b.images = rewriteMulti(b.images)
            if (Array.isArray(b.imageUrls)) b.imageUrls = uniq(b.imageUrls.map((u) => urlMap.get(u) || u))
            if (JSON.stringify(b) !== JSON.stringify(block)) siteChanged = true
            return b
          }),
        })),
      }
    : siteConfig

  return { libraryConfig: nextLibrary, siteConfig: nextSite, deleteUrls, siteChanged }
}
