import { groupDuplicates } from '@/common/library/dedup'
import { consolidate } from '@/common/library/consolidate'

function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

// Fingerprint the whole library from a single storage listing (R2 ETags = MD5),
// with NO image downloads. Returns { [assetId]: etag } for every asset whose
// object is present in storage — used to (re)assign `hashes.exact` consistently
// so grouping compares like-for-like. Near-instant regardless of library size.
export async function backfillHashes(assets, { onProgress, signal } = {}) {
  const total = Object.keys(assets || {}).length
  if (onProgress) onProgress({ done: 0, total })

  let data = {}
  try {
    const res = await fetch('/api/admin/dedup/storage-hashes', { signal })
    data = await res.json().catch(() => ({}))
  } catch (err) {
    if (signal?.aborted) return { hashes: {}, failed: [] }
    throw err
  }

  const urlToEtag = data.hashes || {}
  const hashes = {}
  const failed = []
  for (const asset of Object.values(assets || {})) {
    const etag = urlToEtag[asset.publicUrl]
    if (etag) hashes[asset.assetId] = etag
    else failed.push({ assetId: asset.assetId, reason: 'no storage fingerprint' })
  }

  if (onProgress) onProgress({ done: total, total })
  return { hashes, failed }
}

export function applyHashes(libraryConfig, hashes) {
  const assets = { ...(libraryConfig.assets || {}) }
  for (const [assetId, hash] of Object.entries(hashes || {})) {
    if (!assets[assetId]) continue
    assets[assetId] = { ...assets[assetId], hashes: { ...(assets[assetId].hashes || {}), exact: hash } }
  }
  return { ...libraryConfig, assets }
}

export async function runConsolidation({ libraryConfig, siteConfig, decisions }) {
  const { libraryConfig: nextLib, siteConfig: nextSite, deleteUrls, siteChanged } = consolidate(libraryConfig, siteConfig, decisions)
  const libRes = await fetch('/api/admin/library', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assets: nextLib.assets, galleries: nextLib.galleries, portfolios: nextLib.portfolios, sets: nextLib.sets, assetOrder: nextLib.assetOrder }),
  })
  if (!libRes.ok) {
    throw new Error('Failed to save the library (HTTP ' + libRes.status + ')')
  }
  if (siteChanged) {
    const siteRes = await fetch('/api/admin/site-config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextSite),
    })
    if (!siteRes.ok) {
      throw new Error('Failed to save the site (HTTP ' + siteRes.status + ')')
    }
  }
  let deletedFiles = 0
  let failedDeletes = 0
  if (deleteUrls.length) {
    for (const batch of chunk(deleteUrls, 200)) {
      let data = {}
      try {
        const delRes = await fetch('/api/admin/dedup/delete-files', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: batch }),
        })
        data = await delRes.json().catch(() => ({}))
      } catch { /* delete failures are non-fatal */ }
      deletedFiles += data.deleted || 0
      failedDeletes += batch.length - (data.deleted || 0)
    }
  }
  return { mergedCount: deleteUrls.length, groupCount: decisions.length, deletedFiles, failedDeletes }
}

export { groupDuplicates }
