import { assetsMissingHash, groupDuplicates } from '@/common/library/dedup'
import { consolidate } from '@/common/library/consolidate'

function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export async function backfillHashes(assets, { onProgress, batchSize = 20 } = {}) {
  const todo = assetsMissingHash(assets)
  const total = todo.length
  const hashes = {}
  const failed = []
  let done = 0
  for (const batch of chunk(todo, batchSize)) {
    const res = await fetch('/api/admin/dedup/hash-batch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: batch }),
    })
    const data = await res.json().catch(() => ({}))
    for (const h of data.hashed || []) hashes[h.assetId] = h.hash
    for (const f of data.failed || []) failed.push(f)
    done += batch.length
    if (onProgress) onProgress({ done, total })
  }
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
  await fetch('/api/admin/library', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assets: nextLib.assets, galleries: nextLib.galleries, portfolios: nextLib.portfolios, sets: nextLib.sets, assetOrder: nextLib.assetOrder }),
  })
  if (siteChanged) {
    await fetch('/api/admin/site-config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextSite),
    })
  }
  if (deleteUrls.length) {
    await fetch('/api/admin/dedup/delete-files', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: deleteUrls }),
    })
  }
  return { mergedCount: deleteUrls.length, groupCount: decisions.length, deletedFiles: deleteUrls.length }
}

export { groupDuplicates }
