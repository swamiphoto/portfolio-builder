import { newImportBatchId, stableHash } from '@/common/import/importCore'

export { slugify } from '@/common/import/importCore'

export class ImportError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ImportError'
    this.status = status
    this.code = code
  }
}

export function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function makeImportBatchId(provider, input, nowMs) {
  return newImportBatchId(`${nowMs}|${provider}|${input}`)
}

async function readJson(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

export async function discoverSource(input, provider) {
  const res = await fetch('/api/admin/import/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, provider }),
  })
  const data = await readJson(res)
  if (!res.ok) throw new ImportError(data.message || 'We could not read that link.', res.status, data.error)
  return data
}

export async function importSelected({ provider, label, importBatchId, selectedCollections, batchSize = 8, onProgress }) {
  const refs = []
  for (const c of selectedCollections || []) {
    for (const r of c.assetRefs || []) refs.push({ ...r, externalCollectionId: c.id })
  }
  const total = refs.length
  const imported = []
  const failed = []
  const skipped = []
  let done = 0
  for (const batch of chunk(refs, batchSize)) {
    const res = await fetch('/api/admin/import/fetch-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importBatchId, provider, label, assetRefs: batch }),
    })
    const data = await readJson(res)
    if (!res.ok) throw new ImportError(data.message || 'The import ran into a problem.', res.status, data.error)
    imported.push(...(data.imported || []))
    failed.push(...(data.failed || []))
    skipped.push(...(data.skipped || []))
    done += batch.length
    if (onProgress) onProgress({ done, total, importedCount: imported.length, failedCount: failed.length })
  }
  return { imported, failed, skipped, total }
}

export function applyImportToConfig(config, { imported, collections, importBatchId, now }) {
  const nameById = {}
  for (const c of collections || []) nameById[c.id] = c.name

  const assets = { ...(config.assets || {}) }
  const sets = { ...(config.sets || {}) }
  // Tracks which setIds have already been cloned (or freshly created) in this
  // call, so we can safely mutate them in place without touching the
  // caller's original set objects (sets is only a shallow copy of config.sets).
  const owned = new Set()
  const ts = now || new Date().toISOString()

  const setForCollection = (cid) => {
    const name = nameById[cid] || cid
    const existing = Object.values(sets).find((s) => s?.name === name)
    if (existing) {
      if (!owned.has(existing.setId)) {
        sets[existing.setId] = { ...existing }
        owned.add(existing.setId)
      }
      return existing.setId
    }
    const setId = `set-${stableHash(`${importBatchId || ''}:${cid}`)}`
    sets[setId] = { setId, name, kind: 'manual', assetIds: [], rule: null, createdAt: ts, updatedAt: ts }
    owned.add(setId)
    return setId
  }

  for (const asset of imported || []) {
    const prev = config.assets?.[asset.assetId] || {}
    const merged = { ...prev, ...asset }
    const cid = asset.source?.externalCollectionId
    if (cid != null) {
      const setId = setForCollection(cid)
      const set = sets[setId]
      if (!set.assetIds.includes(asset.assetId)) set.assetIds = [...set.assetIds, asset.assetId]
      set.updatedAt = ts
      merged.setIds = [...new Set([...(prev.setIds || []), setId])]
    }
    assets[asset.assetId] = merged
  }

  return { ...config, assets, sets }
}
