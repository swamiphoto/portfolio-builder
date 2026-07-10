import { withAuth } from '@/common/withAuth'
import { deleteFile, PUBLIC_URL } from '@/common/gcsClient'

const MAX_BATCH = 200
const keyFromUrl = (url) => String(url || '').replace(`${PUBLIC_URL}/`, '')
const thumbKey = (key) => key.replace('/photos/', '/thumbnails/').replace(/\.[^.]+$/, '.jpg')

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { urls } = req.body || {}
  if (!Array.isArray(urls)) return res.status(400).json({ error: 'urls array required' })
  if (urls.length > MAX_BATCH) return res.status(400).json({ error: 'batch too large' })

  let deleted = 0
  const failed = []
  for (const url of urls) {
    const key = keyFromUrl(url)
    if (!key || key === url) { failed.push({ url, reason: 'not a managed url' }); continue }
    try {
      await deleteFile(key)
      try { await deleteFile(thumbKey(key)) } catch { /* thumbnail may not exist */ }
      deleted += 1
    } catch (err) {
      failed.push({ url, reason: String(err?.message || err) })
    }
  }
  return res.status(200).json({ deleted, failed })
}

export default withAuth(handler)
