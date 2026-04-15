import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function AdminIndex() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        Loading...
      </div>
    )
  }

  if (!session) return null

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>PhotoHub Admin</h1>
      <p>Signed in as <strong>{session.user.email}</strong></p>
      <p style={{ color: '#666', fontSize: 14 }}>User ID: {session.user.id}</p>
      <button
        onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        style={{ marginTop: 24, padding: '8px 16px', cursor: 'pointer' }}
      >
        Sign out
      </button>
    </div>
  )
}
