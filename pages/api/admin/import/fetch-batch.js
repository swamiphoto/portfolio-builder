// pages/api/admin/import/fetch-batch.js
//
// Workhorse batch-import endpoint.
// POST { importBatchId, provider, label, assetRefs: [{ remoteUrl, caption, externalCollectionId }] }
// → 200 { imported: assetRecord[], failed: [{ remoteUrl, reason }], skipped: string[] }
//
// Per-ref failures are caught and pushed to `failed`; they never abort the batch.
// This route does NOT write the library config — the client merges + PUTs.

import { safeFetch } from '@/common/import/safeFetch'
import { originalUrlCandidates } from '@/common/import/originalUrl'
import { withAuth } from '@/common/withAuth'
import { downloadJSON } from '@/common/gcsClient'
import { storeImageBuffer } from '@/common/storeImage'
import { extractCapture } from '@/common/exifCapture'
import { buildImportedAsset, existingSourceUrls, dedupeRefs } from '@/common/import/importCore'
import { getUserLibraryConfigPath } from '@/common/gcsUser'

const MAX_BATCH = 50
const MAX_IMPORT_BYTES = 40 * 1024 * 1024

function filenameFromUrl(remoteUrl) {
  try {
    const p = new URL(remoteUrl).pathname.split('/').filter(Boolean).pop() || 'image.jpg'
    return /\.[a-z0-9]+$/i.test(p) ? p : `${p}.jpg`
  } catch {
    return 'image.jpg'
  }
}

async function fetchImage(url) {
  const resp = await safeFetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const contentType = resp.headers.get('content-type') || 'image/jpeg'
  if (!contentType.startsWith('image/')) throw new Error(`not an image (${contentType})`)
  const len = Number(resp.headers.get('content-length') || 0)
  if (len > MAX_IMPORT_BYTES) throw new Error('image too large')
  return { buffer: Buffer.from(await resp.arrayBuffer()), contentType }
}

async function handler(req, res, user) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { importBatchId, provider, label, assetRefs } = req.body || {}
  if (!Array.isArray(assetRefs) || !provider) {
    return res.status(400).json({ error: 'provider and assetRefs are required' })
  }
  if (assetRefs.length > MAX_BATCH) {
    return res.status(400).json({ error: 'batch too large', message: 'Import fewer photos at a time.' })
  }

  // Read existing library config for dedupe; tolerate absence (new user, no config yet).
  let existing = new Set()
  try {
    existing = existingSourceUrls(await downloadJSON(getUserLibraryConfigPath(user.id)))
  } catch {
    // no config yet — nothing to dedupe against
  }

  const { fresh, skipped } = dedupeRefs(assetRefs, existing)

  const now = new Date().toISOString()
  const imported = []
  const failed = []

  for (const ref of fresh) {
    try {
      let fetched = null
      for (const candidate of originalUrlCandidates(ref.remoteUrl)) {
        try {
          fetched = await fetchImage(candidate)
          break
        } catch {
          // candidate guess failed — fall back to the discovered URL
        }
      }
      if (!fetched) fetched = await fetchImage(ref.remoteUrl)
      const { buffer, contentType } = fetched

      // Best-effort — extractCapture never throws — must never fail the import.
      const capture = await extractCapture(buffer)

      const stored = await storeImageBuffer(user.id, {
        buffer,
        filename: filenameFromUrl(ref.remoteUrl),
        contentType,
        folder: 'photos/import',
      })

      imported.push(
        buildImportedAsset({
          url: stored.gcsUrl,
          width: stored.width,
          height: stored.height,
          provider,
          sourceUrl: ref.remoteUrl,
          label: label ?? null,
          externalCollectionId: ref.externalCollectionId ?? null,
          importBatchId: importBatchId ?? null,
          caption: ref.caption ?? '',
          hash: stored.hash,
          capture,
          now,
        })
      )
    } catch (err) {
      failed.push({ remoteUrl: ref.remoteUrl, reason: String(err?.message || err) })
    }
  }

  return res.status(200).json({ imported, failed, skipped })
}

export default withAuth(handler)
