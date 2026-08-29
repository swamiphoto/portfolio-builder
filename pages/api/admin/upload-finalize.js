import { withAuth } from '../../../common/withAuth'
import { finalizeStoredImage } from '../../../common/storeImage'

// Called after the browser PUTs the original straight to R2 via the presigned URL
// from upload-url. Only a small JSON body ({ objectPath, contentType }) reaches
// this function — never the image bytes — so the 4.5 MB cap never applies. The
// function downloads the original from R2 to build thumbnail/display + EXIF.
export async function handler(req, res, user) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { objectPath, contentType } = req.body || {}
  if (!objectPath) {
    return res.status(400).json({ error: 'objectPath required' })
  }

  try {
    const result = await finalizeStoredImage(user.id, { objectPath, contentType })
    return res.status(200).json(result)
  } catch (err) {
    if (err.code === 'FORBIDDEN') return res.status(403).json({ error: err.message })
    console.error('upload-finalize: failed', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
