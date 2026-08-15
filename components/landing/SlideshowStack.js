import { useEffect, useRef, useState } from 'react'

// A self-animating "film stack": a tilted deck of photos where the top card
// peels off (floats up + rotates + fades) every few seconds, revealing the
// next photo, then loops. Reads as a slideshow playing right in place — no
// frame, just the photos on the section background.
//
// Depth-driven: each card's transform/opacity comes from its distance from the
// front (0 = front). Advancing the front makes every card slide one step
// forward while the departing card is overridden with an "exit" transform. The
// departing card lands at the back slot (opacity 0), so the recycle is
// invisible and the loop is seamless.

// Fan positions by depth. Front is flat-ish; cards behind fan out and shrink.
// Depth 3+ is parked at opacity 0 (hidden behind the deck, ready to cycle in).
const DEPTHS = [
  { t: 'rotate(-2.5deg) scale(1)', o: 1, shadow: '0 18px 40px -18px rgba(26,18,10,0.45)' },
  { t: 'translate(4%, 6%) rotate(3.5deg) scale(0.965)', o: 1, shadow: '0 16px 34px -20px rgba(26,18,10,0.4)' },
  { t: 'translate(-4%, 11%) rotate(-4.5deg) scale(0.93)', o: 1, shadow: '0 14px 30px -20px rgba(26,18,10,0.35)' },
  { t: 'translate(3%, 15%) rotate(5deg) scale(0.9)', o: 0, shadow: 'none' },
]
const EXIT = 'translate(22%, -82%) rotate(9deg) scale(0.98)'
const ADVANCE_MS = 2800
const PEEL_MS = 700

export default function SlideshowStack({ images = [], interval = ADVANCE_MS }) {
  const [front, setFront] = useState(0)
  const [leaving, setLeaving] = useState(null)
  const frontRef = useRef(0)
  const containerRef = useRef(null)

  const n = images.length

  useEffect(() => {
    if (n < 2) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    let timer = null
    let peelTimer = null

    const advance = () => {
      const cur = frontRef.current
      setLeaving(cur)
      const next = (cur + 1) % n
      frontRef.current = next
      setFront(next)
      peelTimer = setTimeout(() => setLeaving(null), PEEL_MS)
    }

    const start = () => {
      if (timer) return
      timer = setInterval(advance, interval)
    }
    const stop = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }

    // Only animate while the deck is on screen.
    let observer = null
    const el = containerRef.current
    if (el && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { threshold: 0.2 }
      )
      observer.observe(el)
    } else {
      start()
    }

    return () => {
      stop()
      if (peelTimer) clearTimeout(peelTimer)
      if (observer) observer.disconnect()
    }
  }, [n, interval])

  if (n === 0) return null

  return (
    <div
      ref={containerRef}
      aria-label="Slideshow preview"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 3',
        // Overflow visible so the peeling card can float up out of the frame.
        overflow: 'visible',
      }}
    >
      {images.map((src, i) => {
        const depth = (i - front + n) % n
        const isLeaving = i === leaving
        const d = DEPTHS[Math.min(depth, DEPTHS.length - 1)]
        const transform = isLeaving
          ? `translate(-50%, -50%) ${EXIT}`
          : `translate(-50%, -50%) ${d.t}`
        const opacity = isLeaving ? 0 : d.o
        const zIndex = isLeaving ? n + 5 : n - depth
        return (
          <img
            key={i}
            src={src}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              // Size to fit the deck while preserving each photo's own
              // orientation — landscape fills the width, portrait the height.
              maxWidth: '94%',
              maxHeight: '92%',
              width: 'auto',
              height: 'auto',
              borderRadius: 10,
              border: '5px solid #fbf7ee',
              boxShadow: isLeaving ? 'none' : d.shadow,
              transform,
              opacity,
              zIndex,
              transition:
                'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s ease, box-shadow 0.7s ease',
              willChange: 'transform, opacity',
            }}
          />
        )
      })}
    </div>
  )
}
