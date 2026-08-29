import { withAuth } from '../../../common/withAuth'
import { resolveUploadKey } from '../../../common/storeImage'
import { createPresignedPutUrl, PUBLIC_URL } from '../../../common/gcsClient'

// Mints a short-lived presigned PUT URL so the browser can upload the original
// image straight to R2, skipping this function (and Vercel's 4.5 MB request-body
// cap that returns 413 for large photos). The client then calls upload-finalize.
export async function handler(req, res, user) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const src = req.method === 'POST' ? (req.body || {}) : req.query
  const { filename, contentType, folder } = src
  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType required' })
  }

  try {
    // Key is derived server-side from the caller's id, so it's always under the
    // user's own photos prefix — the client never supplies a raw object key.
    const key = resolveUploadKey(user.id, filename, folder)
    const uploadUrl = await createPresignedPutUrl(key, contentType)
    return res.status(200).json({ uploadUrl, objectPath: key, gcsUrl: `${PUBLIC_URL}/${key}` })
  } catch (err) {
    console.error('upload-url: failed to sign', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
