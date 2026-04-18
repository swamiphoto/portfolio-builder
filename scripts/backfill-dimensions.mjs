/**
 * Backfill width/height for migrated assets by reading image headers from R2.
 * Uses range requests (first 64KB) so we don't download full images.
 * Run: node scripts/backfill-dimensions.mjs
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { imageSize } from 'image-size'
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

async function r2Get(key, range) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key, ...(range ? { Range: range } : {}) })
  const { Body } = await s3.send(cmd)
  const chunks = []
  for await (const chunk of Body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function r2GetJSON(key) {
  const buf = await r2Get(key)
  return JSON.parse(buf.toString())
}

async function r2PutJSON(key, data) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }))
}

async function getDimensions(r2Key) {
  // Fetch only first 64KB — enough for JPEG/PNG/WebP headers
  const buf = await r2Get(r2Key, 'bytes=0-65535')
  try {
    const { width, height } = imageSize(buf)
    return { width: width || null, height: height || null }
  } catch {
    return { width: null, height: null }
  }
}

async function pLimit(tasks, concurrency) {
  let i = 0
  async function run() {
    while (i < tasks.length) { const idx = i++; await tasks[idx]() }
  }
  await Promise.all(Array.from({ length: concurrency }, run))
}

async function main() {
  const userId = '110173791897887386689'
  const configKey = `users/${userId}/library-config.json`

  console.log('Loading library config...')
  const config = await r2GetJSON(configKey)

  const assets = config.assets || {}
  const needsDimensions = Object.entries(assets).filter(([, a]) => !a.width || !a.height)
  console.log(`${needsDimensions.length} assets need dimensions (${Object.keys(assets).length} total)`)

  if (needsDimensions.length === 0) {
    console.log('All assets already have dimensions.')
    return
  }

  let done = 0, failed = 0

  const tasks = needsDimensions.map(([assetId, asset]) => async () => {
    const r2Key = `users/${userId}/photos/${asset.storageKey?.replace(/^.*\/photos\//, '') || asset.publicUrl.split('/photos/')[1]}`
    try {
      const { width, height } = await getDimensions(r2Key)
      if (width && height) {
        assets[assetId].width = width
        assets[assetId].height = height
        assets[assetId].aspectRatio = Number((width / height).toFixed(4))
        assets[assetId].orientation = width === height ? 'square' : width > height ? 'landscape' : 'portrait'
      }
      done++
    } catch (err) {
      failed++
      if (failed <= 5) console.error(`\nFailed ${r2Key}: ${err.message}`)
    }
    if ((done + failed) % 100 === 0) process.stdout.write(`\r  ${done} done, ${failed} failed / ${needsDimensions.length}`)
  })

  console.log('Reading image headers (concurrency: 20)...')
  await pLimit(tasks, 20)
  console.log(`\nDone: ${done} updated, ${failed} failed`)

  console.log('Saving updated config...')
  config.assets = assets
  await r2PutJSON(configKey, config)
  console.log('Config saved.')
}

main().catch(err => { console.error(err); process.exit(1) })
