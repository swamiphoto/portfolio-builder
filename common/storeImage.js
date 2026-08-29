// common/storeImage.js
// Shared helper: upload a raw image buffer to R2 (original + thumbnail + display),
// return { gcsUrl, objectPath, width, height }.
// Used by upload-file.js (manual upload) and fetch-batch (web import).

import crypto from 'crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3, BUCKET, PUBLIC_URL, downloadBuffer, deleteFile } from './gcsClient'
import { getUserPhotoPath, getUserPhotosPrefix } from './gcsUser'
import { extractCapture } from './exifCapture'

/**
 * Resolve the R2 object key for an upload.
 * Mirrors the original logic from pages/api/admin/upload-file.js.
 *
 * @param {string} userId
 * @param {string} filename - original filename (may contain spaces/special chars)
 * @param {string|undefined} folder - e.g. 'photos/import', 'library', or empty
 * @returns {string} R2 object key
 */
export function resolveUploadKey(userId, filename, folder) {
  const safeName = String(filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
  const normalizedFolder = (folder || '').replace(/^\/|\/$/g, '')
  const userPhotosPrefix = getUserPhotosPrefix(userId).replace(/\/$/, '')

  if (!normalizedFolder) {
    return getUserPhotoPath(userId, `library/${safeName}`)
  }

  if (normalizedFolder.startsWith(`${userPhotosPrefix}/`)) {
    return `${normalizedFolder}/${safeName}`
  }

  if (normalizedFolder.startsWith('photos/')) {
    return `${userPhotosPrefix}/${normalizedFolder.slice('photos/'.length)}/${safeName}`
  }

  return `${userPhotosPrefix}/${normalizedFolder}/${safeName}`
}

/**
 * Store an image buffer in R2: upload original, generate 600px thumbnail and
 * 1800px display variant, return metadata. Thumbnail/display failure is non-fatal.
 *
 * @param {string} userId
 * @param {{ buffer: Buffer, filename: string, contentType: string, folder?: string }} opts
 * @returns {Promise<{ gcsUrl: string, objectPath: string, width: number|null, height: number|null, hash: string }>}
 */
export async function storeImageBuffer(userId, { buffer, filename, contentType, folder }) {
  const key = resolveUploadKey(userId, filename, folder)

  // The PutObject ETag is the object's MD5 (single-part upload) — the same value
  // the object listing returns, so it's our exact-duplicate fingerprint and it's
  // free (no re-download to hash). Dequoted; null if the store didn't return one
  // (the duplicate scan backfills from the listing in that case).
  const put = await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }))
  const hash = String(put?.ETag || '').replace(/"/g, '') || null

  const { width, height } = await generateDerivatives(key, buffer)
  return { gcsUrl: `${PUBLIC_URL}/${key}`, objectPath: key, width, height, hash }
}

/**
 * Generate the thumbnail (600px) + display (1800px) variants for an object that
 * already lives in R2 at `key`, from its `buffer`. Returns { width, height }.
 * Thumbnail/display failure is non-fatal (returns nulls) so it never fails an
 * upload — but the display variant is required by page galleries and the library
 * lightbox (getSizedUrl(url,'display')), so a failure there shows blanks.
 * @param {string} key - the ORIGINAL object key (contains '/photos/')
 * @param {Buffer} buffer
 * @returns {Promise<{ width: number|null, height: number|null }>}
 */
export async function generateDerivatives(key, buffer) {
  const thumbKey = key.replace('/photos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg')
  const displayKey = key.replace('/photos/', '/display/').replace(/\.[^.]+$/, '.jpg')
  let width = null
  let height = null
  try {
    const img = sharp(buffer)
    const meta = await img.metadata()
    width = meta.width
    height = meta.height

    // clone() per variant so the two resizes don't chain on one sharp pipeline.
    const thumbBuffer = await img.clone().resize(600, null, { withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: thumbKey, Body: thumbBuffer, ContentType: 'image/jpeg' }))

    const displayBuffer = await img.clone().resize(1800, null, { withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: displayKey, Body: displayBuffer, ContentType: 'image/jpeg' }))
  } catch {
    // thumbnail / display failure is non-fatal
  }
  return { width, height }
}

/**
 * Finalize a DIRECT-to-R2 upload: the browser already PUT the original straight
 * to `objectPath` via a presigned URL (bypassing the function's 4.5 MB request
 * cap). The bytes never passed through us, so here we download the original,
 * fingerprint it, generate the thumbnail/display variants, and extract EXIF —
 * returning the same shape storeImageBuffer does, plus `capture`.
 *
 * SECURITY: `objectPath` comes from the client, so we reject anything outside the
 * caller's own photos prefix before touching it.
 *
 * @param {string} userId
 * @param {{ objectPath: string, contentType?: string }} opts
 * @returns {Promise<{ gcsUrl, objectPath, width, height, hash, capture }>}
 */
export async function finalizeStoredImage(userId, { objectPath, contentType }) {
  const prefix = getUserPhotosPrefix(userId) // users/{id}/photos/
  if (!objectPath || !objectPath.startsWith(prefix)) {
    const err = new Error('Forbidden: objectPath is outside your storage')
    err.code = 'FORBIDDEN'
    throw err
  }

  // The original is already in R2 (the browser PUT it directly), independent of
  // this call. If we can't finalize it, we must NOT leave it behind: the library
  // is listed straight from R2, so an un-finalized object would show up untagged
  // and metadata-less (the set-association happens client-side only for files
  // finalize returns successfully). So: retry, and on hard failure DELETE the
  // orphan and throw, restoring the old all-or-nothing behavior.
  const fail = async (msg) => {
    await deleteFile(objectPath).catch(() => {}) // best-effort cleanup
    const err = new Error(`Could not process the upload (${msg}). It was removed — please retry.`)
    err.code = 'PROCESS_FAILED'
    throw err
  }

  let buffer = null
  let lastErr = null
  for (let attempt = 1; attempt <= 3 && !buffer; attempt++) {
    try {
      buffer = await downloadBuffer(objectPath)
    } catch (e) {
      lastErr = e
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 400))
    }
  }
  if (!buffer) return fail(lastErr?.message || 'download failed')

  try {
    const hash = crypto.createHash('md5').update(buffer).digest('hex')
    const { width, height } = await generateDerivatives(objectPath, buffer)
    // EXIF is best-effort — extractCapture never throws — and must never fail the upload.
    const capture = (contentType || '').startsWith('image/') ? await extractCapture(buffer) : null
    return { gcsUrl: `${PUBLIC_URL}/${objectPath}`, objectPath, width, height, hash, capture }
  } catch (e) {
    return fail(e.message)
  }
}
