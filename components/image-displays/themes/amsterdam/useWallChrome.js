// components/image-displays/themes/amsterdam/useWallChrome.js
// Two scroll-linked effects on the Amsterdam poster wall, driven by one
// rAF-throttled handler:
//   1. Adaptive chrome — the rail (wordmark/hamburger/rule) and the fixed
//      arrows flood to match whichever surface (ink/image/paper) sits under
//      the viewport's center. Written as data-chrome on .ams-stage; CSS does
//      the actual flooding.
//   2. Subtle horizontal parallax on photos — every .ams-fit box drifts a few
//      px opposite its offset from center, via a --par custom property that
//      cascades down to the <img>.
// Both are fully inert on mobile (the wall doesn't scroll horizontally there)
// and parallax is skipped under prefers-reduced-motion (chrome color changes
// are kept — they're not motion).
import { useEffect, useRef } from 'react'

const PARALLAX_FACTOR = 0.12
const PARALLAX_CLAMP = 55

// Pure decision: which column's horizontal span covers the viewport center X?
// columns: [{ left, right, surface }], in wall/DOM order. Falls back to
// 'paper' when nothing covers the center (gaps, edges, an empty wall).
export function dominantSurface(columns, viewportCenterX) {
  for (const col of columns) {
    if (viewportCenterX >= col.left && viewportCenterX <= col.right) return col.surface
  }
  return 'paper'
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export default function useWallChrome({ wallRef, mobile = false }) {
  const rafRef = useRef(null)
  const lastChromeRef = useRef(null)

  useEffect(() => {
    const wall = wallRef.current
    if (!wall || mobile) return
    const stage = wall.closest('.ams-stage')
    const reduced = prefersReducedMotion()

    const tick = () => {
      rafRef.current = null
      const viewportCenterX = window.innerWidth / 2

      // READ phase — gather every rect before writing anything, so we never
      // interleave a layout read with a style write (layout thrash).
      const colNodes = wall.querySelectorAll('.ams-col[data-surface], .ams-menu[data-surface]')
      const columns = []
      colNodes.forEach(node => {
        const r = node.getBoundingClientRect()
        columns.push({ left: r.left, right: r.right, surface: node.dataset.surface })
      })

      let boxes = []
      if (!reduced) {
        const boxNodes = wall.querySelectorAll('.ams-fit')
        boxes = Array.from(boxNodes).map(node => {
          const r = node.getBoundingClientRect()
          return { node, centerX: r.left + r.width / 2 }
        })
      }

      // WRITE phase.
      const surface = dominantSurface(columns, viewportCenterX)
      if (stage && lastChromeRef.current !== surface) {
        stage.setAttribute('data-chrome', surface)
        lastChromeRef.current = surface
      }
      boxes.forEach(({ node, centerX }) => {
        const offset = (centerX - viewportCenterX) * PARALLAX_FACTOR
        const clamped = Math.max(-PARALLAX_CLAMP, Math.min(PARALLAX_CLAMP, offset))
        node.style.setProperty('--par', `${clamped}px`)
      })
    }

    const schedule = () => {
      if (rafRef.current != null) return
      rafRef.current = requestAnimationFrame(tick)
    }

    tick() // establish the initial surface/parallax without waiting for a scroll
    wall.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      wall.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [wallRef, mobile])
}
