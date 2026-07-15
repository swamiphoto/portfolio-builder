// POST /api/admin/reset  { scope: 'site' | 'library' }
// Destructive "start over" actions scoped to the signed-in user.
//  - site:    clears all pages, leaving a single blank home page. Keeps images.
//  - library: permanently deletes every uploaded photo object + empties the library config.
import { withAuth } from '../../../common/withAuth'
import { readSiteConfig, writeSiteConfig, defaultPage } from '../../../common/siteConfig'
import { createEmptyLibraryConfig } from '../../../common/adminConfig'
import { uploadJSON, listFiles, deleteFile } from '../../../common/gcsClient'
import { getUserLibraryConfigPath, getUserPhotosPrefix } from '../../../common/gcsUser'

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const scope = req.body?.scope

  try {
    if (scope === 'site') {
      const config = await readSiteConfig(user.id)
      if (!config) return res.status(404).json({ error: 'No site to reset' })
      const reset = {
        ...config,
        pages: [defaultPage({ id: 'home', title: 'Home', showInNav: false })],
        homePageId: null,
      }
      await writeSiteConfig(user.id, reset)
      return res.status(200).json({ ok: true })
    }

    if (scope === 'library') {
      const keys = await listFiles(getUserPhotosPrefix(user.id))
      let deleted = 0
      for (const key of keys) {
        try { await deleteFile(key); deleted++ } catch (e) { console.error('reset library: delete failed', key, e?.message) }
      }
      await uploadJSON(getUserLibraryConfigPath(user.id), createEmptyLibraryConfig())
      return res.status(200).json({ ok: true, deleted, total: keys.length })
    }

    return res.status(400).json({ error: 'Invalid scope' })
  } catch (err) {
    console.error('POST /api/admin/reset error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
