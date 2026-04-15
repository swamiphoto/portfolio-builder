// pages/admin/index.js
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState, useRef, useCallback } from 'react'
import AdminLayout from '../../components/admin/platform/AdminLayout'
import PlatformSidebar from '../../components/admin/platform/PlatformSidebar'

const AUTOSAVE_DELAY = 1500

export default function AdminIndex() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [siteConfig, setSiteConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle')
  const autosaveTimer = useRef(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/admin/site-config')
      .then(r => r.json())
      .then(config => {
        setSiteConfig(config)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load site config:', err)
        setLoading(false)
      })
  }, [status])

  const save = useCallback(async (config) => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Autosave failed:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [])

  const updateConfig = useCallback((updater) => {
    setSiteConfig(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => save(next), AUTOSAVE_DELAY)
      return next
    })
  }, [save])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        Loading...
      </div>
    )
  }

  if (!session || !siteConfig) return null

  return (
    <AdminLayout
      sidebar={
        <PlatformSidebar
          siteConfig={siteConfig}
          saveStatus={saveStatus}
          onConfigChange={updateConfig}
          onSignOut={() => signOut({ callbackUrl: '/auth/signin' })}
        />
      }
    >
      <div className="flex items-center justify-center h-full text-gray-300 text-sm">
        Select a page to edit
      </div>
    </AdminLayout>
  )
}
