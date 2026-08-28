import { useState, useEffect } from 'react'

// True when the actual device/window is phone-width (≤768px, Tailwind `md`).
//
// Unlike useIsMobile, this ignores the admin preview's Desktop/Mobile viewport
// toggle — it reports real device width ONLY. That's what the studio's
// desktop-only gate needs: flipping the preview to Mobile on a laptop must never
// trip the gate.
//
// SSR-safe: the server and the first client render always report false (desktop)
// so the hydrated HTML matches; the real value is applied after mount.
export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsPhone(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isPhone
}
