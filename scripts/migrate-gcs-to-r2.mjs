/**
 * Migration script: GCS → R2
 * Copies photos from swamiphoto GCS bucket to R2, preserving folder structure as collections.
 * Run: node scripts/migrate-gcs-to-r2.mjs
 */

import { Storage } from '@google-cloud/storage'
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'

// Load .env.local manually
const envPath = new URL('../.env.local', import.meta.url).pathname
const raw = readFileSync(envPath, 'utf8')
const env = {}
for (const line of raw.split('\n')) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue
  const idx = line.indexOf('=')
  const key = line.slice(0, idx).trim()
  let val = line.slice(idx + 1).trim()
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
  env[key] = val.replace(/\\n/g, '\n')
}

const GCS_PROJECT_ID = 'swamiphoto'
const GCS_CLIENT_EMAIL = 'swamiphoto@swamiphoto.iam.gserviceaccount.com'
// Read private key from old swamiphoto env
const oldEnvRaw = readFileSync('/Users/swami/Documents/Contexts/sp/Code/swamiphoto.github.io/.env.local', 'utf8')
const oldEnv = {}
for (const line of oldEnvRaw.split('\n')) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue
  const idx = line.indexOf('=')
  const key = line.slice(0, idx).trim()
  let val = line.slice(idx + 1).trim()
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
  oldEnv[key] = val.replace(/\\n/g, '\n')
}
const GCS_PRIVATE_KEY = oldEnv.GOOGLE_CLOUD_PRIVATE_KEY
const GCS_BUCKET = 'swamiphoto'

const R2_ACCOUNT_ID = env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = env.R2_BUCKET_NAME
const R2_PUBLIC_URL = env.R2_PUBLIC_URL

// GCS client
const storage = new Storage({
  projectId: GCS_PROJECT_ID,
  credentials: { client_email: GCS_CLIENT_EMAIL, private_key: GCS_PRIVATE_KEY },
})
const gcsBucket = storage.bucket(GCS_BUCKET)

// R2 client
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

async function r2Get(key) {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  return JSON.parse(await Body.transformToString())
}

async function r2Put(key, body, contentType = 'application/octet-stream') {
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType }))
}

async function r2Exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    return true
  } catch { return false }
}

// Get userId for swamiphoto
async function getUserId() {
  try {
    const data = await r2Get('usernames/swamiphoto.json')
    return data.userId
  } catch {
    console.error('Could not find usernames/swamiphoto.json in R2. Log in to the app first to create your profile.')
    process.exit(1)
  }
}

function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }
  return map[ext] || 'image/jpeg'
}

// Run N tasks at a time
async function pLimit(tasks, concurrency) {
  const results = []
  let i = 0
  async function run() {
    while (i < tasks.length) {
      const idx = i++
      results[idx] = await tasks[idx]()
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run))
  return results
}

async function main() {
  const userId = await getUserId()
  console.log(`Migrating to userId: ${userId}`)

  // List all photos in GCS
  console.log('Listing GCS files...')
  const [files] = await gcsBucket.getFiles({ prefix: 'photos/' })
  const photos = files
    .map(f => f.name)
    .filter(k => /\.(jpg|jpeg|png|gif|webp)$/i.test(k))

  console.log(`Found ${photos.length} photos in GCS`)

  // Build gallery collections: strip 'photos/' prefix, group by folder
  const galleries = {}
  const photoMapping = [] // { gcsKey, r2Key, publicUrl, collectionKey }

  for (const gcsKey of photos) {
    const withoutPhotosPrefix = gcsKey.replace(/^photos\//, '')
    const parts = withoutPhotosPrefix.split('/')
    const filename = parts[parts.length - 1]
    const folderParts = parts.slice(0, -1)
    const collectionKey = folderParts.join('/') || 'uncategorized'
    const r2Key = `users/${userId}/photos/${withoutPhotosPrefix}`
    const publicUrl = `${R2_PUBLIC_URL}/${r2Key}`

    if (!galleries[collectionKey]) galleries[collectionKey] = []
    galleries[collectionKey].push(publicUrl)

    photoMapping.push({ gcsKey, r2Key, publicUrl, collectionKey, contentType: getContentType(filename) })
  }

  console.log(`Collections: ${Object.keys(galleries).length}`)
  console.log(Object.keys(galleries).sort().join('\n'))

  // Copy files GCS → R2
  let copied = 0
  let skipped = 0
  let failed = 0

  const tasks = photoMapping.map(({ gcsKey, r2Key, contentType }) => async () => {
    try {
      if (await r2Exists(r2Key)) {
        skipped++
        if ((skipped + copied) % 100 === 0) process.stdout.write(`\r  Progress: ${copied} copied, ${skipped} skipped, ${failed} failed`)
        return
      }
      const [buffer] = await gcsBucket.file(gcsKey).download()
      await r2Put(r2Key, buffer, contentType)
      copied++
      if ((skipped + copied) % 100 === 0) process.stdout.write(`\r  Progress: ${copied} copied, ${skipped} skipped, ${failed} failed`)
    } catch (err) {
      failed++
      console.error(`\nFailed ${gcsKey}: ${err.message}`)
    }
  })

  console.log('Copying files (concurrency: 10)...')
  await pLimit(tasks, 10)
  console.log(`\nDone: ${copied} copied, ${skipped} skipped, ${failed} failed`)

  // Save library config to R2
  const libraryConfig = {
    version: 2,
    assets: {},
    assetOrder: [],
    collections: {},
    savedViews: {},
    portfolios: {},
    galleries,
  }

  const configKey = `users/${userId}/library-config.json`
  console.log(`Saving library config to ${configKey}...`)

  // Don't overwrite existing config — merge galleries instead
  let existingConfig = null
  try { existingConfig = await r2Get(configKey) } catch {}

  if (existingConfig) {
    libraryConfig.assets = existingConfig.assets || {}
    libraryConfig.assetOrder = existingConfig.assetOrder || []
    libraryConfig.collections = existingConfig.collections || {}
    libraryConfig.savedViews = existingConfig.savedViews || {}
    libraryConfig.portfolios = existingConfig.portfolios || {}
    // Merge galleries (don't overwrite URLs already there)
    for (const [key, urls] of Object.entries(galleries)) {
      const existing = new Set(existingConfig.galleries?.[key] || [])
      for (const u of urls) existing.add(u)
      libraryConfig.galleries[key] = [...existing]
    }
    for (const [key, urls] of Object.entries(existingConfig.galleries || {})) {
      if (!libraryConfig.galleries[key]) libraryConfig.galleries[key] = urls
    }
  }

  await r2Put(configKey, JSON.stringify(libraryConfig, null, 2), 'application/json')
  console.log('Library config saved.')
  console.log(`\nMigration complete! ${Object.keys(libraryConfig.galleries).length} collections, ${photoMapping.length} photos.`)
  console.log(`Open http://swamiphoto.lvh.me:3000/admin to see your library.`)
}

main().catch(err => { console.error(err); process.exit(1) })
