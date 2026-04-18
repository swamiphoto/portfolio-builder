import { useSession, signIn } from 'next-auth/react'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated') return
    // Already signed in — send to post-login handler which redirects to subdomain admin or onboarding
    window.location.href = '/auth/post-login'
  }, [status])

  if (status === 'authenticated') {
    return (
      <div className="flex items-center justify-center h-screen font-sans">
        <p className="text-sm text-gray-400">Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans bg-white">
      <div className="text-center max-w-sm">
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">PhotoHub</h1>
        <p className="text-sm text-gray-500 mb-10">
          Beautiful photography portfolios in under 2 minutes.
        </p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/auth/post-login' })}
          className="px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
