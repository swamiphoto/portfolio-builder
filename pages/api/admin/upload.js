import { createUploadPost, PUBLIC_URL } from '../../../common/gcsClient'
import { getUserPhotoPath, getUserPhotosPrefix } from '../../../common/gcsUser'
import { withAuth } from '../../../common/withAuth'

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { filename, contentType, folder } = req.body

  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType required' })
  }

  const key = resolveUploadKey(user.id, filename, folder)
  const thumbKey = key.replace('/photos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg')

  try {
    const [{ url, fields }, thumb] = await Promise.all([
      createUploadPost(key, contentType),
      createUploadPost(thumbKey, 'image/jpeg'),
    ])
    const gcsUrl = `${PUBLIC_URL}/${key}`
    return res.status(200).json({ signedUrl: { url, fields }, thumbSignedUrl: thumb, gcsUrl, objectPath: key })
  } catch (err) {
    console.error('POST /api/admin/upload error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
