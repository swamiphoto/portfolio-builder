import { useEffect, useRef, useState } from 'react'

// The product, laid on the desk at an angle — and straightening up as you
// scroll to it (the qtr.ai treatment). Progress is derived from the frame's
// viewport position: tilted ~20° in perspective while low on the screen,
// flat and full once it reaches the upper third. rAF-throttled scroll math,
// no library; reduced-motion renders it flat from the start.

export default function HeroShot({ src, alt = 'The Sepia studio', children }) {
  const ref = useRef(null)
  const [p, setP] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setP(1)
      return
    }
    let raf = 0
    const update = () => {
      raf = 0
      // Tilted at rest, straightening over the first stretch of scroll — tied
      // to scroll distance (not element position) so the tilt is always fully
      // present on load, wherever the fold falls.
      setP(Math.min(1, window.scrollY / 420))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const deg = 20 * (1 - p)
  const scale = 0.94 + 0.06 * p

  return (
    <div ref={ref} style={{ width: 'min(1280px, 96vw)', perspective: 1500 }}>
      <div
        style={{
          transform: `rotateX(${deg.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
          transformOrigin: 'center 20%',
          willChange: 'transform',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(26,18,10,0.16)',
          // Two-layer shadow, deepening as the shot settles flat: a broad soft
          // cast plus a tight contact shadow. No background color — fractional
          // image heights otherwise leave a hairline of it showing at the
          // frame's top and bottom edges.
          boxShadow: `0 ${22 + 24 * p}px ${50 + 26 * p}px -22px rgba(26,18,10,${0.28 + 0.14 * p}), 0 8px 18px -10px rgba(26,18,10,0.22)`,
          lineHeight: 0,
        }}
      >
        {children || <img src={src} alt={alt} style={{ width: '100%', height: 'auto', display: 'block' }} />}
      </div>
    </div>
  )
}
