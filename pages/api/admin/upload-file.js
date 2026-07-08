import { withAuth } from '../../../common/withAuth'
import { storeImageBuffer } from '../../../common/storeImage'

export const config = { api: { bodyParser: false } }

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { filename, contentType, folder } = req.query
  if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' })

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)

  try {
    const result = await storeImageBuffer(user.id, { buffer, filename, contentType, folder })
    return res.status(200).json(result)
  } catch (err) {
    console.error('upload-file: original upload failed', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
