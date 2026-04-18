/**
 * Backfill EXIF metadata for all assets in the library config.
 * Reads first 512KB from R2 (enough for EXIF + embedded preview headers).
 * Run: node scripts/backfill-exif.mjs
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import exifr from 'exifr'
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

async function r2GetRange(key, bytes = 524288) {
  const { Body } = await s3.send(new GetObjectCommand({
    Bucket: BUCKET, Key: key, Range: `bytes=0-${bytes - 1}`
  }))
  const chunks = []
  for await (const chunk of Body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function r2GetJSON(key) {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const chunks = []
  for await (const chunk of Body) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString())
}

async function r2PutJSON(key, data) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }))
}

function formatShutterSpeed(exposureTime) {
  if (!exposureTime) return null
  if (exposureTime >= 1) return `${exposureTime}s`
  return `1/${Math.round(1 / exposureTime)}s`
}

function formatAperture(fNumber) {
  if (!fNumber) return null
  return `f/${fNumber}`
}

async function readExif(r2Key) {
  try {
    const buf = await r2GetRange(r2Key, 524288)
    const data = await exifr.parse(buf, {
      tiff: true,
      exif: true,
      gps: true,
      iptc: false,
      xmp: false,
      icc: false,
      jfif: false,
      ihdr: false,
    })
    if (!data) return null

    return {
      capturedAt: data.DateTimeOriginal?.toISOString() || data.CreateDate?.toISOString() || null,
      cameraMake: data.Make?.trim() || null,
      cameraModel: data.Model?.trim() || null,
      lens: data.LensModel?.trim() || data.Lens?.trim() || null,
      focalLengthMm: data.FocalLength || null,
      aperture: formatAperture(data.FNumber),
      shutterSpeed: formatShutterSpeed(data.ExposureTime),
      iso: data.ISO || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
    }
  } catch {
    return null
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
  const assetList = Object.entries(assets)
  console.log(`${assetList.length} assets to process`)

  let done = 0, withExif = 0, failed = 0

  const tasks = assetList.map(([assetId, asset]) => async () => {
    const suffix = asset.publicUrl.split(`/${userId}/photos/`)[1]
    const r2Key = `users/${userId}/photos/${suffix}`

    try {
      const exif = await readExif(r2Key)
      if (exif) {
        assets[assetId].capture = { ...assets[assetId].capture, ...exif }
        // Also backfill capturedAt as createdAt if missing
        if (exif.capturedAt && !assets[assetId].createdAt) {
          assets[assetId].createdAt = exif.capturedAt
        }
        withExif++
      }
      done++
    } catch (err) {
      failed++
      if (failed <= 3) console.error(`\nFailed ${r2Key}: ${err.message}`)
    }

    if ((done + failed) % 200 === 0) {
      process.stdout.write(`\r  ${done} done (${withExif} with EXIF), ${failed} failed / ${assetList.length}`)
    }
  })

  console.log('Reading EXIF (concurrency: 10)...')
  await pLimit(tasks, 10)
  console.log(`\nDone: ${done} processed, ${withExif} had EXIF, ${failed} failed`)

  // Print a sample of what we found
  const sample = Object.values(assets).find(a => a.capture?.cameraModel)
  if (sample) {
    console.log('\nSample EXIF:')
    console.log(JSON.stringify(sample.capture, null, 2))
  }

  console.log('\nSaving config...')
  config.assets = assets
  await r2PutJSON(configKey, config)
  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
