// components/admin/onboarding/GuidedTour.js
import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
const SERIF = "'Fraunces', Georgia, serif"
const DIM = 'rgba(20,12,4,0.55)'
const CARD_W = 260

function firstResolvableIndex(steps, from) {
  for (let i = from; i < steps.length; i++) {
    if (typeof document !== 'undefined' && document.querySelector(steps[i].selector)) return i
  }
  return -1
}

export default function GuidedTour({ steps = [], welcome, onFinish }) {
  const [phase, setPhase] = useState(welcome ? 'welcome' : 'steps')
  const [index, setIndex] = useState(() => (welcome ? 0 : firstResolvableIndex(steps, 0)))
  const [rect, setRect] = useState(null)
  const [tick, setTick] = useState(0)

  // If there are no resolvable steps at all and no welcome, finish immediately.
  useEffect(() => {
    if (!welcome && firstResolvableIndex(steps, 0) === -1) onFinish?.('done')
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

  // Track the current anchor's rect; reposition on scroll/resize.
  useEffect(() => {
    if (phase !== 'steps') return
    const step = steps[index]
    if (!step) return
    function measure() {
      const el = document.querySelector(step.selector)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    const onScroll = () => setTick(t => t + 1)
    window.addEventListener('resize', onScroll)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [phase, index, steps, tick])

  if (typeof document === 'undefined') return null
  if (phase === 'welcome' && welcome) {
    return createPortal(
      <div style={overlayStyle}>
        <div style={{ ...cardBase, width: 300, position: 'relative', margin: 'auto' }}>
          <div style={{ fontFamily: SERIF, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>{welcome.title}</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 18 }}>{welcome.body}</div>
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
  const card = cardPosition(rect, step.placement)

  return createPortal(
    <>
      {/* click-blocker beneath the spotlight */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }} />
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
        <div style={{ ...cardBase, width: CARD_W }}>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
            {step.title}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>{step.body}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {!isLast && steps.length > 1
              ? <button onClick={() => onFinish?.('skip')} style={skipBtn}>Skip tour</button>
              : <span />}
            <button onClick={advance} style={primaryBtn}>{isLast ? 'Got it' : 'Next'}</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', background: DIM, padding: 24 }
const cardBase = {
  background: 'var(--popover)', boxShadow: 'var(--popover-shadow)', borderRadius: 12, padding: '16px 16px 14px',
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

function cardPosition(rect, placement = 'below') {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  const gap = 14
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const clampLeft = (l) => Math.max(12, Math.min(l, vw - CARD_W - 12))
  switch (placement) {
    case 'above': return { left: clampLeft(rect.left), top: Math.max(12, rect.top - gap - 120) }
    case 'left':  return { left: Math.max(12, rect.left - CARD_W - gap), top: rect.top }
    case 'right': return { left: clampLeft(rect.right + gap), top: rect.top }
    case 'below':
    default:      return { left: clampLeft(rect.left), top: rect.bottom + gap }
  }
}
