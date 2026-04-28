import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3, BUCKET, PUBLIC_URL } from '../../../common/gcsClient'
import { getUserPhotoPath, getUserPhotosPrefix } from '../../../common/gcsUser'
import { withAuth } from '../../../common/withAuth'

export const config = { api: { bodyParser: false } }

function resolveUploadKey(userId, filename, folder) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
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

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { filename, contentType, folder } = req.query
  if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' })

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)

  const key = resolveUploadKey(user.id, filename, folder)
  const thumbKey = key.replace('/photos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg')

  try {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }))
  } catch (err) {
    console.error('upload-file: original upload failed', err)
    return res.status(500).json({ error: err.message })
  }

  let width = null, height = null
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

  const gcsUrl = `${PUBLIC_URL}/${key}`
  return res.status(200).json({ gcsUrl, objectPath: key, width, height })
}

export default withAuth(handler)
