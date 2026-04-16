import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Onboarding() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin')
    if (status === 'authenticated' && session?.user?.username) {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005'
      const protocol = rootDomain.includes('lvh.me') || rootDomain.includes('localhost') ? 'http' : 'https'
      window.location.href = `${protocol}://${session.user.username}.${rootDomain}/admin`
    }
  }, [status, session, router])

  const slug = username.toLowerCase().replace(/[^a-z0-9-]/g, '')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!slug) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: slug, displayName: session?.user?.name || '' }),
      })
      if (res.status === 409) {
        setError('That username is taken. Try another.')
        setSaving(false)
        return
      }
      if (!res.ok) throw new Error('Save failed')

      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3005'
      const protocol = rootDomain.includes('lvh.me') || rootDomain.includes('localhost') ? 'http' : 'https'
      window.location.href = `${protocol}://${slug}.${rootDomain}/admin`
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  if (status === 'loading' || status === 'unauthenticated') return null

  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Choose your URL</h1>
        <p className="text-sm text-gray-500 mb-8">
          This becomes your public portfolio address.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-gray-600">
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError('') }}
                placeholder="yourname"
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                autoFocus
              />
              <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-l border-gray-300 whitespace-nowrap">
                .{(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com').replace(/:\d+$/, '')}
              </span>
            </div>
            {slug && slug !== username.toLowerCase() && (
              <p className="text-xs text-gray-400 mt-1">Will be saved as: {slug}</p>
            )}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={!slug || saving}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Claim your URL'}
          </button>
        </form>
      </div>
    </div>
  )
}
