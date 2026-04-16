// pages/api/auth/post-login.js
import { getServerSession } from 'next-auth/next'
import { authOptions } from './[...nextauth]'
import { readUserProfile } from '../../../common/userProfile'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.redirect(302, '/auth/signin')
  }

  const profile = await readUserProfile(session.user.id)

  if (profile?.username) {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005'
    const protocol = rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'
    return res.redirect(302, `${protocol}://${profile.username}.${rootDomain}/admin`)
  }

  return res.redirect(302, '/onboarding')
}
