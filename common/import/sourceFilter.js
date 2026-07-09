const LABELS = { manual: 'Uploaded', smugmug: 'SmugMug', generic: 'Website' }

export function providerOf(asset) {
  return asset?.source?.provider || 'manual'
}

export function sourceCounts(assets) {
  const acc = {}
  for (const asset of assets || []) {
    const p = providerOf(asset)
    acc[p] = (acc[p] || 0) + 1
  }
  return acc
}

export function sourceLabel(provider) {
  if (LABELS[provider]) return LABELS[provider]
  const s = String(provider || '')
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown'
}

export function matchesSource(asset, value) {
  if (value === 'all' || value == null) return true
  return providerOf(asset) === value
}
