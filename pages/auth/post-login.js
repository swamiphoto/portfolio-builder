import { getServerSideProps as _getServerSideProps } from 'next-auth/next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../api/auth/[...nextauth]'
import { readUserProfile } from '../../common/userProfile'

export async function getServerSideProps(context) {
  try {
    const session = await getServerSession(context.req, context.res, authOptions)

    if (!session) {
      return { redirect: { destination: '/auth/signin', permanent: false } }
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
    const protocol = rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'

    let profile = null
    try {
      profile = await readUserProfile(session.user.id)
    } catch (err) {
      console.error('[post-login] readUserProfile error:', err.message)
    }

    if (profile?.username) {
      return {
        redirect: {
          destination: `${protocol}://${profile.username}.${rootDomain}/admin`,
          permanent: false,
        },
      }
    }

    return { redirect: { destination: '/onboarding', permanent: false } }
  } catch (err) {
    console.error('[post-login] error:', err.message)
    return { props: { error: err.message } }
  }
}

export default function PostLogin({ error }) {
  return (
    <div style={{ padding: 32, fontFamily: 'monospace' }}>
      <p>Redirecting…</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  )
}
