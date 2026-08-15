// components/image-displays/themes/shared/useWallScroll.js
// The horizontal-wall interaction physics shared by the Florence museum wall and
// the Amsterdam poster wall. Extracted verbatim from FlorenceWall: a vertical
// wheel (mouse / vertical trackpad swipe) pans horizontally at 3.2x; a native
// horizontal gesture is left alone (stays fast + smooth); press-drag pans with a
// 3px guard so clicks still land; arrows center the neighboring column. All
// handlers no-op on mobile, where the wall collapses to a vertical stack.
import { useRef, useCallback, useEffect } from 'react'

export default function useWallScroll({ wallRef, mobile = false, columnSelector }) {
  const onWheel = useCallback((e) => {
    const wall = wallRef.current
    if (!wall || mobile) return
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return // native horizontal — don't touch
    const dy = e.deltaY
    if (!dy) return
    // deltaMode: 1 = lines, 2 = pages → normalize to px, then scale up for a brisk pan.
    const px = e.deltaMode === 1 ? dy * 16 : e.deltaMode === 2 ? dy * wall.clientWidth : dy
    e.preventDefault()
    wall.scrollLeft += px * 3.2
  }, [mobile, wallRef])

  useEffect(() => {
    const wall = wallRef.current
    if (!wall || mobile) return
    wall.addEventListener('wheel', onWheel, { passive: false })
    return () => wall.removeEventListener('wheel', onWheel)
  }, [onWheel, mobile, wallRef])

  // Arrows step to the next/prev column and center it in the viewport (so a click
  // always lands on a block, never between two).
  const page = useCallback((dir) => {
    const wall = wallRef.current
    if (!wall) return
    const cols = Array.from(wall.querySelectorAll(columnSelector))
    if (!cols.length) return
    const wallLeft = wall.getBoundingClientRect().left
    const viewCenter = wall.clientWidth / 2
    let idx = 0, best = Infinity
    cols.forEach((c, i) => {
      const r = c.getBoundingClientRect()
      const centerInView = (r.left - wallLeft) + r.width / 2
      const d = Math.abs(centerInView - viewCenter)
      if (d < best) { best = d; idx = i }
    })
    const nextIdx = Math.max(0, Math.min(cols.length - 1, idx + (dir === 'prev' ? -1 : 1)))
    const r = cols[nextIdx].getBoundingClientRect()
    const centerInContent = (r.left - wallLeft + wall.scrollLeft) + r.width / 2
    wall.scrollTo({ left: centerInContent - viewCenter, behavior: 'smooth' })
  }, [columnSelector, wallRef])

  // Drag-to-pan (desktop): press and drag anywhere on the wall.
  const drag = useRef({ active: false, x: 0, left: 0, moved: false })
  const onPointerDown = (e) => {
    if (mobile || e.target.closest('a,button')) return
    drag.current = { active: true, x: e.clientX, left: wallRef.current.scrollLeft, moved: false }
  }
  const onPointerMove = (e) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 3) drag.current.moved = true
    wallRef.current.scrollLeft = drag.current.left - dx
  }
  const endDrag = () => { drag.current.active = false }

  return { onPointerDown, onPointerMove, endDrag, page }
}
