import { newImportBatchId } from '@/common/import/importCore'

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

export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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

export function applyImportToConfig(config, { imported, collections }) {
  const nameById = {}
  for (const c of collections || []) nameById[c.id] = c.name

  const assets = { ...(config.assets || {}) }
  const galleries = { ...(config.galleries || {}) }
  const urlsByCollection = {}

  for (const asset of imported || []) {
    assets[asset.assetId] = { ...(config.assets?.[asset.assetId] || {}), ...asset }
    const cid = asset.source?.externalCollectionId
    if (cid == null) continue
    ;(urlsByCollection[cid] = urlsByCollection[cid] || []).push(asset.publicUrl)
  }

  for (const [cid, urls] of Object.entries(urlsByCollection)) {
    const slug = slugify(nameById[cid] || cid)
    if (!slug) continue
    galleries[slug] = [...new Set([...(galleries[slug] || []), ...urls])]
  }

  return { portfolios: config.portfolios || {}, galleries, assets }
}
