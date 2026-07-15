const LABELS = { manual: 'Uploaded', smugmug: 'SmugMug' }

export function providerOf(asset) {
  const provider = asset?.source?.provider || 'manual'
  // For generic web imports, use the site label (e.g. 'swamifoto.com') as the
  // identifier so the sidebar shows the actual source instead of a generic "Website".
  if (provider === 'generic') return asset?.source?.label || 'Website'
  return provider
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
