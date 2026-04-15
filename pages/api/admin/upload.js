import { createUploadPost, FALLBACK_FOLDER, PUBLIC_URL } from '../../../common/gcsClient'
import { withAuth } from '../../../common/withAuth'

async function handler(req, res, user) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { filename, contentType, folder } = req.body

  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType required' })
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const targetFolder = folder ? folder.replace(/^\/|\/$/g, '') : FALLBACK_FOLDER
  const key = `${targetFolder}/${safeName}`

  try {
    const { url, fields } = await createUploadPost(key, contentType)
    const gcsUrl = `${PUBLIC_URL}/${key}`
    return res.status(200).json({ signedUrl: url, fields, gcsUrl, objectPath: key })
  } catch (err) {
    console.error('POST /api/admin/upload error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
