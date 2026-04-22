import { withAuth } from '../../../common/withAuth'
import {
  readUserProfile,
  writeUserProfile,
  claimUsername,
  lookupUserByUsername,
} from '../../../common/userProfile'

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') {
    const profile = await readUserProfile(user.id)
    return res.status(200).json(profile || {})
  }

  if (req.method === 'PUT') {
    const { username, displayName, bio } = req.body
    if (!username) return res.status(400).json({ error: 'username is required' })

    const slug = username.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!slug) return res.status(400).json({ error: 'Invalid username' })

    // Check availability (allow re-claiming own username)
    const existing = await lookupUserByUsername(slug)
    if (existing && existing.userId !== user.id) {
      return res.status(409).json({ error: 'Username already taken' })
    }

    const existingProfile = await readUserProfile(user.id)
    const profile = {
      userId: user.id,
      username: slug,
      displayName: displayName || user.name || '',
      bio: bio || existingProfile?.bio || '',
      email: user.email || '',
      updatedAt: new Date().toISOString(),
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
    }

    await writeUserProfile(user.id, profile)
    await claimUsername(user.id, slug)

    return res.status(200).json(profile)
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
