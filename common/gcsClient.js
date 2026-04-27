// common/gcsClient.js
// Server-side only — never import from client components.
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'

export const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export const BUCKET = process.env.R2_BUCKET_NAME || 'photohub'
export const PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-placeholder.r2.dev'

// Returns the appropriate sized URL for a given context.
// 'thumbnail' → 600px  (library grid)
// 'display'   → 1800px (page galleries, lightbox)
// 'original'  → full resolution (download)
export function getSizedUrl(publicUrl, size = 'display') {
  if (!publicUrl) return publicUrl
  if (size === 'original') return publicUrl
  const folder = size === 'thumbnail' ? 'thumbnails' : size
  return publicUrl
    .replace('/photos/', `/${folder}/`)
    .replace(/\.[^.]+$/, '.jpg')
}

/**
 * List all objects under a GCS-style prefix. Returns full GCS-style paths (Key strings).
 * @param {string} prefix - e.g. 'photos/'
 * @returns {Promise<string[]>} array of object Keys
 */
export async function listFiles(prefix) {
  const results = []
  let continuationToken

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    })
    const { Contents = [], NextContinuationToken, IsTruncated } = await s3.send(cmd)
    results.push(...Contents.map(obj => obj.Key).filter(Boolean))
    continuationToken = IsTruncated ? NextContinuationToken : undefined
  } while (continuationToken)

  return results
}

/**
 * Download and parse a JSON file from R2.
 * @param {string} key - e.g. 'users/{userId}/library-config.json'
 * @returns {Promise<object>}
 */
export async function downloadJSON(key) {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const text = await Body.transformToString()
  return JSON.parse(text)
}

/**
 * Upload a JSON object to R2.
 * @param {string} key
 * @param {object} data
 */
export async function uploadJSON(key, data) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
    CacheControl: 'no-cache',
  }))
}

/**
 * Delete an object from R2.
 * @param {string} key
 */
export async function deleteFile(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

/**
 * Create a presigned POST URL for direct browser uploads.
 * Returns { url, fields } — client POSTs a multipart form to url with fields + file.
 * @param {string} key - destination object key
 * @param {string} contentType - e.g. 'image/jpeg'
 * @param {number} maxBytes - max upload size in bytes (default 50MB)
 * @returns {Promise<{ url: string, fields: Record<string,string> }>}
 */
export async function createUploadPost(key, contentType, maxBytes = 50 * 1024 * 1024) {
  return createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: key,
    Conditions: [
      ['content-length-range', 0, maxBytes],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: { 'Content-Type': contentType },
    Expires: 900, // 15 minutes
  })
}
