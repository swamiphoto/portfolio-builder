import { useState, useEffect } from 'react'
import { useMediaQuery } from 'react-responsive'
import { useAdminViewport } from '../contexts/ViewportContext'

// Single source of truth for "is this a phone-width view".
// Prefers the admin preview's viewport toggle when present (so the editor's
// Mobile preview matches the real thing), otherwise the 768px media query
// (Tailwind `md`, the app's mobile threshold).
//
// SSR-safe: the server and the first client render always report desktop so the
// hydrated HTML matches; the real value is applied after mount. This avoids
// hydration mismatches from the mobile-vs-desktop markup swaps this drives.
export function useIsMobile() {
  const adminViewport = useAdminViewport()
  const mediaMobile = useMediaQuery({ query: '(max-width: 768px)' })
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return false
  if (adminViewport != null) return adminViewport === 'mobile'
  return mediaMobile
}
