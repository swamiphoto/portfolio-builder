// common/storeImage.js
// Shared helper: upload a raw image buffer to R2 (original + thumbnail),
// return { gcsUrl, objectPath, width, height }.
// Used by upload-file.js (manual upload) and fetch-batch (web import).

import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import crypto from 'crypto'
import { s3, BUCKET, PUBLIC_URL } from './gcsClient'
import { getUserPhotoPath, getUserPhotosPrefix } from './gcsUser'

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
 * Store an image buffer in R2: upload original, generate 600px thumbnail, return metadata.
 * Thumbnail failure is non-fatal.
 *
 * @param {string} userId
 * @param {{ buffer: Buffer, filename: string, contentType: string, folder?: string }} opts
 * @returns {Promise<{ gcsUrl: string, objectPath: string, width: number|null, height: number|null, hash: string }>}
 */
export async function storeImageBuffer(userId, { buffer, filename, contentType, folder }) {
  const key = resolveUploadKey(userId, filename, folder)
  const thumbKey = key.replace('/photos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg')

  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }))

  const hash = crypto.createHash('sha256').update(buffer).digest('hex')

  let width = null
  let height = null
  try {
    const img = sharp(buffer)
    const meta = await img.metadata()
    width = meta.width
    height = meta.height

    const thumbBuffer = await img.resize(600, null, { withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: thumbKey, Body: thumbBuffer, ContentType: 'image/jpeg' }))
  } catch {
    // thumbnail failure is non-fatal
  }

  return { gcsUrl: `${PUBLIC_URL}/${key}`, objectPath: key, width, height, hash }
}
