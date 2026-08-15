import { withAuth } from '../../../common/withAuth'
import { storeImageBuffer } from '../../../common/storeImage'
import { extractCapture } from '../../../common/exifCapture'

export const config = { api: { bodyParser: false } }

export async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { filename, contentType, folder } = req.query
  if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' })

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)

  try {
    const result = await storeImageBuffer(user.id, { buffer, filename, contentType, folder })
    // EXIF extraction is best-effort — extractCapture never throws — and must
    // never fail the upload itself.
    const capture = contentType.startsWith('image/') ? await extractCapture(buffer) : null
    return res.status(200).json({ ...result, capture })
  } catch (err) {
    console.error('upload-file: original upload failed', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
