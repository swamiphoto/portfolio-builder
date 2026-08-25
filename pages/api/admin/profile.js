import { withAuth } from '../../../common/withAuth'
import {
  readUserProfile,
  writeUserProfile,
  claimUsername,
  lookupUserByUsername,
} from '../../../common/userProfile'
import { redeemInvite, InviteError } from '../../../common/invites'
import { INVITE_ERRORS } from '../../../common/inviteMessages'

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') {
    const profile = await readUserProfile(user.id)
    return res.status(200).json(profile || {})
  }

  if (req.method === 'PUT') {
    const { username, displayName, bio, inviteCode } = req.body
    if (!username) return res.status(400).json({ error: 'username is required' })

    const slug = username.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!slug) return res.status(400).json({ error: 'Invalid username' })

    // Check availability (allow re-claiming own username)
    const existing = await lookupUserByUsername(slug)
    if (existing && existing.userId !== user.id) {
      return res.status(409).json({ error: 'Username already taken' })
    }

    const existingProfile = await readUserProfile(user.id)
    // Grandfather anyone who already has a site: they never need a code and keep
    // whatever trial state they had (usually none). Only brand-new tenants are gated.
    const isNewTenant = !existingProfile?.username

    let trialEndsAt = existingProfile?.trialEndsAt || null
    let invite = existingProfile?.invite || null

    if (isNewTenant) {
      if (!inviteCode) return res.status(400).json({ error: INVITE_ERRORS.REQUIRED })
      let redemption
      try {
        redemption = await redeemInvite(inviteCode, user.id)
      } catch (err) {
        if (err instanceof InviteError) return res.status(403).json({ error: err.code })
        throw err
      }
      const now = new Date()
      trialEndsAt = new Date(now.getTime() + redemption.trialDays * 86400000).toISOString()
      invite = { code: redemption.code, redeemedAt: now.toISOString() }
    }

    const profile = {
      userId: user.id,
      username: slug,
      displayName: displayName || user.name || '',
      bio: bio || existingProfile?.bio || '',
      email: user.email || '',
      updatedAt: new Date().toISOString(),
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
      ...(trialEndsAt ? { trialEndsAt } : {}),
      ...(invite ? { invite } : {}),
    }

    await writeUserProfile(user.id, profile)
    await claimUsername(user.id, slug)

    return res.status(200).json(profile)
  }

  if (req.method === 'PATCH') {
    const existing = await readUserProfile(user.id)
    if (!existing) return res.status(404).json({ error: 'No profile to patch' })

    const patch = req.body || {}
    const next = { ...existing }
    if (patch.onboarding && typeof patch.onboarding === 'object') {
      next.onboarding = { ...(existing.onboarding || {}), ...patch.onboarding }
    }
    if (typeof patch.displayName === 'string') next.displayName = patch.displayName
    if (typeof patch.bio === 'string') next.bio = patch.bio
    next.updatedAt = new Date().toISOString()

    await writeUserProfile(user.id, next)
    return res.status(200).json(next)
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
