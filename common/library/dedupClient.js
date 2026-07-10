import { assetsMissingHash, groupDuplicates } from '@/common/library/dedup'
import { consolidate } from '@/common/library/consolidate'

function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export async function backfillHashes(assets, { onProgress, batchSize = 20, signal } = {}) {
  const todo = assetsMissingHash(assets)
  const total = todo.length
  const hashes = {}
  const failed = []
  let done = 0
  for (const batch of chunk(todo, batchSize)) {
    if (signal?.aborted) break
    let res
    try {
      res = await fetch('/api/admin/dedup/hash-batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: batch }), signal,
      })
    } catch (err) {
      if (signal?.aborted) break // cancelled mid-flight — return what we have
      throw err
    }
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
