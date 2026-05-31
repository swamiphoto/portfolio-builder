import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Landing from '../components/landing/Landing'

const SepiaSplash = dynamic(() => import('../components/sepia-splash/SepiaSplash'), { ssr: false })

export default function Home() {
  const { status } = useSession()
  // Always show splash on every visit (dev preview).
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (status !== 'authenticated') return
    window.location.href = '/auth/post-login'
  }, [status])

  function handleSplashDone() {
    setShowSplash(false)
  }

  if (status === 'authenticated') {
    return (
      <div className="flex items-center justify-center h-screen font-sans">
        <p className="text-sm text-gray-400">Redirecting…</p>
      </div>
    )
  }

  return (
    <>
      {showSplash && <SepiaSplash onDone={handleSplashDone} />}
      <Landing />
    </>
  )
}
