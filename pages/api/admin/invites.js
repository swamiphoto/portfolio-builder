import { withAuth } from '../../../common/withAuth'
import { isPlatformAdmin } from '../../../common/platformAdmin'
import { createInvite } from '../../../common/invites'
import { listFiles, downloadJSON } from '../../../common/gcsClient'

export default withAuth(async (req, res, user) => {
  if (!isPlatformAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method === 'POST') {
    const { label, maxUses, expiresAt, trialDays, code } = req.body || {}
    const invite = await createInvite({ label, maxUses, expiresAt, trialDays, code })
    return res.status(201).json({ invite })
  }

  if (req.method === 'GET') {
    const keys = await listFiles('invites/')
    const invites = await Promise.all(
      keys.filter((k) => k.endsWith('.json')).map((k) => downloadJSON(k))
    )
    return res.status(200).json({ invites })
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
