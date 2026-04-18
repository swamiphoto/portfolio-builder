/**
 * Generate 600px-wide JPEG display for all photos in R2.
 * Thumbnails stored at users/{userId}/display/{original-path}
 * (mirrors the photos/ path, just under display/)
 *
 * Run: node scripts/generate-display.mjs
 * Re-running is safe — skips display that already exist.
 */

import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { readFileSync } from 'fs'

const envRaw = readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8')
const env = {}
for (const line of envRaw.split('\n')) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue
  const idx = line.indexOf('=')
  const key = line.slice(0, idx).trim()
  let val = line.slice(idx + 1).trim()
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
  env[key] = val.replace(/\\n/g, '\n')
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
})
const BUCKET = env.R2_BUCKET_NAME
const THUMB_WIDTH = 1800
const THUMB_QUALITY = 85

async function exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return true }
  catch { return false }
}

async function download(key) {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const chunks = []
  for await (const chunk of Body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function upload(key, buffer) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key,
    Body: buffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }))
}

async function pLimit(tasks, concurrency) {
  let i = 0
  async function run() { while (i < tasks.length) { const idx = i++; await tasks[idx]() } }
  await Promise.all(Array.from({ length: concurrency }, run))
}

async function main() {
  const userId = '110173791897887386689'

  // Get all photo keys from library config
  const { Body } = await s3.send(new GetObjectCommand({
    Bucket: BUCKET, Key: `users/${userId}/library-config.json`
  }))
  const chunks = []
  for await (const c of Body) chunks.push(c)
  const config = JSON.parse(Buffer.concat(chunks).toString())

  const assets = Object.values(config.assets || {})
  console.log(`${assets.length} assets to process`)

  let generated = 0, skipped = 0, failed = 0

  const tasks = assets.map(asset => async () => {
    const suffix = asset.publicUrl.split(`/${userId}/photos/`)[1]
    if (!suffix) { failed++; return }

    const photoKey = `users/${userId}/photos/${suffix}`
    const thumbKey = `users/${userId}/display/${suffix.replace(/\.[^.]+$/, '.jpg')}`

    try {
      if (await exists(thumbKey)) { skipped++; return }

      const original = await download(photoKey)
      const thumb = await sharp(original)
        .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
        .jpeg({ quality: THUMB_QUALITY, progressive: true })
        .toBuffer()

      await upload(thumbKey, thumb)
      generated++
    } catch (err) {
      failed++
      if (failed <= 5) console.error(`\nFailed ${photoKey}: ${err.message}`)
    }

    const total = generated + skipped + failed
    if (total % 100 === 0) {
      process.stdout.write(`\r  ${generated} generated, ${skipped} skipped, ${failed} failed / ${assets.length}`)
    }
  })

  console.log(`Generating display (${THUMB_WIDTH}px, quality ${THUMB_QUALITY}, concurrency 8)...`)
  await pLimit(tasks, 8)
  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed`)
}

main().catch(err => { console.error(err); process.exit(1) })
