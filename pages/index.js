import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Landing from '../components/landing/Landing'

const SepiaSplash = dynamic(() => import('../components/sepia-splash/SepiaSplash'), { ssr: false })

export default function Home() {
  const { status } = useSession()
  // The splash plays once per browser session — bouncing to Terms and back
  // (or any return visit this session) goes straight to the page. The flag is
  // set when it SHOWS, not when it finishes, so navigating away mid-splash
  // doesn't queue a replay.
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('sepia-splash-seen')) {
      sessionStorage.setItem('sepia-splash-seen', '1')
      setShowSplash(true)
    }
  }, [])

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
