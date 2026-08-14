import { useEffect, useState, useCallback } from 'react'

export function useOnboarding() {
  const [onboarding, setOnboarding] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/admin/profile')
      .then(r => { if (!r.ok) throw new Error('profile read failed'); return r.json() })
      .then(profile => { if (alive) setOnboarding(profile?.onboarding || {}) })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const markSeen = useCallback((flag) => {
    setOnboarding(prev => (prev[flag] ? prev : { ...prev, [flag]: true }))
    fetch('/api/admin/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding: { [flag]: true } }),
    }).catch(() => {})
  }, [])

  // Clear the "seen" flags so the guided tours run again from the top.
  const resetOnboarding = useCallback(() => {
    const cleared = { tourDone: false, blocksTipSeen: false }
    setOnboarding(prev => ({ ...prev, ...cleared }))
    fetch('/api/admin/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding: cleared }),
    }).catch(() => {})
  }, [])

  return { onboarding, loading, error, markSeen, resetOnboarding }
}
