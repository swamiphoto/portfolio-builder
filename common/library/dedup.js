export function assetsMissingHash(assets) {
  const out = []
  for (const asset of Object.values(assets || {})) {
    if (!asset?.hashes?.exact) out.push({ assetId: asset.assetId, url: asset.publicUrl })
  }
  return out
}

export function groupDuplicates(assets) {
  const byHash = new Map()
  for (const asset of Object.values(assets || {})) {
    const h = asset?.hashes?.exact
    if (!h) continue
    if (!byHash.has(h)) byHash.set(h, [])
    byHash.get(h).push(asset.assetId)
  }
  const groups = []
  for (const [hash, assetIds] of byHash) {
    if (assetIds.length >= 2) groups.push({ hash, assetIds })
  }
  return groups
}

export function chooseCanonical(assets, assetIds) {
  const score = (id) => {
    const a = assets[id] || {}
    return { count: a.usage?.usageCount || 0, created: a.createdAt || '', id }
  }
  return [...assetIds].sort((x, y) => {
    const sx = score(x)
    const sy = score(y)
    if (sy.count !== sx.count) return sy.count - sx.count // higher count first
    if (sx.created !== sy.created) return sx.created < sy.created ? -1 : 1 // older (smaller ISO) first
    return sx.id < sy.id ? -1 : 1 // smaller id first
  })[0]
}
