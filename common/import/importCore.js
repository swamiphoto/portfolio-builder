import { createAssetIdFromUrl } from '@/common/adminConfig'

function stableHash(input) {
  let hash = 2166136261
  const s = String(input || '')
  for (let i = 0; i < s.length; i += 1) {
    hash ^= s.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}

export function newImportBatchId(seed) {
  return `imp_${stableHash(seed)}`
}

export function buildImportedAsset({
  url,
  width,
  height,
  provider,
  sourceUrl,
  label,
  externalCollectionId,
  importBatchId,
  caption,
  hash,
  capture,
  now,
}) {
  const ratio = width && height ? width / height : null
  return {
    assetId: createAssetIdFromUrl(url),
    publicUrl: url,
    caption: caption || '',
    createdAt: now,
    updatedAt: now,
    ...(width && height
      ? {
          width,
          height,
          aspectRatio: Number(ratio.toFixed(4)),
          orientation: ratio === 1 ? 'square' : ratio > 1 ? 'landscape' : 'portrait',
        }
      : {}),
    hashes: { exact: hash ?? null, perceptual: null },
    ...(capture ? { capture } : {}),
    source: {
      type: 'import',
      provider,
      label: label ?? null,
      sourceUrl: sourceUrl ?? null,
      importBatchId: importBatchId ?? null,
      externalAssetId: null,
      externalCollectionId: externalCollectionId ?? null,
      syncMode: null,
      lastSyncedAt: now,
    },
  }
}

export function existingSourceUrls(config) {
  const set = new Set()
  for (const asset of Object.values(config?.assets || {})) {
    const u = asset?.source?.sourceUrl
    if (u) set.add(u)
  }
  return set
}

export function dedupeRefs(assetRefs, existingUrls) {
  const fresh = []
  const skipped = []
  for (const ref of assetRefs || []) {
    if (existingUrls.has(ref.remoteUrl)) skipped.push(ref.remoteUrl)
    else fresh.push(ref)
  }
  return { fresh, skipped }
}
