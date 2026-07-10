import { useEffect, useState, useCallback } from 'react'

export function useOnboarding() {
  const [onboarding, setOnboarding] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/admin/profile')
      .then(r => (r.ok ? r.json() : {}))
      .then(profile => { if (alive) setOnboarding(profile?.onboarding || {}) })
      .catch(() => {})
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

  return { onboarding, loading, markSeen }
}
