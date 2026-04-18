// pages/api/auth/post-login.js
import { getServerSession } from 'next-auth/next'
import { authOptions } from './[...nextauth]'
import { readUserProfile } from '../../../common/userProfile'

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.redirect(302, '/auth/signin')
    }

    const profile = await readUserProfile(session.user.id)
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
    const protocol = rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'

    if (profile?.username) {
      return res.redirect(302, `${protocol}://${profile.username}.${rootDomain}/admin`)
    }

    return res.redirect(302, '/onboarding')
  } catch (err) {
    console.error('[post-login] error:', err)
    return res.status(500).json({ error: err.message })
  }
}
