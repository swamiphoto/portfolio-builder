// pages/api/admin/import/fetch-batch.js
//
// Workhorse batch-import endpoint.
// POST { importBatchId, provider, label, assetRefs: [{ remoteUrl, caption, externalCollectionId }] }
// → 200 { imported: assetRecord[], failed: [{ remoteUrl, reason }], skipped: string[] }
//
// Per-ref failures are caught and pushed to `failed`; they never abort the batch.
// This route does NOT write the library config — the client merges + PUTs.

import fetch from 'node-fetch'
import { withAuth } from '@/common/withAuth'
import { downloadJSON } from '@/common/gcsClient'
import { storeImageBuffer } from '@/common/storeImage'
import { buildImportedAsset, existingSourceUrls, dedupeRefs } from '@/common/import/importCore'

function configKey(userId) {
  return `users/${userId}/library-config.json`
}

function filenameFromUrl(remoteUrl) {
  try {
    const p = new URL(remoteUrl).pathname.split('/').filter(Boolean).pop() || 'image.jpg'
    return /\.[a-z0-9]+$/i.test(p) ? p : `${p}.jpg`
  } catch {
    return 'image.jpg'
  }
}

async function handler(req, res, user) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { importBatchId, provider, label, assetRefs } = req.body || {}
  if (!Array.isArray(assetRefs) || !provider) {
    return res.status(400).json({ error: 'provider and assetRefs are required' })
  }

  // Read existing library config for dedupe; tolerate absence (new user, no config yet).
  let existing = new Set()
  try {
    existing = existingSourceUrls(await downloadJSON(configKey(user.id)))
  } catch {
    // no config yet — nothing to dedupe against
  }

  const { fresh, skipped } = dedupeRefs(assetRefs, existing)

  const now = new Date().toISOString()
  const imported = []
  const failed = []

  for (const ref of fresh) {
    try {
      const resp = await fetch(ref.remoteUrl, { redirect: 'follow' })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const contentType = resp.headers.get('content-type') || 'image/jpeg'
      if (!contentType.startsWith('image/')) {
        throw new Error(`not an image (${contentType})`)
      }

      const buffer = Buffer.from(await resp.arrayBuffer())

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
