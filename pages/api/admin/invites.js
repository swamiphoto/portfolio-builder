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
    try {
      const invite = await createInvite({ label, maxUses, expiresAt, trialDays, code })
      return res.status(201).json({ invite })
    } catch (err) {
      if (err.code === 'CODE_EXISTS') return res.status(409).json({ error: 'CODE_EXISTS' })
      // Validation errors from createInvite (bad maxUses/expiresAt/trialDays)
      return res.status(400).json({ error: err.message })
    }
  }

  if (req.method === 'GET') {
    const keys = await listFiles('invites/')
    // allSettled, not all: one deleted-mid-list or corrupt object must not 500
    // the whole roster.
    const results = await Promise.allSettled(
      keys.filter((k) => k.endsWith('.json')).map((k) => downloadJSON(k))
    )
    const invites = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
    return res.status(200).json({ invites })
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
