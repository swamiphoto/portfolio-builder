// components/admin/onboarding/GuidedTour.js
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
const SERIF = "'Schibsted Grotesk', system-ui, sans-serif"
const DIM = 'rgba(20,12,4,0.55)'
const CARD_W = 304

function firstResolvableIndex(steps, from) {
  for (let i = from; i < steps.length; i++) {
    const step = steps[i]
    // A step without a selector is a centered "chapter" card — always resolvable.
    if (!step.selector) return i
    if (typeof document !== 'undefined' && document.querySelector(step.selector)) return i
  }
  return -1
}

export default function GuidedTour({ steps = [], welcome, onFinish }) {
  const [phase, setPhase] = useState(welcome ? 'welcome' : 'steps')
  const [index, setIndex] = useState(() => (welcome ? 0 : firstResolvableIndex(steps, 0)))
  const [rect, setRect] = useState(null)
  const [tick, setTick] = useState(0)
  const cardRef = useRef(null)
  const [cardH, setCardH] = useState(0)

  // Measure the actual card height so we can keep it fully on-screen (cards vary
  // in height with copy length; a fixed estimate clips the taller ones).
  useLayoutEffect(() => {
    if (phase === 'steps' && cardRef.current) setCardH(cardRef.current.offsetHeight)
  }, [phase, index, rect, tick])

  // If a step's anchor isn't in the DOM yet (e.g. the block sidebar is still
  // mounting), poll briefly before giving up — otherwise we'd finish the tour
  // and mark it "seen" for good even though it never actually displayed.
  useEffect(() => {
    if (welcome) return
    if (firstResolvableIndex(steps, 0) !== -1) return
    let tries = 0
    const iv = setInterval(() => {
      const idx = firstResolvableIndex(steps, 0)
      if (idx !== -1) { clearInterval(iv); setIndex(idx) }
      else if (++tries >= 25) { clearInterval(iv); onFinish?.('done') } // ~2.5s
    }, 100)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const advance = useCallback(() => {
    const nextIdx = firstResolvableIndex(steps, index + 1)
    if (nextIdx === -1) { onFinish?.('done'); return }
    setIndex(nextIdx)
  }, [steps, index, onFinish])

  const start = useCallback(() => {
    const firstIdx = firstResolvableIndex(steps, 0)
    if (firstIdx === -1) { onFinish?.('done'); return }
    setIndex(firstIdx)
    setPhase('steps')
  }, [steps, onFinish])

  // Track the current anchor's rect; reposition on scroll/resize. Also tag the
  // anchor with data-tour-highlight so CSS can force it visible — some targets
  // (e.g. the per-block design brush) live in a toolbar that's only shown on
  // hover, which would otherwise leave the spotlight an empty square.
  useEffect(() => {
    if (phase !== 'steps') return
    const step = steps[index]
    if (!step) return
    let tagged = null
    function measure() {
      const el = step.selector ? document.querySelector(step.selector) : null
      if (el !== tagged) {
        tagged?.removeAttribute('data-tour-highlight')
        tagged = el
        tagged?.setAttribute('data-tour-highlight', '')
      }
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    const onScroll = () => setTick(t => t + 1)
    window.addEventListener('resize', onScroll)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('scroll', onScroll, true)
      tagged?.removeAttribute('data-tour-highlight')
    }
  }, [phase, index, steps, tick])

  if (typeof document === 'undefined') return null
  if (phase === 'welcome' && welcome) {
    return createPortal(
      <div style={overlayStyle}>
        <div style={{ ...cardBase, width: 340, position: 'relative', margin: 'auto' }}>
          <div style={{ ...tourTitle, fontSize: 23, marginBottom: 10 }}>{welcome.title}</div>
          <div style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>{welcome.body}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={start} style={primaryBtn}>{welcome.confirm}</button>
            <button onClick={() => onFinish?.('skip')} style={ghostBtn}>{welcome.dismiss}</button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  if (phase !== 'steps') return null
  const step = steps[index]
  if (!step) return null

  const isLast = firstResolvableIndex(steps, index + 1) === -1
  const pad = 6
  const hi = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null
  const card = cardPosition(rect, step.placement, cardH)

  return createPortal(
    <>
      {/* click-blocker beneath the spotlight. When there's no anchor (a centered
          chapter card), dim the whole screen so it reads like a moment. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: rect ? 'transparent' : DIM }} />
      {/* spotlight: box-shadow dims everything outside the highlighted rect */}
      {hi && (
        <div
          aria-hidden
          style={{
            position: 'fixed', zIndex: 9999, pointerEvents: 'none',
            top: hi.top, left: hi.left, width: hi.width, height: hi.height,
            borderRadius: 8, boxShadow: `0 0 0 9999px ${DIM}, 0 0 0 1.5px rgba(246,243,236,0.9)`,
            transition: 'all 160ms ease',
          }}
        />
      )}
      {/* copy card */}
      <div style={{ position: 'fixed', zIndex: 10000, ...card }}>
        <div ref={cardRef} style={{ ...cardBase, width: CARD_W }}>
          <div style={{ ...tourTitle, marginBottom: 8 }}>
            {step.title}
          </div>
          <div style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>{step.body}</div>
          {/* Primary action first, quiet escape to its right — same order as the
              modal buttons elsewhere (the heavier control leads). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={advance} style={primaryBtn}>{isLast ? 'Got it' : 'Next'}</button>
            {!isLast && steps.length > 1 && (
              <button onClick={() => onFinish?.('skip')} style={skipBtn}>Skip tour</button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', background: DIM, padding: 24 }
const cardBase = {
  background: 'var(--popover)', boxShadow: 'var(--popover-shadow)', borderRadius: 14, padding: '22px 22px 16px',
}
const tourTitle = {
  fontFamily: SERIF, fontSize: 21, fontWeight: 500, color: 'var(--text-primary)',
  letterSpacing: '-0.01em', lineHeight: 1.2,
}
const primaryBtn = {
  background: '#2c2416', color: '#f6f3ec', border: 'none', borderRadius: 5, cursor: 'pointer',
  fontFamily: MONO, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500, padding: '8px 12px',
}
const ghostBtn = {
  background: 'transparent', color: 'var(--text-secondary)', border: '1px solid rgba(160,140,110,0.35)', borderRadius: 5,
  cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500, padding: '8px 12px',
}
const skipBtn = {
  background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
  fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
}

function cardPosition(rect, placement = 'below', cardH = 0) {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  const gap = 14
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const clampLeft = (l) => Math.max(12, Math.min(l, vw - CARD_W - 12))
  // Keep the card on-screen vertically (matters for bottom-of-sidebar anchors
  // like Library/Settings, whose top would otherwise push the card off-screen).
  // Uses the measured card height so tall cards don't clip at the bottom edge.
  const h = cardH || 200
  const clampTop = (t) => Math.max(12, Math.min(t, vh - h - 12))
  switch (placement) {
    case 'above': return { left: clampLeft(rect.left), top: Math.max(12, rect.top - gap - h) }
    case 'left':  return { left: Math.max(12, rect.left - CARD_W - gap), top: clampTop(rect.top) }
    case 'right': return { left: clampLeft(rect.right + gap), top: clampTop(rect.top) }
    case 'below':
    default:      return { left: clampLeft(rect.left), top: clampTop(rect.bottom + gap) }
  }
}
