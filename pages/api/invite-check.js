import { withAuth } from '../../common/withAuth'
import { checkInvite, InviteError } from '../../common/invites'
import { INVITE_ERRORS } from '../../common/inviteMessages'

// Validate-only gate for the onboarding invite screen. Redemption happens later
// on the profile save (see /api/admin/profile), so a valid check here holds no
// slot — the claim step still handles the rare exhausted-in-the-gap failure.
export default withAuth(async (req, res, user) => {
  if (req.method !== 'POST') return res.status(405).end()
  const { code } = req.body || {}
  if (!code) return res.status(400).json({ error: INVITE_ERRORS.REQUIRED })
  try {
    await checkInvite(code, user.id)
    return res.status(200).json({ ok: true })
  } catch (err) {
    if (err instanceof InviteError) {
      return res.status(400).json({ error: err.code })
    }
    console.error('invite-check failed', err)
    return res.status(500).json({ error: 'Something went wrong' })
  }
})
