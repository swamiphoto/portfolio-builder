// POST /api/admin/delete-account
// Permanently deletes the signed-in user's account: every object under their
// storage prefix (images, configs, profile, orders) plus the username and any
// custom-domain lookup so the handle is freed. Irreversible.
import { withAuth } from '../../../common/withAuth'
import { readSiteConfig } from '../../../common/siteConfig'
import { readUserProfile } from '../../../common/userProfile'
import { listFiles, deleteFile } from '../../../common/gcsClient'
import { getUserPrefix, getUsernameLookupPath, getDomainLookupPath } from '../../../common/gcsUser'
import { normalizeCustomDomain } from '../../../common/domainUtils'

async function handler(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Read the external lookup keys BEFORE deleting the prefix that holds them.
    const [profile, config] = await Promise.all([
      readUserProfile(user.id).catch(() => null),
      readSiteConfig(user.id).catch(() => null),
    ])
    const username = profile?.username || config?.slug || null
    const cd = normalizeCustomDomain(config?.customDomain)

    // Delete everything under users/<id>/ (photos, thumbnails, display, configs,
    // profile, orders, print-masters — the whole tree).
    const keys = await listFiles(getUserPrefix(user.id))
    for (const key of keys) {
      try { await deleteFile(key) } catch (e) { console.error('delete-account: delete failed', key, e?.message) }
    }

    // Free the username + custom-domain reverse lookups (they live outside the prefix).
    if (username) {
      try { await deleteFile(getUsernameLookupPath(username)) } catch (e) { console.error('delete-account: username lookup', e?.message) }
    }
    if (cd?.name) {
      try { await deleteFile(getDomainLookupPath(cd.name)) } catch (e) { console.error('delete-account: domain lookup', e?.message) }
    }

    return res.status(200).json({ ok: true, deleted: keys.length })
  } catch (err) {
    console.error('POST /api/admin/delete-account error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
