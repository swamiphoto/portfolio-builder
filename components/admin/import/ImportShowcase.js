import { useEffect, useMemo, useRef, useState } from 'react'
import { MONO } from './importFlowStyles'
import { showcaseThumbUrl, onCoverError } from './coverThumb'

// The wait, as a show — not a process. While photos import in the background, we
// take over the screen with a calm exhibition: the photographer's own images drift
// in one at a time around the edges, as loose prints and thin-bordered photos.
// Placement is planned, not scattered: the screen is carved into photo zones that
// exclude a reserved center box (the message), the top bar (logo + skip link), and
// the bottom strip (progress note). Every print must fit fully inside its zone, so
// nothing ever rides off the top of the screen, crowds the copy, or slides behind
// a control. With `ambient` the message and progress are hidden and only the show
// remains — the backdrop for the "you're all set" card.

const PITCHES = [
  { title: 'Immersive galleries set to music.', body: 'The kind of slideshow a client actually sits through to the end.' },
  { title: 'Fast to build.', body: 'Add and rearrange blocks of photos, video, and text to create your gallery.' },
  { title: 'One click, a new look.', body: 'Change themes as many times as you want, without ever rebuilding.' },
  { title: 'Sell prints from any photo.', body: 'Toggle it on, and prints ship worldwide with nothing for you to run.' },
  { title: 'Deliver the whole shoot.', body: 'Send the gallery, let clients pick their favorites, and upsell print packages.' },
  { title: 'Yours, top to bottom.', body: 'Your name on the door, and no badges but your own.' },
]

const WIDTHS = [150, 190, 230, 280, 330]       // some small, some big; scaled on wide screens
const ASPECTS = [0.72, 0.82, 1, 1.2, 1.3]      // landscape → square → portrait
const FORMATS = ['bare', 'print', 'bare', 'print', 'bare']  // real prints only, no costumes

const SPAWN_MS = 2200
const LIFETIME_MS = 11000
const PITCH_MS = 6800

const PAD = 18          // breathing room inside a zone; also absorbs the tilt + frame
const TOP_BAR = 78      // clear of the logo and the skip link
const BOTTOM_RESERVE = 200  // clear of the progress note + scrim

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

function frameStyle(format) {
  if (format === 'print') return { padding: 6, background: '#fffdf8', borderRadius: 2 }
  return { padding: 0, background: 'transparent', borderRadius: 3 } // bare
}

// Carve the viewport into zones that surround — never touch — the center message
// box, the top bar, and the bottom progress strip. Zones smaller than a usable
// print are dropped (on phones that leaves just the top band, which is fine).
function computeZones(vw, vh) {
  const M = 16
  const bottom = vh - BOTTOM_RESERVE
  const cw = Math.min(560, vw * 0.52)
  const ch = 260
  const cx1 = (vw - cw) / 2
  const cx2 = (vw + cw) / 2
  const cy1 = vh * 0.46 - ch / 2
  const cy2 = vh * 0.46 + ch / 2

  const zones = []
  const add = (x1, y1, x2, y2) => {
    const w = x2 - x1
    const h = y2 - y1
    if (w >= 100 && h >= 100) zones.push({ x: x1, y: y1, w, h })
  }
  // Full-height columns either side of the message (they only need to clear it
  // horizontally), split in two when tall enough so each holds its own print.
  const addColumn = (x1, x2) => {
    const h = bottom - TOP_BAR
    if (h >= 320) {
      const mid = TOP_BAR + h / 2
      add(x1, TOP_BAR, x2, mid - 8)
      add(x1, mid + 8, x2, bottom)
    } else {
      add(x1, TOP_BAR, x2, bottom)
    }
  }
  addColumn(M, cx1 - 12)
  addColumn(cx2 + 12, vw - M)
  // the strips directly above and below the message
  add(cx1, TOP_BAR, cx2, cy1 - 12)
  add(cx1, cy2 + 12, cx2, bottom)
  return zones
}

// Shrink a print until it fits inside the zone (minus padding). Returns null if
// the zone can't hold a print worth showing.
function fitCard(zone, baseW, aspect) {
  let w = Math.min(baseW, zone.w - PAD * 2)
  let h = w * aspect
  const maxH = zone.h - PAD * 2
  if (h > maxH) {
    h = maxH
    w = h / aspect
  }
  if (w < 70) return null
  return { w: Math.round(w), h: Math.round(h) }
}

export default function ImportShowcase({ progress, photos = [], sourceLabel, onCancel, ambient = false }) {
  const { done = 0, total = 0 } = progress || {}
  const complete = total > 0 && done >= total

  const pool = useMemo(() => photos.filter(Boolean), [photos])
  const [cards, setCards] = useState([])
  const [pitch, setPitch] = useState(0)
  const nextId = useRef(0)
  const scaleRef = useRef(1)
  const viewRef = useRef({ vw: 1280, vh: 900 })

  // Prints grow on wider screens and shrink on small ones. On resize the zone
  // map changes, so in-flight cards are cleared rather than left to drift over
  // areas the new layout reserves.
  useEffect(() => {
    const onResize = () => {
      scaleRef.current = Math.min(1.4, Math.max(0.8, window.innerWidth / 1200))
      viewRef.current = { vw: window.innerWidth, vh: window.innerHeight }
      setCards([])
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Animated counter. The backend reports progress in batches (a handful of
  // photos land at once), which makes the raw "done" number jump and then sit
  // still — it reads as stuck. So we tick a shown value up toward the real one,
  // one at a time, giving a continuous sense of motion. It never runs ahead of
  // the truth, and snaps to total the moment the import completes. We seed it
  // with the initial "done" so a mid-import mount shows the real number at once,
  // then only the forward deltas animate.
  const [shownDone, setShownDone] = useState(() => done)
  useEffect(() => {
    if (complete) { setShownDone(total); return }
    const iv = setInterval(() => {
      setShownDone((prev) => (prev < done ? prev + 1 : prev))
    }, 110)
    return () => clearInterval(iv)
  }, [done, total, complete])
  const shownPct = total > 0 ? Math.min(1, shownDone / total) : 0

  useEffect(() => {
    if (!pool.length) return
    let live = true
    const spawn = () => {
      const id = nextId.current++
      setCards((prev) => {
        const { vw, vh } = viewRef.current
        const zones = computeZones(vw, vh)
        if (!zones.length) return prev
        // One print per zone, no exceptions — if the wall is full, wait for a
        // spot to free up rather than stacking prints on each other.
        const used = new Set(prev.map((c) => c.zoneIdx))
        const free = zones.map((_, i) => i).filter((i) => !used.has(i))
        if (!free.length) return prev
        const zoneIdx = free[Math.floor(Math.random() * free.length)]
        const zone = zones[zoneIdx]
        const aspect = pick(ASPECTS)
        const fitted = fitCard(zone, Math.round(pick(WIDTHS) * scaleRef.current), aspect)
        if (!fitted) return prev
        // Jitter within the zone — planned placement, unplanned-looking scatter.
        const left = zone.x + PAD + Math.random() * Math.max(0, zone.w - PAD * 2 - fitted.w)
        const top = zone.y + PAD + Math.random() * Math.max(0, zone.h - PAD * 2 - fitted.h)
        return [...prev, { id, zoneIdx, url: pool[id % pool.length], ...fitted, left: Math.round(left), top: Math.round(top), format: pick(FORMATS), rot: (Math.random() - 0.5) * 7 }]
      })
      setTimeout(() => { if (live) setCards((cur) => cur.filter((c) => c.id !== id)) }, LIFETIME_MS)
    }
    const first = setTimeout(spawn, 500)
    const iv = setInterval(spawn, SPAWN_MS)
    return () => { live = false; clearTimeout(first); clearInterval(iv) }
  }, [pool])

  useEffect(() => {
    if (ambient) return
    const t = setInterval(() => setPitch((p) => (p + 1) % PITCHES.length), PITCH_MS)
    return () => clearInterval(t)
  }, [ambient])

  const active = PITCHES[pitch]

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'radial-gradient(125% 100% at 50% 38%, #efe8dc 0%, #e5ddd0 55%, #dad0bd 100%)', overflow: 'hidden' }}>
      {/* top bar */}
      <div className="flex items-center justify-between" style={{ position: 'relative', zIndex: 4, padding: '22px 28px' }}>
        <span style={{ fontFamily: "'Italianno', cursive", fontSize: 30, lineHeight: 1, color: '#2c2416' }}>Sepia</span>
        {!ambient && onCancel && (
          <button
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b3a184', padding: '4px 6px' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#2c2416')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#b3a184')}
          >
            Skip to my studio
          </button>
        )}
      </div>

      {/* prints, drifting through their zones */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        {cards.map((c) => {
          const fs = frameStyle(c.format)
          return (
            <div
              key={c.id}
              className="showcase-photo"
              style={{ position: 'absolute', left: c.left, top: c.top, transform: `rotate(${c.rot}deg)` }}
            >
              <div className="showcase-photo__anim">
                <div style={{ ...fs, boxShadow: '0 16px 34px rgba(60,40,15,0.17), 0 3px 8px rgba(60,40,15,0.11)' }}>
                  <div style={{ width: c.w, height: c.h, overflow: 'hidden', background: '#ddd3c2', borderRadius: c.format === 'bare' ? 3 : 0 }}>
                    <img src={showcaseThumbUrl(c.url, 480)} alt="" loading="lazy" decoding="async" draggable={false} onError={onCoverError(c.url)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'saturate(0.96) sepia(0.05)' }} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!ambient && (
        <>
          {/* soft light behind the center message */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'radial-gradient(36% 26% at 50% 46%, rgba(239,232,220,0.74) 0%, rgba(239,232,220,0) 70%)' }} />

          {/* the message, centered and quiet */}
          <div style={{ position: 'absolute', top: '46%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 3, width: 'min(460px, 82vw)', textAlign: 'center', pointerEvents: 'none' }}>
            <div key={pitch} style={{ animation: 'pitchRise 1.4s ease both' }}>
              <h2 className="font-fraunces" style={{ fontSize: 27, fontStyle: 'italic', fontWeight: 300, color: '#2c2416', marginBottom: 12, lineHeight: 1.15 }}>
                {active.title}
              </h2>
              <p style={{ fontSize: 16, color: '#7a6b55', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                {active.body}
              </p>
            </div>
          </div>

          {/* bottom scrim so the note stays legible over any print */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 190, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(226,217,203,0.92) 0%, rgba(226,217,203,0) 100%)' }} />

          {/* importing note + progress */}
          <div style={{ position: 'absolute', left: '50%', bottom: 36, transform: 'translateX(-50%)', zIndex: 4, width: 'min(440px, 88vw)', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#43371f', marginBottom: 12, letterSpacing: '0.01em' }}>
              {complete
                ? 'All in. Setting up your studio.'
                : `Importing your photos${sourceLabel ? ` from ${sourceLabel}` : ''}…`}
            </p>
            <div style={{ height: 3, borderRadius: 3, background: 'rgba(139,111,71,0.16)', overflow: 'hidden' }}>
              <div data-testid="showcase-progress" style={{ height: '100%', width: `${shownPct * 100}%`, background: '#8b6f47', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
            {total > 0 && (
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', color: '#a8967a', marginTop: 10 }}>
                {shownDone} / {total}
              </p>
            )}
            {!complete && (
              <p style={{ fontSize: 12.5, color: '#8a7a62', lineHeight: 1.55, marginTop: 14, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
                Please keep this tab open. Depending on how many photos you have, this can take a few minutes. Grab a coffee, and everything will be ready when you're back.
              </p>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes pitchRise {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes photoShow {
          0%   { opacity: 0; transform: translateY(16px) scale(1.015); }
          16%  { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 1; transform: translateY(-7px) scale(1.02); }
          100% { opacity: 0; transform: translateY(-12px) scale(1.03); }
        }
        .showcase-photo__anim { animation: photoShow ${LIFETIME_MS}ms ease-in-out both; }
      `}</style>
    </div>
  )
}
