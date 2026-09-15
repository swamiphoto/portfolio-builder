import { withAuth } from '../../../common/withAuth'
import { publishSiteConfig } from '../../../common/publishConfig'

export async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const config = req.body
  if (!config || !Array.isArray(config.pages)) {
    return res.status(400).json({ error: 'Invalid config: must have pages array' })
  }
  try {
    const { publishedAt } = await publishSiteConfig(user.id, config)
    return res.status(200).json({ ok: true, publishedAt })
  } catch (err) {
    console.error('POST /api/admin/publish error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
