import { withAuth } from '../../../common/withAuth'
import {
  readSiteConfig,
  writeSiteConfig,
  createDefaultSiteConfig,
} from '../../../common/siteConfig'
import { readUserProfile } from '../../../common/userProfile'

async function handler(req, res, user) {
  if (req.method === 'GET') {
    try {
      let config = await readSiteConfig(user.id)
      if (!config) {
        // Seed the site name + tagline from the person's profile so a new cover
        // opens with their own name, not "My Portfolio".
        const profile = await readUserProfile(user.id).catch(() => null)
        config = createDefaultSiteConfig(user.id, {
          displayName: profile?.displayName || user.name,
          bio: profile?.bio,
        })
        await writeSiteConfig(user.id, config)
      }
      return res.status(200).json(config)
    } catch (err) {
      console.error('GET /api/admin/site-config error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'PUT') {
    try {
      const config = req.body
      if (!config || !Array.isArray(config.pages)) {
        return res.status(400).json({ error: 'Invalid config: must have pages array' })
      }
      await writeSiteConfig(user.id, config)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('PUT /api/admin/site-config error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
